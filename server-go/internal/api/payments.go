package api

// Mock 支付:
//   - POST /api/payments                创建支付单(返回二维码)
//   - GET  /api/payments/:payNo         查询状态
//   - POST /api/payments/:payNo/confirm Demo 用:一键付款成功(真实环境由 webhook)
//   - POST /api/payments/:payNo/expire  Demo 用:一键过期
//
// 付款后的业务串联在 onOrderPaid / onVipOrderPaid / onDepositPaid 里,
// 与 Next.js src/lib/payment.ts 对齐。

import (
	"strings"
	"time"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const payExpireMinutes = 15

type PaymentsHandler struct {
	DB *gorm.DB
}

func (h *PaymentsHandler) Register(g *gin.RouterGroup) {
	g.POST("/payments", middleware.RequireUser(), h.create)
	g.GET("/payments/:payNo", middleware.RequireUser(), h.query)
	g.POST("/payments/:payNo/confirm", middleware.RequireUser(), h.confirm)
}

// ============ 创建 ============
type createPaymentBody struct {
	BizType string `json:"bizType" binding:"required,oneof=order vip deposit auction_balance"`
	BizID   string `json:"bizId" binding:"required"`
	Channel string `json:"channel" binding:"required,oneof=wechat alipay"`
}

func (h *PaymentsHandler) create(c *gin.Context) {
	me := middleware.MustUser(c)
	var body createPaymentBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}

	switch body.BizType {
	case "order":
		h.createOrderPayment(c, me, body.BizID, body.Channel)
	case "auction_balance":
		h.createAuctionBalance(c, me, body.BizID, body.Channel)
	case "vip":
		h.createVipPayment(c, me, body.BizID, body.Channel)
	case "deposit":
		h.createDepositPayment(c, me, body.BizID, body.Channel)
	}
}

func (h *PaymentsHandler) createOrderPayment(c *gin.Context, me *models.User, orderID, channel string) {
	var o models.Order
	if err := h.DB.Where("id = ?", orderID).First(&o).Error; err != nil {
		httpx.NotFound(c, "订单不存在")
		return
	}
	if o.BuyerID != me.ID {
		httpx.Forbidden(c, "无权支付该订单")
		return
	}
	if o.Source != "product" {
		httpx.BadRequest(c, "该订单需走对应的支付通道")
		return
	}
	if o.Status != "pending_payment" {
		httpx.BadRequest(c, "订单状态不允许支付")
		return
	}
	p := h.makePayment("order", o.ID, me.ID, channel, o.TotalPrice)
	httpx.OK(c, h.serializePayment(p))
}

func (h *PaymentsHandler) createAuctionBalance(c *gin.Context, me *models.User, orderID, channel string) {
	var o models.Order
	if err := h.DB.Where("id = ?", orderID).First(&o).Error; err != nil {
		httpx.NotFound(c, "订单不存在")
		return
	}
	if o.BuyerID != me.ID {
		httpx.Forbidden(c, "无权支付该订单")
		return
	}
	if o.Source != "auction" {
		httpx.BadRequest(c, "该订单不是拍卖订单")
		return
	}
	if o.Status != "pending_payment" {
		httpx.BadRequest(c, "订单状态不允许支付")
		return
	}
	balance := o.TotalPrice - o.DepositPaid
	if balance <= 0 {
		httpx.BadRequest(c, "订单余额已结清")
		return
	}
	p := h.makePayment("auction_balance", o.ID, me.ID, channel, balance)
	httpx.OK(c, h.serializePayment(p))
}

func (h *PaymentsHandler) createVipPayment(c *gin.Context, me *models.User, vipOrderID, channel string) {
	var vo models.VipOrder
	if err := h.DB.Where("id = ?", vipOrderID).First(&vo).Error; err != nil {
		httpx.NotFound(c, "订单不存在")
		return
	}
	if vo.UserID != me.ID {
		httpx.Forbidden(c, "无权支付")
		return
	}
	if vo.Status != "pending_payment" {
		httpx.BadRequest(c, "订单状态不允许支付")
		return
	}
	p := h.makePayment("vip", vo.ID, me.ID, channel, vo.Amount)
	httpx.OK(c, h.serializePayment(p))
}

func (h *PaymentsHandler) createDepositPayment(c *gin.Context, me *models.User, participantID, channel string) {
	var part models.AuctionParticipant
	if err := h.DB.Where("id = ?", participantID).First(&part).Error; err != nil {
		httpx.NotFound(c, "参与记录不存在")
		return
	}
	if part.UserID != me.ID {
		httpx.Forbidden(c, "无权操作")
		return
	}
	if part.DepositStatus != "pending" {
		httpx.BadRequest(c, "保证金状态不允许重新支付")
		return
	}
	p := h.makePayment("deposit", part.ID, me.ID, channel, part.DepositAmount)
	httpx.OK(c, h.serializePayment(p))
}

