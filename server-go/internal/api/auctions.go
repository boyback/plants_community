package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	auctionpkg "plants-community-server/internal/auction"
	"plants-community-server/internal/httpx"
	"plants-community-server/internal/levels"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"
	"plants-community-server/internal/richtext"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuctionsHandler struct {
	DB *gorm.DB
}

func (h *AuctionsHandler) Register(g *gin.RouterGroup) {
	g.GET("/auctions", h.list)
	g.POST("/auctions", middleware.RequireUser(), h.create)
	g.GET("/auctions/:id", h.detail)
	g.POST("/auctions/:id/join", middleware.RequireUser(), h.join) // 创建参与记录(支付保证金前的入口)
	g.POST("/auctions/:id/bid", middleware.RequireUser(), h.bid)
}

// GET /api/auctions
func (h *AuctionsHandler) list(c *gin.Context) {
	auctionpkg.AdvanceState(h.DB, "")

	status := c.Query("status")
	sellerID := c.Query("seller")

	tx := h.DB.Model(&models.Auction{})
	switch status {
	case "live", "scheduled", "finished", "cancelled":
		tx = tx.Where("status = ?", status)
	case "":
		if sellerID == "" {
			tx = tx.Where("status = ?", "live") // 默认只看进行中
		}
	}
	if sellerID != "" {
		tx = tx.Where("sellerId = ?", sellerID)
	}
	// 排序
	switch status {
	case "live":
		tx = tx.Order("endAt ASC")
	case "scheduled":
		tx = tx.Order("startAt ASC")
	default:
		tx = tx.Order("updatedAt DESC")
	}

	var rows []models.Auction
	tx.Preload("Seller").Limit(24).Find(&rows)

	items := make([]gin.H, 0, len(rows))
	for i := range rows {
		items = append(items, h.serialize(&rows[i], nil))
	}
	httpx.OK(c, gin.H{"items": items, "nextCursor": nil})
}

// GET /api/auctions/:id
func (h *AuctionsHandler) detail(c *gin.Context) {
	id := c.Param("id")
	auctionpkg.AdvanceState(h.DB, id)

	var a models.Auction
	if err := h.DB.Preload("Seller").Preload("Winner").Where("id = ?", id).First(&a).Error; err != nil {
		httpx.NotFound(c, "拍卖不存在")
		return
	}

	me := middleware.OptionalUser(c)
	var myPart *models.AuctionParticipant
	if me != nil {
		var p models.AuctionParticipant
		if h.DB.Where("auctionId = ? AND userId = ?", id, me.ID).First(&p).Error == nil {
			myPart = &p
		}
	}

	// 最近 20 条出价
	var bids []models.Bid
	h.DB.Preload("Bidder").Where("auctionId = ?", id).
		Order("createdAt DESC").Limit(20).Find(&bids)

	bidItems := make([]gin.H, 0, len(bids))
	for i := range bids {
		b := &bids[i]
		var bidder any
		if b.Bidder != nil {
			bidder = gin.H{
				"id": b.Bidder.ID, "name": b.Bidder.Name, "avatar": b.Bidder.Avatar,
			}
		}
		bidItems = append(bidItems, gin.H{
			"id": b.ID, "amount": b.Amount,
			"createdAt": b.CreatedAt.UTC().Format(time.RFC3339),
			"bidder":    bidder,
		})
	}

	out := h.serialize(&a, bidItems)
	if myPart != nil {
		out["myParticipant"] = gin.H{
			"id": myPart.ID, "depositStatus": myPart.DepositStatus,
			"depositAmount":    myPart.DepositAmount,
			"depositPaymentId": myPart.DepositPaymentID,
		}
	}
	httpx.OK(c, out)
}

