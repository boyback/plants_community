package api

import (
	"time"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type OrdersHandler struct {
	DB *gorm.DB
}

func (h *OrdersHandler) Register(g *gin.RouterGroup) {
	g.GET("/orders", middleware.RequireUser(), h.list)
	g.GET("/orders/:id", middleware.RequireUser(), h.detail)
	g.POST("/orders/:id/cancel", middleware.RequireUser(), h.cancel)
	g.POST("/orders/:id/ship", middleware.RequireUser(), h.ship)
	g.POST("/orders/:id/confirm", middleware.RequireUser(), h.confirm) // 买家确认收货
	g.POST("/orders/:id/review", middleware.RequireUser(), h.review)
}

// GET /api/orders?role=buyer|seller&status=...
func (h *OrdersHandler) list(c *gin.Context) {
	me := middleware.MustUser(c)
	role := c.DefaultQuery("role", "buyer")
	status := c.Query("status")

	tx := h.DB.Model(&models.Order{})
	if role == "seller" {
		tx = tx.Where("sellerId = ?", me.ID)
	} else {
		tx = tx.Where("buyerId = ?", me.ID)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}

	var rows []models.Order
	tx.Preload("Product").Preload("Auction").Preload("Buyer").Preload("Seller").
		Order("createdAt DESC").Limit(50).Find(&rows)

	items := make([]gin.H, 0, len(rows))
	for i := range rows {
		items = append(items, h.serialize(&rows[i]))
	}
	httpx.OK(c, items)
}

// GET /api/orders/:id
func (h *OrdersHandler) detail(c *gin.Context) {
	me := middleware.MustUser(c)
	var o models.Order
	if err := h.DB.Preload("Product").Preload("Auction").Preload("Buyer").Preload("Seller").
		Where("id = ?", c.Param("id")).First(&o).Error; err != nil {
		httpx.NotFound(c, "订单不存在")
		return
	}
	if o.BuyerID != me.ID && (o.SellerID == nil || *o.SellerID != me.ID) {
		httpx.Forbidden(c, "无权查看该订单")
		return
	}
	httpx.OK(c, h.serialize(&o))
}

// POST /api/orders/:id/cancel  买家可撤销 pending_payment
func (h *OrdersHandler) cancel(c *gin.Context) {
	me := middleware.MustUser(c)
	var o models.Order
	if err := h.DB.Where("id = ?", c.Param("id")).First(&o).Error; err != nil {
		httpx.NotFound(c, "订单不存在")
		return
	}
	if o.BuyerID != me.ID {
		httpx.Forbidden(c, "只有买家可取消订单")
		return
	}
	if o.Status != "pending_payment" {
		httpx.BadRequest(c, "只能取消待付款订单")
		return
	}
	now := time.Now()
	h.DB.Model(&o).Updates(map[string]any{
		"status":      "cancelled",
		"cancelledAt": &now,
	})
	httpx.OK(c, gin.H{"ok": true})
}

// POST /api/orders/:id/ship  卖家发货
type shipBody struct {
	TrackingNo string `json:"trackingNo"`
}

func (h *OrdersHandler) ship(c *gin.Context) {
	me := middleware.MustUser(c)
	var o models.Order
	if err := h.DB.Where("id = ?", c.Param("id")).First(&o).Error; err != nil {
		httpx.NotFound(c, "订单不存在")
		return
	}
	if o.SellerID == nil || *o.SellerID != me.ID {
		httpx.Forbidden(c, "只有卖家可以发货")
		return
	}
	if o.Status != "pending_ship" {
		httpx.BadRequest(c, "订单状态不允许发货")
		return
	}

	var body shipBody
	_ = c.ShouldBindJSON(&body)

	now := time.Now()
	updates := map[string]any{
		"status":    "pending_receipt",
		"shippedAt": &now,
	}
	if body.TrackingNo != "" {
		updates["trackingNo"] = body.TrackingNo
	}
	h.DB.Model(&o).Updates(updates)

	// 通知买家
	h.DB.Create(&models.Notification{
		ID:          genCuid(),
		RecipientID: o.BuyerID,
		Type:        "system",
		Text:        "📦 你的订单已发货,请留意收件信息",
		Link:        strPtr("/orders"),
		CreatedAt:   now,
	})
	httpx.OK(c, gin.H{"ok": true})
}

// POST /api/orders/:id/confirm  买家确认收货
func (h *OrdersHandler) confirm(c *gin.Context) {
	me := middleware.MustUser(c)
	var o models.Order
	if err := h.DB.Where("id = ?", c.Param("id")).First(&o).Error; err != nil {
		httpx.NotFound(c, "订单不存在")
		return
	}
	if o.BuyerID != me.ID {
		httpx.Forbidden(c, "只有买家可确认收货")
		return
	}
	if o.Status != "pending_receipt" {
		httpx.BadRequest(c, "订单状态不允许确认收货")
		return
	}
	now := time.Now()
	h.DB.Model(&o).Updates(map[string]any{
		"status":     "pending_review",
		"receivedAt": &now,
	})
	httpx.OK(c, gin.H{"ok": true})
}

// POST /api/orders/:id/review
type reviewBody struct {
	Rating int    `json:"rating" binding:"required,min=1,max=5"`
	Text   string `json:"text"`
}

func (h *OrdersHandler) review(c *gin.Context) {
	me := middleware.MustUser(c)
	var body reviewBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}
	var o models.Order
	if err := h.DB.Where("id = ?", c.Param("id")).First(&o).Error; err != nil {
		httpx.NotFound(c, "订单不存在")
		return
	}
	if o.BuyerID != me.ID {
		httpx.Forbidden(c, "只有买家可评价")
		return
	}
	if o.Status != "pending_review" && o.Status != "completed" {
		httpx.BadRequest(c, "订单状态不允许评价")
		return
	}
	now := time.Now()
	h.DB.Model(&o).Updates(map[string]any{
		"status":          "completed",
		"reviewRating":    body.Rating,
		"reviewTextPlain": body.Text,
		"reviewText":      body.Text,
		"reviewedAt":      &now,
	})
	httpx.OK(c, gin.H{"ok": true})
}