// 公用的创建 Payment 记录
func (h *PaymentsHandler) makePayment(bizType, bizID, userID, channel string, amount int) *models.Payment {
	// 取消旧 pending
	h.DB.Model(&models.Payment{}).
		Where("bizType = ? AND bizId = ? AND status = ?", bizType, bizID, "pending").
		Update("status", "cancelled")

	prefix := "PY"
	switch bizType {
	case "deposit":
		prefix = "DEP"
	case "auction_balance":
		prefix = "AB"
	}
	payNo := genOrderNo(prefix)
	qr := "mock://" + channel + "/pay/" + payNo
	p := &models.Payment{
		ID:        genCuid(),
		PayNo:     payNo,
		BizType:   bizType,
		BizID:     bizID,
		UserID:    userID,
		Channel:   channel,
		Amount:    amount,
		Qrcode:    strPtr(qr),
		Status:    "pending",
		ExpireAt:  time.Now().Add(payExpireMinutes * time.Minute),
		CreatedAt: time.Now(),
	}
	h.DB.Create(p)
	return p
}

// ============ 查询 ============
func (h *PaymentsHandler) query(c *gin.Context) {
	me := middleware.MustUser(c)
	var p models.Payment
	if err := h.DB.Where("payNo = ?", c.Param("payNo")).First(&p).Error; err != nil {
		httpx.NotFound(c, "支付单不存在")
		return
	}
	if p.UserID != me.ID {
		httpx.Forbidden(c, "无权查看")
		return
	}
	// 超时检测
	if p.Status == "pending" && p.ExpireAt.Before(time.Now()) {
		p.Status = "expired"
		h.DB.Model(&p).Update("status", "expired")
	}
	httpx.OK(c, h.serializePayment(&p))
}

// ============ 确认付款(Demo) ============
func (h *PaymentsHandler) confirm(c *gin.Context) {
	me := middleware.MustUser(c)
	var p models.Payment
	if err := h.DB.Where("payNo = ?", c.Param("payNo")).First(&p).Error; err != nil {
		httpx.NotFound(c, "支付单不存在")
		return
	}
	if p.UserID != me.ID {
		httpx.Forbidden(c, "无权操作")
		return
	}
	if p.Status == "paid" {
		httpx.OK(c, gin.H{"alreadyPaid": true})
		return
	}
	if p.Status != "pending" {
		httpx.BadRequest(c, "支付单状态不允许确认")
		return
	}
	if p.ExpireAt.Before(time.Now()) {
		h.DB.Model(&p).Update("status", "expired")
		httpx.BadRequest(c, "支付单已过期")
		return
	}

	// 标记 paid
	now := time.Now()
	h.DB.Model(&p).Updates(map[string]any{"status": "paid", "paidAt": &now})

	switch p.BizType {
	case "order", "auction_balance":
		h.onOrderPaid(p.BizID)
	case "vip":
		h.onVipOrderPaid(p.BizID)
	case "deposit":
		h.onDepositPaid(p.BizID)
	}
	httpx.OK(c, gin.H{"alreadyPaid": false})
}

// ============ 串联业务 ============

func (h *PaymentsHandler) onOrderPaid(orderID string) {
	var o models.Order
	if err := h.DB.Where("id = ?", orderID).First(&o).Error; err != nil {
		return
	}
	// 待付款 → 待发货
	h.DB.Model(&o).Update("status", "pending_ship")

	// 商品订单:扣库存
	if o.Source == "product" && o.ProductID != nil {
		h.DB.Model(&models.Product{}).Where("id = ?", *o.ProductID).
			UpdateColumn("stock", gorm.Expr("stock - ?", o.Quantity))
		var p models.Product
		h.DB.Where("id = ?", *o.ProductID).First(&p)
		if p.Source == "c2c" && p.Stock <= 0 {
			h.DB.Model(&p).Update("status", "sold_out")
		}
	}
	// 拍卖订单:更新 result = paid
	if o.Source == "auction" && o.AuctionID != nil {
		h.DB.Model(&models.Auction{}).Where("id = ?", *o.AuctionID).Update("result", "paid")
	}

	// 返利钻石
	if o.PointsBackTotal > 0 {
		addPoints(h.DB, o.BuyerID, o.PointsBackTotal, "purchase_back", "order", o.ID,
			"购物返利")
	}

	// 通知
	if o.SellerID != nil {
		h.DB.Create(&models.Notification{
			ID: genCuid(), RecipientID: *o.SellerID, Type: "system",
			Text: "🛒 你的商品已被支付,请尽快发货",
			Link: strPtr("/orders?role=seller"),
			CreatedAt: time.Now(),
		})
	}
	h.DB.Create(&models.Notification{
		ID: genCuid(), RecipientID: o.BuyerID, Type: "system",
		Text: "✅ 订单已支付成功,等待卖家发货",
		Link: strPtr("/orders"),
		CreatedAt: time.Now(),
	})
}