// POST /api/auctions  创建拍卖
type createAuctionBody struct {
	Title            string   `json:"title" binding:"required,min=2,max=80"`
	Description      string   `json:"description"`
	DescriptionJSON  any      `json:"descriptionJson"`
	Category         string   `json:"category" binding:"required"`
	Cover            string   `json:"cover" binding:"required"`
	Images           []string `json:"images"`
	Tags             []string `json:"tags"`
	StartPrice       int      `json:"startPrice" binding:"required,min=100"`
	MinIncrement     int      `json:"minIncrement"`
	BuyNowPrice      int      `json:"buyNowPrice"`
	DepositAmount    int      `json:"depositAmount" binding:"required,min=100"`
	ReservePrice     int      `json:"reservePrice"`
	StartAt          string   `json:"startAt" binding:"required"`
	EndAt            string   `json:"endAt" binding:"required"`
	AntiSnipeMinutes int      `json:"antiSnipeMinutes"`
}

func (h *AuctionsHandler) create(c *gin.Context) {
	me := middleware.MustUser(c)
	isVip := levels.IsVipActive(me.VipLifetime, userVipExpireUnix(me), time.Now().Unix())
	if !levels.Has(me.Level, isVip, levels.PermMarketSell) {
		httpx.Forbidden(c, "当前等级不允许发布拍卖,Lv.8 起或大会员可发布")
		return
	}

	var body createAuctionBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	startAt, err1 := time.Parse(time.RFC3339, body.StartAt)
	endAt, err2 := time.Parse(time.RFC3339, body.EndAt)
	if err1 != nil || err2 != nil {
		httpx.BadRequest(c, "时间格式错误,应为 ISO-8601")
		return
	}
	if !startAt.Before(endAt) {
		httpx.BadRequest(c, "结束时间必须晚于开始时间")
		return
	}
	if endAt.Sub(startAt) < 5*time.Minute {
		httpx.BadRequest(c, "拍卖时长至少 5 分钟")
		return
	}
	if body.BuyNowPrice > 0 && body.BuyNowPrice <= body.StartPrice {
		httpx.BadRequest(c, "一口价必须大于起拍价")
		return
	}
	if body.ReservePrice > 0 && body.ReservePrice < body.StartPrice {
		httpx.BadRequest(c, "保留价不能低于起拍价")
		return
	}

	stored := richtext.Process(richtext.Input{
		JSON: body.DescriptionJSON, HTML: body.Description, TextMaxLen: 1000,
	})
	if stored.Text == "" {
		httpx.BadRequest(c, "请填写拍卖描述")
		return
	}
	imgs := body.Images
	if len(imgs) == 0 {
		imgs = []string{body.Cover}
	}
	tagsStr := jsonArr(body.Tags)

	status := "scheduled"
	if !startAt.After(time.Now()) {
		status = "live"
	}
	minInc := body.MinIncrement
	if minInc == 0 {
		minInc = 100
	}
	antiSnipe := body.AntiSnipeMinutes
	if antiSnipe == 0 {
		antiSnipe = 5
	}

	a := models.Auction{
		ID: genCuid(), SellerID: me.ID,
		Title: body.Title, Cover: body.Cover,
		Images:          jsonArr(imgs),
		Description:     stored.HTML,
		DescriptionJson: nullable(stored.JSON),
		DescriptionText: nullable(stored.Text),
		Category:        body.Category,
		Tags:            strPtr(tagsStr),
		StartPrice:      body.StartPrice,
		MinIncrement:    minInc,
		DepositAmount:   body.DepositAmount,
		StartAt:         startAt, EndAt: endAt,
		AntiSnipeMinutes: antiSnipe,
		Status:           status,
		CurrentPrice:     body.StartPrice,
		CreatedAt:        time.Now(), UpdatedAt: time.Now(),
	}
	if body.BuyNowPrice > 0 {
		a.BuyNowPrice = &body.BuyNowPrice
	}
	if body.ReservePrice > 0 {
		a.ReservePrice = &body.ReservePrice
	}
	if err := h.DB.Create(&a).Error; err != nil {
		httpx.Internal(c, err)
		return
	}
	a.Seller = me
	httpx.OK(c, h.serialize(&a, nil))
}

