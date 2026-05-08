package api

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/levels"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"
	"plants-community-server/internal/richtext"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// MarketHandler 处理商品 (/market/*) 和分类
type MarketHandler struct {
	DB *gorm.DB
}

func (h *MarketHandler) Register(g *gin.RouterGroup) {
	g.GET("/market/products", h.list)
	g.POST("/market/products", middleware.RequireUser(), h.create)
	g.GET("/market/products/:id", h.detail)
	g.POST("/market/products/:id/buy", middleware.RequireUser(), h.buy)
	g.GET("/market/categories", h.categories)
}

// ============ 列表 ============
func (h *MarketHandler) list(c *gin.Context) {
	source := c.Query("source")   // official | c2c
	category := c.Query("category")
	q := c.Query("q")
	sort := c.DefaultQuery("sort", "latest")

	tx := h.DB.Model(&models.Product{}).
		Where("status IN ?", []string{"on_sale", "sold_out"})
	if source != "" {
		tx = tx.Where("source = ?", source)
	}
	if category != "" {
		tx = tx.Where("category = ?", category)
	}
	if q != "" {
		tx = tx.Where("title LIKE ?", "%"+q+"%")
	}
	switch sort {
	case "price_asc":
		tx = tx.Order("price ASC")
	case "price_desc":
		tx = tx.Order("price DESC")
	case "hot":
		tx = tx.Order("createdAt DESC") // 简化:hot 按时间倒序(原版算 orders count)
	default:
		tx = tx.Order("createdAt DESC")
	}

	var rows []models.Product
	tx.Preload("Seller").Limit(24).Find(&rows)

	items := make([]gin.H, 0, len(rows))
	for i := range rows {
		items = append(items, h.serializeProduct(&rows[i]))
	}
	httpx.OK(c, gin.H{"items": items, "nextCursor": nil})
}

// ============ 详情 ============
func (h *MarketHandler) detail(c *gin.Context) {
	id := c.Param("id")
	var p models.Product
	if err := h.DB.Preload("Seller").Where("id = ?", id).First(&p).Error; err != nil {
		httpx.NotFound(c, "商品不存在")
		return
	}
	httpx.OK(c, h.serializeProduct(&p))
}

// ============ 分类聚合 ============
func (h *MarketHandler) categories(c *gin.Context) {
	type row struct {
		Name  string
		Count int
	}
	var rows []row
	h.DB.Raw(
		"SELECT category as name, COUNT(*) as count FROM products WHERE status = ? GROUP BY category ORDER BY count DESC",
		"on_sale",
	).Scan(&rows)
	out := make([]gin.H, 0, len(rows))
	for _, r := range rows {
		out = append(out, gin.H{"name": r.Name, "count": r.Count})
	}
	httpx.OK(c, out)
}

// ============ C2C 发布 ============
type createProductBody struct {
	Title           string   `json:"title" binding:"required,min=2,max=80"`
	Description     string   `json:"description"`
	DescriptionJSON any      `json:"descriptionJson"`
	Category        string   `json:"category" binding:"required"`
	Price           int      `json:"price" binding:"required,min=1"`
	OriginalPrice   int      `json:"originalPrice"`
	Cover           string   `json:"cover" binding:"required"`
	Images          []string `json:"images"`
	Tags            []string `json:"tags"`
	ShipFrom        string   `json:"shipFrom"`
	PointsBack      int      `json:"pointsBack"`
}