func (h *PaymentsHandler) onVipOrderPaid(vipOrderID string) {
	var vo models.VipOrder
	if err := h.DB.Where("id = ?", vipOrderID).First(&vo).Error; err != nil {
		return
	}
	now := time.Now()
	h.DB.Model(&vo).Updates(map[string]any{
		"status": "completed", "paidAt": &now,
	})
	applyVipMembership(h.DB, vo.UserID, vo.Plan, vo.DurationDays)
}

func (h *PaymentsHandler) onDepositPaid(participantID string) {
	var p models.AuctionParticipant
	if err := h.DB.Where("id = ?", participantID).First(&p).Error; err != nil {
		return
	}
	if p.DepositStatus != "pending" {
		return
	}
	h.DB.Model(&p).Update("depositStatus", "held")
	h.DB.Create(&models.Notification{
		ID: genCuid(), RecipientID: p.UserID, Type: "system",
		Text: "🔨 保证金已到账,你现在可以参与出价啦",
		Link: strPtr("/auction/" + p.AuctionID),
		CreatedAt: time.Now(),
	})
}

func (h *PaymentsHandler) serializePayment(p *models.Payment) gin.H {
	return gin.H{
		"id": p.ID, "payNo": p.PayNo,
		"bizType": p.BizType, "bizId": p.BizID,
		"channel":   p.Channel,
		"amount":    p.Amount,
		"qrcode":    p.Qrcode,
		"status":    p.Status,
		"expireAt":  p.ExpireAt.UTC().Format(time.RFC3339),
		"paidAt":    isoOrNil(p.PaidAt),
		"createdAt": p.CreatedAt.UTC().Format(time.RFC3339),
	}
}

// ============ 通用:加钻石、VIP 激活 ============

// addPoints:写入 PointsLedger + 更新 User.pointsBalance
func addPoints(db *gorm.DB, userID string, delta int, eventType, refType, refID, remark string) {
	if delta == 0 {
		return
	}
	db.Transaction(func(tx *gorm.DB) error {
		// 增量更新余额
		tx.Model(&models.User{}).Where("id = ?", userID).
			UpdateColumn("pointsBalance", gorm.Expr("pointsBalance + ?", delta))
		var u models.User
		tx.Where("id = ?", userID).First(&u)
		tx.Create(&models.PointsLedger{
			ID: genCuid(), UserID: userID,
			Type: eventType, Delta: delta, Balance: u.PointsBalance,
			RefType: strPtr(refType), RefID: strPtr(refID),
			Remark:    strPtr(remark),
			CreatedAt: time.Now(),
		})
		return nil
	})
}

// applyVipMembership:延长 VIP 到期时间,或置为终身
func applyVipMembership(db *gorm.DB, userID, plan string, days int) {
	var u models.User
	if err := db.Where("id = ?", userID).First(&u).Error; err != nil {
		return
	}
	updates := map[string]any{}
	if u.VipFirstAt == nil {
		now := time.Now()
		updates["vipFirstAt"] = &now
	}
	if plan == "lifetime" {
		updates["vipLifetime"] = true
	} else {
		base := time.Now()
		if u.VipExpireAt != nil && u.VipExpireAt.After(base) {
			base = *u.VipExpireAt
		}
		newExpire := base.Add(time.Duration(days) * 24 * time.Hour)
		updates["vipExpireAt"] = newExpire
	}
	db.Model(&u).Updates(updates)

	db.Create(&models.Notification{
		ID: genCuid(), RecipientID: userID, Type: "system",
		Text: "🎉 大会员开通成功!发帖、出售已无限制,享受 VIP 全部专属权益",
		Link: strPtr("/vip"),
		CreatedAt: time.Now(),
	})
}

// 判断字符串列表包含
func contains(xs []string, s string) bool {
	for _, x := range xs {
		if strings.EqualFold(x, s) {
			return true
		}
	}
	return false
}