// POST /api/auctions/:id/join  报名(创建 AuctionParticipant,depositStatus=pending)
// 后续需要调 POST /api/payments { bizType: 'deposit', bizId: participantId } 付保证金
func (h *AuctionsHandler) join(c *gin.Context) {
	me := middleware.MustUser(c)
	id := c.Param("id")

	var a models.Auction
	if err := h.DB.Where("id = ?", id).First(&a).Error; err != nil {
		httpx.NotFound(c, "拍卖不存在")
		return
	}
	if a.SellerID == me.ID {
		httpx.BadRequest(c, "不能参与自己的拍卖")
		return
	}
	if a.Status != "live" && a.Status != "scheduled" {
		httpx.BadRequest(c, "拍卖已结束或不可参与")
		return
	}

	// 已存在则直接返回
	var existing models.AuctionParticipant
	if h.DB.Where("auctionId = ? AND userId = ?", id, me.ID).First(&existing).Error == nil {
		httpx.OK(c, gin.H{
			"id": existing.ID, "depositStatus": existing.DepositStatus,
			"depositAmount": existing.DepositAmount,
		})
		return
	}
	p := models.AuctionParticipant{
		ID: genCuid(), AuctionID: id, UserID: me.ID,
		DepositAmount: a.DepositAmount, DepositStatus: "pending",
		CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	h.DB.Create(&p)
	httpx.OK(c, gin.H{
		"id": p.ID, "depositStatus": p.DepositStatus,
		"depositAmount": p.DepositAmount,
	})
}

// POST /api/auctions/:id/bid
type bidBody struct {
	Amount int  `json:"amount" binding:"min=100"`
	BuyNow bool `json:"buyNow"`
}

func (h *AuctionsHandler) bid(c *gin.Context) {
	me := middleware.MustUser(c)
	auctionID := c.Param("id")

	auctionpkg.AdvanceState(h.DB, auctionID)

	var body bidBody
	_ = c.ShouldBindJSON(&body)

	// 校验参与者
	var part models.AuctionParticipant
	if err := h.DB.Where("auctionId = ? AND userId = ?", auctionID, me.ID).First(&part).Error; err != nil {
		httpx.Forbidden(c, "请先支付保证金后再出价")
		return
	}
	if part.DepositStatus != "held" {
		httpx.Forbidden(c, "请先支付保证金后再出价")
		return
	}

	var a models.Auction
	if err := h.DB.Where("id = ?", auctionID).First(&a).Error; err != nil {
		httpx.NotFound(c, "拍卖不存在")
		return
	}
	if a.Status != "live" {
		httpx.BadRequest(c, "拍卖未在进行中")
		return
	}
	if a.SellerID == me.ID {
		httpx.BadRequest(c, "不能给自己的拍卖出价")
		return
	}

	if body.BuyNow {
		if a.BuyNowPrice == nil {
			httpx.BadRequest(c, "该场拍卖未设置一口价")
			return
		}
		body.Amount = *a.BuyNowPrice
	}

	minRequired := a.StartPrice
	if a.BidCount > 0 {
		minRequired = a.CurrentPrice + a.MinIncrement
	}
	if body.Amount < minRequired {
		httpx.BadRequest(c, fmt.Sprintf("出价至少为 ¥%.2f", float64(minRequired)/100))
		return
	}
	if a.BuyNowPrice != nil && body.Amount > *a.BuyNowPrice {
		httpx.BadRequest(c, "出价不能超过一口价")
		return
	}

	// 防狙击:剩余 < antiSnipeMinutes 则延长
	now := time.Now()
	antiSnipe := time.Duration(a.AntiSnipeMinutes) * time.Minute
	remain := a.EndAt.Sub(now)
	newEndAt := a.EndAt
	extended := false
	if remain > 0 && remain < antiSnipe {
		newEndAt = now.Add(antiSnipe)
		extended = true
	}

	// 事务出价
	var result struct {
		BidID        string
		CurrentPrice int
		BidCount     int
		EndAt        time.Time
	}
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		// 重新 load,防并发
		var fresh models.Auction
		if err := tx.Where("id = ?", auctionID).First(&fresh).Error; err != nil {
			return err
		}
		if fresh.Status != "live" {
			return errors.New("拍卖已结束")
		}
		minReqNow := fresh.StartPrice
		if fresh.BidCount > 0 {
			minReqNow = fresh.CurrentPrice + fresh.MinIncrement
		}
		if body.Amount < minReqNow {
			return fmt.Errorf("出价至少为 ¥%.2f", float64(minReqNow)/100)
		}
		bid := models.Bid{
			ID: genCuid(), AuctionID: auctionID,
			BidderID: me.ID, Amount: body.Amount,
			CreatedAt: now,
		}
		if err := tx.Create(&bid).Error; err != nil {
			return err
		}
		tx.Model(&fresh).Updates(map[string]any{
			"currentPrice": body.Amount,
			"bidCount":     gorm.Expr("bidCount + 1"),
			"endAt":        newEndAt,
		})
		// 通知前一位领先者
		var prev models.Bid
		if tx.Where("auctionId = ? AND bidderId <> ? AND id <> ?",
			auctionID, me.ID, bid.ID).
			Order("amount DESC").First(&prev).Error == nil {
			tx.Create(&models.Notification{
				ID: genCuid(), RecipientID: prev.BidderID, Type: "system",
				Text: fmt.Sprintf("🪙 你在「%s」上的出价被超过了,当前价 ¥%.2f",
					fresh.Title, float64(body.Amount)/100),
				Link:      strPtr("/auction/" + auctionID),
				CreatedAt: now,
			})
		}

		var after models.Auction
		tx.Where("id = ?", auctionID).First(&after)
		result.BidID = bid.ID
		result.CurrentPrice = after.CurrentPrice
		result.BidCount = after.BidCount
		result.EndAt = after.EndAt
		return nil
	})
	if err != nil {
		httpx.BadRequest(c, err.Error())
		return
	}

	httpx.OK(c, gin.H{
		"bidId":        result.BidID,
		"currentPrice": result.CurrentPrice,
		"bidCount":     result.BidCount,
		"endAt":        result.EndAt.UTC().Format(time.RFC3339),
		"extended":     extended,
	})
}

