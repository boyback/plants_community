package api

import (
	"time"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// =========================================================
// Announcements CRUD
// =========================================================

type announcementCreateBody struct {
	Title   string  `json:"title" binding:"required,min=1,max=120"`
	Content string  `json:"content" binding:"required,min=1,max=5000"`
	Level   string  `json:"level" binding:"oneof=info warning important"`
	Enabled *bool   `json:"enabled,omitempty"`
	StartAt *string `json:"startAt,omitempty"`
	EndAt   *string `json:"endAt,omitempty"`
}

type announcementPatchBody struct {
	Title   *string `json:"title,omitempty"`
	Content *string `json:"content,omitempty"`
	Level   *string `json:"level,omitempty"`
	Enabled *bool   `json:"enabled,omitempty"`
	StartAt *string `json:"startAt,omitempty"` // 空字符串 = 清空
	EndAt   *string `json:"endAt,omitempty"`
}

func AdminListAnnouncements(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var items []models.Announcement
		if err := gdb.Order("createdAt desc").Find(&items).Error; err != nil {
			ServerError(c, err)
			return
		}
		httpx.OK(c, items)
	}
}

func AdminCreateAnnouncement(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		var body announcementCreateBody
		if err := c.ShouldBindJSON(&body); err != nil {
			httpx.BadRequest(c, err.Error())
			return
		}
		now := time.Now()
		enabled := true
		if body.Enabled != nil {
			enabled = *body.Enabled
		}
		row := models.Announcement{
			ID:        GenCUID(),
			Title:     body.Title,
			Content:   body.Content,
			Level:     body.Level,
			Enabled:   enabled,
			StartAt:   parseTimeOrNil(body.StartAt),
			EndAt:     parseTimeOrNil(body.EndAt),
			CreatedBy: me.ID,
			CreatedAt: now,
			UpdatedAt: now,
		}
		if err := gdb.Create(&row).Error; err != nil {
			ServerError(c, err)
			return
		}
		LogAdmin(gdb, adminLogArgs{
			ActorID:    me.ID,
			Action:     "announcement.create",
			TargetType: "announcement",
			TargetID:   &row.ID,
			Meta:       map[string]string{"title": row.Title},
		})
		httpx.OK(c, row)
	}
}

func AdminPatchAnnouncement(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		id := c.Param("id")
		var body announcementPatchBody
		if err := c.ShouldBindJSON(&body); err != nil {
			httpx.BadRequest(c, err.Error())
			return
		}
		var a models.Announcement
		if err := gdb.First(&a, "id = ?", id).Error; err != nil {
			httpx.NotFound(c, "公告不存在")
			return
		}
		updates := map[string]any{}
		if body.Title != nil {
			updates["title"] = *body.Title
		}
		if body.Content != nil {
			updates["content"] = *body.Content
		}
		if body.Level != nil {
			updates["level"] = *body.Level
		}
		if body.Enabled != nil {
			updates["enabled"] = *body.Enabled
		}
		if body.StartAt != nil {
			updates["startAt"] = parseTimeOrNil(body.StartAt)
		}
		if body.EndAt != nil {
			updates["endAt"] = parseTimeOrNil(body.EndAt)
		}
		if err := gdb.Model(&a).Updates(updates).Error; err != nil {
			ServerError(c, err)
			return
		}
		LogAdmin(gdb, adminLogArgs{
			ActorID:    me.ID,
			Action:     "announcement.update",
			TargetType: "announcement",
			TargetID:   &id,
			Meta:       updates,
		})
		httpx.OK(c, gin.H{"ok": true})
	}
}

func AdminDeleteAnnouncement(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		id := c.Param("id")
		var a models.Announcement
		if err := gdb.First(&a, "id = ?", id).Error; err != nil {
			httpx.NotFound(c, "公告不存在")
			return
		}
		if err := gdb.Delete(&a).Error; err != nil {
			ServerError(c, err)
			return
		}
		LogAdmin(gdb, adminLogArgs{
			ActorID:    me.ID,
			Action:     "announcement.delete",
			TargetType: "announcement",
			TargetID:   &id,
		})
		httpx.OK(c, gin.H{"ok": true})
	}
}

// =========================================================
// Products / Orders / Auctions
// =========================================================

type productPatchBody struct {
	Status string  `json:"status" binding:"required,oneof=on_sale off_shelf"`
	Reason *string `json:"reason,omitempty"`
}