func (h *MarketHandler) create(c *gin.Context) {
	me := middleware.MustUser(c)
	isVip := levels.IsVipActive(me.VipLifetime,
		userVipExpireUnix(me), time.Now().Unix())
	if !levels.Has(me.Level, isVip, levels.PermMarketSell) {
		httpx.Forbidden(c, "当前等级不允许在交易区出售,开通大会员或升级到 Lv.8 即可解锁")
		return
	}

	var body createProductBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	stored := richtext.Process(richtext.Input{
		JSON: body.DescriptionJSON, HTML: body.Description, TextMaxLen: 1000,
	})
	if stored.Text == "" {
		httpx.BadRequest(c, "商品描述不能为空")
		return
	}

	imgs := body.Images
	if len(imgs) == 0 {
		imgs = []string{body.Cover}
	}
	tags := body.Tags
	if tags == nil {
		tags = []string{}
	}
	pointsBack := body.PointsBack
	if pointsBack == 0 {
		pointsBack = body.Price / 200 // ~ 5% 粗略,和 TS 版一致(除以 200 = * 0.05 / 10)
	}

	p := models.Product{
		ID: genCuid(), Source: "c2c",
		Title: body.Title, Cover: body.Cover,
		Images:          jsonArr(imgs),
		Description:     stored.HTML,
		DescriptionJson: nullable(stored.JSON),
		DescriptionText: nullable(stored.Text),
		Category:        body.Category,
		Price:           body.Price,
		Stock:           1, // C2C 固定 1 件
		PointsBack:      pointsBack,
		Status:          "on_sale",
		SellerID:        &me.ID,
		Tags:            strPtr(jsonArr(tags)),
		CreatedAt:       time.Now(), UpdatedAt: time.Now(),
	}
	if body.OriginalPrice > 0 {
		p.OriginalPrice = &body.OriginalPrice
	}
	if body.ShipFrom != "" {
		p.ShipFrom = &body.ShipFrom
	}
	if err := h.DB.Create(&p).Error; err != nil {
		httpx.Internal(c, err)
		return
	}
	p.Seller = me
	httpx.OK(c, h.serializeProduct(&p))
}

// ============ 下单 ============
type buyBody struct {
	Quantity      int    `json:"quantity"`
	AddressID     string `json:"addressId"`
	ShipName      string `json:"shipName"`
	ShipPhone     string `json:"shipPhone"`
	ShipAddress   string `json:"shipAddress"`
	SaveAddress   bool   `json:"saveAddress"`
	SaveAsDefault bool   `json:"saveAsDefault"`
}

