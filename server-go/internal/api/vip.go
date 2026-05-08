package api

import (
	"time"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type VipHandler struct {
	DB *gorm.DB
}

func (h *VipHandler) Register(g *gin.RouterGroup) {
	g.GET("/vip/plans", h.plans)
	g.POST("/vip/order", middleware.RequireUser(), h.createOrder)
	g.POST("/vip/exchange", middleware.RequireUser(), h.exchange)
	g.GET("/vip/me", middleware.RequireUser(), h.me)
}

// 与 src/lib/vip-plans.ts 完全一致
type vipPlan struct {
	Key          string `json:"key"`
	Title        string `json:"title"`
	Subtitle     string `json:"subtitle"`
	Amount       int    `json:"amount"`
	PointsCost   int    `json:"pointsCost"`
	DurationDays int    `json:"durationDays"`
	Recommended  bool   `json:"recommended,omitempty"`
}

var vipPlans = []vipPlan{
	{"monthly", "月卡", "畅享 30 天大会员", 1990, 0, 30, false},
	{"quarterly", "季卡", "90 天 · 比月卡省 9.9", 4990, 0, 90, true},
	{"yearly", "年卡", "365 天 · 全年最划算", 16800, 0, 365, false},
	{"lifetime", "终身", "一次买断 · 永久会员", 49900, 0, 99999, false},
	{"monthly_points", "积分兑月卡", "5000 积分 = 30 天", 0, 5000, 30, false},
}

// GET /api/vip/plans
func (h *VipHandler) plans(c *gin.Context) {
	httpx.OK(c, vipPlans)
}

// POST /api/vip/order  { plan }
type createVipOrderBody struct {
	Plan string `json:"plan" binding:"required,oneof=monthly quarterly yearly lifetime"`
}

func (h *VipHandler) createOrder(c *gin.Context) {
	me := middleware.MustUser(c)
	var body createVipOrderBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}
	var plan *vipPlan
	for i := range vipPlans {
		if vipPlans[i].Key == body.Plan && vipPlans[i].PointsCost == 0 {
			plan = &vipPlans[i]
			break
		}
	}
	if plan == nil {
		httpx.BadRequest(c, "请选择现金套餐")
		return
	}
	o := &models.VipOrder{
		ID: genCuid(), OrderNo: genOrderNo("VIP"),
		UserID: me.ID, Plan: plan.Key,
		Amount: plan.Amount, PointsCost: 0,
		DurationDays: plan.DurationDays,
		Status:       "pending_payment",
		CreatedAt:    time.Now(),
	}
	h.DB.Create(o)
	httpx.OK(c, gin.H{"orderId": o.ID, "orderNo": o.OrderNo, "amount": o.Amount})
}

// POST /api/vip/exchange  积分兑月卡
func (h *VipHandler) exchange(c *gin.Context) {
	me := middleware.MustUser(c)
	plan := vipPlans[4] // monthly_points
	if me.PointsBalance < plan.PointsCost {
		httpx.BadRequest(c, "积分不足")
		return
	}
	// 扣积分 + 延长 VIP
	addPoints(h.DB, me.ID, -plan.PointsCost, "exchange_vip", "vip", "monthly_points",
		"积分兑换大会员月卡")
	applyVipMembership(h.DB, me.ID, plan.Key, plan.DurationDays)

	// 记一张 VipOrder(便于账单追溯)
	h.DB.Create(&models.VipOrder{
		ID: genCuid(), OrderNo: genOrderNo("VIPP"),
		UserID: me.ID, Plan: plan.Key,
		Amount: 0, PointsCost: plan.PointsCost,
		DurationDays: plan.DurationDays,
		Status:       "completed",
		PaidAt:       timePtr(time.Now()),
		CreatedAt:    time.Now(),
	})
	// 读最新的 user,给前端回显
	var u models.User
	h.DB.Where("id = ?", me.ID).First(&u)
	httpx.OK(c, gin.H{
		"ok": true, "pointsBalance": u.PointsBalance,
		"vipExpireAt": isoOrNil(u.VipExpireAt),
		"vipLifetime": u.VipLifetime,
	})
}

// GET /api/vip/me  当前会员状态 + 最近订单
func (h *VipHandler) me(c *gin.Context) {
	me := middleware.MustUser(c)
	now := time.Now()
	isVip := me.VipLifetime || (me.VipExpireAt != nil && me.VipExpireAt.After(now))

	var orders []models.VipOrder
	h.DB.Where("userId = ?", me.ID).Order("createdAt DESC").Limit(20).Find(&orders)

	list := make([]gin.H, 0, len(orders))
	for _, o := range orders {
		list = append(list, gin.H{
			"id": o.ID, "orderNo": o.OrderNo,
			"plan": o.Plan, "amount": o.Amount, "pointsCost": o.PointsCost,
			"durationDays": o.DurationDays,
			"status":       o.Status,
			"paidAt":       isoOrNil(o.PaidAt),
			"createdAt":    o.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
	httpx.OK(c, gin.H{
		"isVip": isVip,
		"lifetime": me.VipLifetime,
		"expireAt": isoOrNil(me.VipExpireAt),
		"firstAt":  isoOrNil(me.VipFirstAt),
		"orders":   list,
	})
}

func timePtr(t time.Time) *time.Time { return &t }