func AdminPatchProduct(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		id := c.Param("id")
		var body productPatchBody
		if err := c.ShouldBindJSON(&body); err != nil {
			httpx.BadRequest(c, err.Error())
			return
		}
		var p models.Product
		if err := gdb.First(&p, "id = ?", id).Error; err != nil {
			httpx.NotFound(c, "商品不存在")
			return
		}
		if err := gdb.Model(&p).Update("status", body.Status).Error; err != nil {
			ServerError(c, err)
			return
		}
		action := "product.onsale"
		if body.Status == "off_shelf" {
			action = "product.offshelf"
		}
		LogAdmin(gdb, adminLogArgs{
			ActorID:    me.ID,
			Action:     action,
			TargetType: "product",
			TargetID:   &id,
			Reason:     body.Reason,
		})
		httpx.OK(c, gin.H{"ok": true})
	}
}

type orderPatchBody struct {
	Action     string  `json:"action" binding:"required,oneof=ship refund complete cancel"`
	TrackingNo *string `json:"trackingNo,omitempty"`
	Reason     *string `json:"reason,omitempty"`
}

func AdminPatchOrder(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		id := c.Param("id")
		var body orderPatchBody
		if err := c.ShouldBindJSON(&body); err != nil {
			httpx.BadRequest(c, err.Error())
			return
		}
		var o models.Order
		if err := gdb.First(&o, "id = ?", id).Error; err != nil {
			httpx.NotFound(c, "订单不存在")
			return
		}
		updates := map[string]any{}
		switch body.Action {
		case "ship":
			if o.Status != "pending_ship" {
				httpx.BadRequest(c, "订单状态不允许发货")
				return
			}
			updates["status"] = "pending_receipt"
			updates["trackingNo"] = body.TrackingNo
			now := time.Now()
			updates["shippedAt"] = &now
		case "refund":
			updates["status"] = "refunded"
		case "complete":
			updates["status"] = "completed"
		case "cancel":
			updates["status"] = "cancelled"
		}
		if err := gdb.Model(&o).Updates(updates).Error; err != nil {
			ServerError(c, err)
			return
		}
		meta := map[string]any{}
		if body.TrackingNo != nil {
			meta["trackingNo"] = *body.TrackingNo
		}
		LogAdmin(gdb, adminLogArgs{
			ActorID:    me.ID,
			Action:     "order." + body.Action,
			TargetType: "order",
			TargetID:   &id,
			Reason:     body.Reason,
			Meta:       meta,
		})
		httpx.OK(c, gin.H{"ok": true})
	}
}

type auctionPatchBody struct {
	Action string  `json:"action" binding:"required,oneof=cancel finish"`
	Reason *string `json:"reason,omitempty"`
}

func AdminPatchAuction(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		id := c.Param("id")
		var body auctionPatchBody
		if err := c.ShouldBindJSON(&body); err != nil {
			httpx.BadRequest(c, err.Error())
			return
		}
		var a models.Auction
		if err := gdb.First(&a, "id = ?", id).Error; err != nil {
			httpx.NotFound(c, "拍卖不存在")
			return
		}
		if body.Action == "cancel" {
			if a.Status == "finished" || a.Status == "cancelled" {
				httpx.BadRequest(c, "该拍卖已结束")
				return
			}
			if err := gdb.Model(&a).Update("status", "cancelled").Error; err != nil {
				ServerError(c, err)
				return
			}
			LogAdmin(gdb, adminLogArgs{
				ActorID: me.ID, Action: "auction.cancel",
				TargetType: "auction", TargetID: &id, Reason: body.Reason,
			})
		} else {
			if a.Status != "live" {
				httpx.BadRequest(c, "只有进行中的拍卖可强制结束")
				return
			}
			var top models.Bid
			err := gdb.Where("auctionId = ?", id).Order("amount desc").First(&top).Error
			result := "no_bidder"
			price := a.StartPrice
			var winnerID *string
			if err == nil {
				result = "won"
				price = top.Amount
				winnerID = &top.BidderID
			}
			updates := map[string]any{
				"status":       "finished",
				"result":       result,
				"currentPrice": price,
				"winnerId":     winnerID,
				"endAt":        time.Now(),
			}
			if err := gdb.Model(&a).Updates(updates).Error; err != nil {
				ServerError(c, err)
				return
			}
			LogAdmin(gdb, adminLogArgs{
				ActorID: me.ID, Action: "auction.forceFinish",
				TargetType: "auction", TargetID: &id,
				Meta: map[string]any{"winnerId": winnerID, "amount": price},
			})
		}
		httpx.OK(c, gin.H{"ok": true})
	}
}

// =========================================================
// Boards / Tasks
// =========================================================

type boardPatchBody struct {
	Enabled  *bool `json:"enabled,omitempty"`
	OrderIdx *int  `json:"orderIdx,omitempty"`
}