// ====== 序列化 ======
func (h *AuctionsHandler) serialize(a *models.Auction, bids []gin.H) gin.H {
	var images []string
	_ = json.Unmarshal([]byte(a.Images), &images)
	var tags []string
	if a.Tags != nil {
		_ = json.Unmarshal([]byte(*a.Tags), &tags)
	}
	var seller, winner any
	if a.Seller != nil {
		seller = httpx.SerializeUser(a.Seller,
			httpx.LoadUserCounts(h.DB, a.Seller.ID),
			httpx.LoadUserBadges(h.DB, a.Seller.ID))
	}
	if a.Winner != nil {
		winner = httpx.SerializeUser(a.Winner,
			httpx.LoadUserCounts(h.DB, a.Winner.ID),
			httpx.LoadUserBadges(h.DB, a.Winner.ID))
	}
	out := gin.H{
		"id": a.ID, "title": a.Title, "cover": a.Cover,
		"images": images, "tags": tags,
		"description": a.Description, "descriptionJson": a.DescriptionJson,
		"category":         a.Category,
		"startPrice":       a.StartPrice,
		"minIncrement":     a.MinIncrement,
		"buyNowPrice":      a.BuyNowPrice,
		"depositAmount":    a.DepositAmount,
		"reservePrice":     a.ReservePrice,
		"startAt":          a.StartAt.UTC().Format(time.RFC3339),
		"endAt":            a.EndAt.UTC().Format(time.RFC3339),
		"actualEndAt":      isoOrNil(a.ActualEndAt),
		"antiSnipeMinutes": a.AntiSnipeMinutes,
		"status":           a.Status,
		"result":           a.Result,
		"currentPrice":     a.CurrentPrice,
		"bidCount":         a.BidCount,
		"winningOrderId":   a.WinningOrderID,
		"createdAt":        a.CreatedAt.UTC().Format(time.RFC3339),
		"seller":           seller,
		"winner":           winner,
	}
	if bids != nil {
		out["recentBids"] = bids
	}
	return out
}