func (h *MarketHandler) buy(c *gin.Context) {
	me := middleware.MustUser(c)
	isVip := levels.IsVipActive(me.VipLifetime, userVipExpireUnix(me), time.Now().Unix())
	if !levels.Has(me.Level, isVip, levels.PermMarketBuy) {
		httpx.Forbidden(c, "需要 Lv.5 以上才能购买,或开通大会员")
		return
	}

	productID := c.Param("id")
	var body buyBody
	_ = c.ShouldBindJSON(&body)
	if body.Quantity <= 0 {
		body.Quantity = 1
	}

	var product models.Product
	if err := h.DB.Where("id = ?", productID).First(&product).Error; err != nil {
		httpx.NotFound(c, "商品不存在")
		return
	}
	if product.Status != "on_sale" {
		httpx.BadRequest(c, "商品当前不可购买")
		return
	}
	if product.Stock < body.Quantity {
		httpx.BadRequest(c, "库存不足")
		return
	}
	if product.SellerID != nil && *product.SellerID == me.ID {
		httpx.BadRequest(c, "不能购买自己的商品")
		return
	}

	// 解析收货地址
	var shipName, shipPhone, shipAddress string
	if body.AddressID != "" {
		var addr models.Address
		if err := h.DB.Where("id = ?", body.AddressID).First(&addr).Error; err != nil {
			httpx.NotFound(c, "收件地址不存在")
			return
		}
		if addr.UserID != me.ID {
			httpx.Forbidden(c, "收件地址无权使用")
			return
		}
		shipName, shipPhone, shipAddress = addr.Name, addr.Phone, composeAddr(&addr)
	} else {
		if body.ShipName == "" || body.ShipPhone == "" || body.ShipAddress == "" {
			httpx.BadRequest(c, "请提供收件人姓名、电话和地址")
			return
		}
		shipName, shipPhone, shipAddress = body.ShipName, body.ShipPhone, body.ShipAddress

		if body.SaveAddress {
			var count int64
			h.DB.Model(&models.Address{}).Where("userId = ?", me.ID).Count(&count)
			isDefault := body.SaveAsDefault || count == 0
			h.DB.Transaction(func(tx *gorm.DB) error {
				if isDefault {
					tx.Model(&models.Address{}).
						Where("userId = ? AND isDefault = ?", me.ID, true).
						Update("isDefault", false)
				}
				tx.Create(&models.Address{
					ID: genCuid(), UserID: me.ID,
					Name: shipName, Phone: shipPhone, Detail: shipAddress,
					IsDefault: isDefault,
					CreatedAt: time.Now(), UpdatedAt: time.Now(),
				})
				return nil
			})
		}
	}

	totalPrice := product.Price * body.Quantity
	pointsBack := product.PointsBack * body.Quantity
	order := models.Order{
		ID: genCuid(), OrderNo: genOrderNo("RY"),
		Source: "product", ProductID: &product.ID,
		BuyerID: me.ID, SellerID: product.SellerID,
		Quantity: body.Quantity, UnitPrice: product.Price,
		TotalPrice: totalPrice, PointsBackTotal: pointsBack,
		Status:    "pending_payment",
		ShipName:  &shipName, ShipPhone: &shipPhone, ShipAddress: &shipAddress,
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	if err := h.DB.Create(&order).Error; err != nil {
		httpx.Internal(c, err)
		return
	}
	httpx.OK(c, gin.H{
		"orderId": order.ID, "orderNo": order.OrderNo, "totalPrice": totalPrice,
	})
}

// ============ 序列化 ============
func (h *MarketHandler) serializeProduct(p *models.Product) gin.H {
	var images []string
	_ = json.Unmarshal([]byte(p.Images), &images)
	var tags []string
	if p.Tags != nil {
		_ = json.Unmarshal([]byte(*p.Tags), &tags)
	}
	var seller any
	if p.Seller != nil {
		counts := httpx.LoadUserCounts(h.DB, p.Seller.ID)
		badges := httpx.LoadUserBadges(h.DB, p.Seller.ID)
		seller = httpx.SerializeUser(p.Seller, counts, badges)
	}
	return gin.H{
		"id": p.ID, "source": p.Source, "title": p.Title,
		"cover": p.Cover, "images": images, "tags": tags,
		"description": p.Description, "descriptionJson": p.DescriptionJson,
		"category":      p.Category,
		"price":         p.Price,
		"originalPrice": p.OriginalPrice,
		"stock":         p.Stock,
		"pointsBack":    p.PointsBack,
		"status":        p.Status,
		"shipFrom":      p.ShipFrom,
		"seller":        seller,
		"createdAt":     p.CreatedAt.UTC().Format(time.RFC3339),
	}
}

// ============ Helpers(共用) ============

func userVipExpireUnix(u *models.User) int64 {
	if u.VipExpireAt == nil {
		return 0
	}
	return u.VipExpireAt.Unix()
}

func nullable(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
func strPtr(s string) *string { return &s }

func jsonArr(a []string) string {
	if len(a) == 0 {
		return "[]"
	}
	b, _ := json.Marshal(a)
	return string(b)
}

func composeAddr(a *models.Address) string {
	parts := []string{}
	if a.Province != nil && *a.Province != "" {
		parts = append(parts, *a.Province)
	}
	if a.City != nil && *a.City != "" {
		parts = append(parts, *a.City)
	}
	if a.District != nil && *a.District != "" {
		parts = append(parts, *a.District)
	}
	if a.Detail != "" {
		parts = append(parts, a.Detail)
	}
	return strings.Join(parts, " ")
}

// 订单号生成,对齐 src/lib/auction.ts genOrderNo
func genOrderNo(prefix string) string {
	now := time.Now()
	ymd := fmt.Sprintf("%02d%02d%02d", now.Year()%100, int(now.Month()), now.Day())
	// base36 后 5 位 + 3 位随机
	t36 := strings.ToUpper(fmt.Sprintf("%x", now.UnixNano()))
	if len(t36) > 5 {
		t36 = t36[len(t36)-5:]
	}
	rnd := now.Nanosecond() % 1000
	return prefix + ymd + t36 + fmt.Sprintf("%03d", rnd)
}