func AdminPatchBoard(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		typ := c.Param("type")
		id := c.Param("id")
		if typ != "category" {
			httpx.BadRequest(c, "type 无效(目前只 category 支持启用/禁用)")
			return
		}
		var body boardPatchBody
		if err := c.ShouldBindJSON(&body); err != nil {
			httpx.BadRequest(c, err.Error())
			return
		}
		updates := map[string]any{}
		if body.Enabled != nil {
			updates["enabled"] = *body.Enabled
		}
		if body.OrderIdx != nil {
			updates["orderIdx"] = *body.OrderIdx
		}
		if len(updates) == 0 {
			httpx.BadRequest(c, "没有变更")
			return
		}
		var cat models.Category
		if err := gdb.First(&cat, "id = ?", id).Error; err != nil {
			httpx.NotFound(c, "category 不存在")
			return
		}
		if err := gdb.Model(&cat).Updates(updates).Error; err != nil {
			ServerError(c, err)
			return
		}
		LogAdmin(gdb, adminLogArgs{
			ActorID: me.ID, Action: "board.category.update",
			TargetType: "category", TargetID: &id, Meta: updates,
		})
		httpx.OK(c, gin.H{"ok": true})
	}
}

type taskPatchBody struct {
	Enabled      *bool `json:"enabled,omitempty"`
	RewardPoints *int  `json:"rewardPoints,omitempty"`
	RewardExp    *int  `json:"rewardExp,omitempty"`
	Target       *int  `json:"target,omitempty"`
}

func AdminPatchTask(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		id := c.Param("id")
		var body taskPatchBody
		if err := c.ShouldBindJSON(&body); err != nil {
			httpx.BadRequest(c, err.Error())
			return
		}
		updates := map[string]any{}
		if body.Enabled != nil {
			updates["enabled"] = *body.Enabled
		}
		if body.RewardPoints != nil {
			updates["rewardPoints"] = *body.RewardPoints
		}
		if body.RewardExp != nil {
			updates["rewardExp"] = *body.RewardExp
		}
		if body.Target != nil {
			updates["target"] = *body.Target
		}
		if len(updates) == 0 {
			httpx.BadRequest(c, "没有变更")
			return
		}
		// 这里直接用 raw exec(因为 Go 端没维护 Task model)
		if err := gdb.Table("tasks").Where("id = ?", id).Updates(updates).Error; err != nil {
			ServerError(c, err)
			return
		}
		LogAdmin(gdb, adminLogArgs{
			ActorID: me.ID, Action: "task.update",
			TargetType: "task", TargetID: &id, Meta: updates,
		})
		httpx.OK(c, gin.H{"ok": true})
	}
}

// =========================================================
// Badge grant
// =========================================================

type badgeGrantBody struct {
	BadgeID string   `json:"badgeId" binding:"required"`
	UserIDs []string `json:"userIds,omitempty"`
	All     bool     `json:"all,omitempty"`
}

func AdminGrantBadge(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		var body badgeGrantBody
		if err := c.ShouldBindJSON(&body); err != nil {
			httpx.BadRequest(c, err.Error())
			return
		}
		if len(body.UserIDs) == 0 && !body.All {
			httpx.BadRequest(c, "必须提供 userIds 或 all=true")
			return
		}
		var badge models.Badge
		if err := gdb.First(&badge, "id = ?", body.BadgeID).Error; err != nil {
			httpx.NotFound(c, "徽章不存在")
			return
		}
		var userIDs []string
		if body.All {
			var users []models.User
			if err := gdb.Select("id").Find(&users).Error; err != nil {
				ServerError(c, err)
				return
			}
			for _, u := range users {
				userIDs = append(userIDs, u.ID)
			}
		} else {
			userIDs = body.UserIDs
		}
		now := time.Now()
		granted := 0
		for _, uid := range userIDs {
			var ub models.UserBadge
			err := gdb.Where("userId = ? AND badgeId = ?", uid, body.BadgeID).First(&ub).Error
			if err == nil && ub.Obtained {
				continue
			}
			if err == nil {
				gdb.Model(&ub).Updates(map[string]any{
					"obtained":   true,
					"obtainedAt": &now,
				})
			} else {
				gdb.Create(&models.UserBadge{
					UserID:     uid,
					BadgeID:    body.BadgeID,
					Obtained:   true,
					ObtainedAt: &now,
				})
			}
			granted++
		}
		scope := "specific"
		if body.All {
			scope = "all"
		}
		LogAdmin(gdb, adminLogArgs{
			ActorID:    me.ID,
			Action:     "badge.grant",
			TargetType: "badge",
			TargetID:   &body.BadgeID,
			Meta: map[string]any{
				"badgeName": badge.Name,
				"granted":   granted,
				"scope":     scope,
			},
		})
		httpx.OK(c, gin.H{
			"granted":   granted,
			"total":     len(userIDs),
			"badgeName": badge.Name,
		})
	}
}

// helpers

func parseTimeOrNil(s *string) *time.Time {
	if s == nil || *s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, *s)
	if err != nil {
		return nil
	}
	return &t
}