// ===== 序列化 =====
func (h *OrdersHandler) serialize(o *models.Order) gin.H {
	var buyer, seller any
	if o.Buyer != nil {
		buyer = httpx.SerializeUser(o.Buyer,
			httpx.LoadUserCounts(h.DB, o.Buyer.ID),
			httpx.LoadUserBadges(h.DB, o.Buyer.ID))
	}
	if o.Seller != nil {
		seller = httpx.SerializeUser(o.Seller,
			httpx.LoadUserCounts(h.DB, o.Seller.ID),
			httpx.LoadUserBadges(h.DB, o.Seller.ID))
	}
	var product, auction any
	if o.Product != nil {
		mh := &MarketHandler{DB: h.DB}
		product = mh.serializeProduct(o.Product)
	}
	if o.Auction != nil {
		auction = gin.H{"id": o.Auction.ID, "title": o.Auction.Title, "cover": o.Auction.Cover}
	}
	return gin.H{
		"id": o.ID, "orderNo": o.OrderNo,
		"source":          o.Source,
		"quantity":        o.Quantity,
		"unitPrice":       o.UnitPrice,
		"totalPrice":      o.TotalPrice,
		"depositPaid":     o.DepositPaid,
		"pointsBackTotal": o.PointsBackTotal,
		"status":          o.Status,
		"shipName":        o.ShipName,
		"shipPhone":       o.ShipPhone,
		"shipAddress":     o.ShipAddress,
		"trackingNo":      o.TrackingNo,
		"shippedAt":       isoOrNil(o.ShippedAt),
		"receivedAt":      isoOrNil(o.ReceivedAt),
		"reviewRating":    o.ReviewRating,
		"reviewText":      o.ReviewText,
		"cancelledAt":     isoOrNil(o.CancelledAt),
		"refundReason":    o.RefundReason,
		"refundedAt":      isoOrNil(o.RefundedAt),
		"createdAt":       o.CreatedAt.UTC().Format(time.RFC3339),
		"product":         product,
		"auction":         auction,
		"buyer":           buyer,
		"seller":          seller,
	}
}
