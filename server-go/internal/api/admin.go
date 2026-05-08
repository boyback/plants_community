package api

import (
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AdminHandler 后台管理路由
type AdminHandler struct {
	DB *gorm.DB
}

func (h *AdminHandler) Register(g *gin.RouterGroup) {
	a := g.Group("/admin")
	a.Use(middleware.RequireUser())
	// 帖子审核(允许版主)
	a.GET("/posts", middleware.RequireModerator(), AdminListPosts(h.DB))
	a.DELETE("/posts/:id", middleware.RequireModerator(), AdminDeletePost(h.DB))
	a.POST("/posts/:id/restore", middleware.RequireModerator(), AdminRestorePost(h.DB))
	// 举报处理(允许版主)
	a.PATCH("/reports/:id", middleware.RequireModerator(), AdminPatchReport(h.DB))
	// 用户管理(仅 admin)
	a.PATCH("/users/:id", middleware.RequireAdmin(), AdminPatchUser(h.DB))
	// 公告 CRUD(仅 admin)
	a.GET("/announcements", middleware.RequireAdmin(), AdminListAnnouncements(h.DB))
	a.POST("/announcements", middleware.RequireAdmin(), AdminCreateAnnouncement(h.DB))
	a.PATCH("/announcements/:id", middleware.RequireAdmin(), AdminPatchAnnouncement(h.DB))
	a.DELETE("/announcements/:id", middleware.RequireAdmin(), AdminDeleteAnnouncement(h.DB))
	// 商品 / 订单 / 拍卖管理(仅 admin)
	a.PATCH("/products/:id", middleware.RequireAdmin(), AdminPatchProduct(h.DB))
	a.PATCH("/orders/:id", middleware.RequireAdmin(), AdminPatchOrder(h.DB))
	a.PATCH("/auctions/:id", middleware.RequireAdmin(), AdminPatchAuction(h.DB))
	// 板块切换 + 任务调整(仅 admin)
	a.PATCH("/boards/:type/:id", middleware.RequireAdmin(), AdminPatchBoard(h.DB))
	a.PATCH("/tasks/:id", middleware.RequireAdmin(), AdminPatchTask(h.DB))
	// 徽章发放
	a.POST("/badges/grant", middleware.RequireAdmin(), AdminGrantBadge(h.DB))
}

// =========================================================
// 操作日志(供其他 admin handler 调用)
// =========================================================

type adminLogArgs struct {
	ActorID    string
	Action     string
	TargetType string
	TargetID   *string
	Reason     *string
	Meta       any
}

// LogAdmin 写入 admin_logs 表。失败不会中断主流程,只打 log。
func LogAdmin(gdb *gorm.DB, a adminLogArgs) {
	var metaStr *string
	if a.Meta != nil {
		if b, err := json.Marshal(a.Meta); err == nil {
			s := string(b)
			metaStr = &s
		}
	}
	row := models.AdminLog{
		ID:         GenCUID(),
		ActorID:    a.ActorID,
		Action:     a.Action,
		TargetType: a.TargetType,
		TargetID:   a.TargetID,
		Meta:       metaStr,
		Reason:     a.Reason,
		CreatedAt:  time.Now(),
	}
	_ = gdb.Create(&row).Error
}

// =========================================================
// GET /api/admin/posts
// =========================================================

func AdminListPosts(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		q := c.Query("q")
		ptype := c.Query("type")
		status := c.DefaultQuery("status", "active") // active | deleted | all
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		if page < 1 {
			page = 1
		}
		size, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
		if size < 1 || size > 100 {
			size = 20
		}

		tx := gdb.Model(&models.Post{})
		switch status {
		case "deleted":
			tx = tx.Where("deleted = ?", true)
		case "active":
			tx = tx.Where("deleted = ?", false)
		}
		if ptype != "" {
			tx = tx.Where("type = ?", ptype)
		}
		if q != "" {
			like := "%" + q + "%"
			tx = tx.Where("title LIKE ? OR contentText LIKE ?", like, like)
		}

		var total int64
		if err := tx.Count(&total).Error; err != nil {
			ServerError(c, err)
			return
		}
		var items []models.Post
		if err := tx.Order("createdAt desc").Offset((page - 1) * size).Limit(size).
			Preload("Author").Find(&items).Error; err != nil {
			ServerError(c, err)
			return
		}
		httpx.OK(c, gin.H{
			"items":    items,
			"total":    total,
			"page":     page,
			"pageSize": size,
		})
	}
}

// =========================================================
// DELETE /api/admin/posts/:id?reason=xxx   软删
// =========================================================

func AdminDeletePost(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		id := c.Param("id")
		reason := c.Query("reason")
		var p models.Post
		if err := gdb.First(&p, "id = ?", id).Error; err != nil {
			httpx.NotFound(c, "帖子不存在")
			return
		}
		now := time.Now()
		err := gdb.Model(&p).Updates(map[string]any{
			"deleted":      true,
			"deletedAt":    now,
			"deletedBy":    me.ID,
			"deleteReason": reason,
		}).Error
		if err != nil {
			ServerError(c, err)
			return
		}
		LogAdmin(gdb, adminLogArgs{
			ActorID:    me.ID,
			Action:     "post.delete",
			TargetType: "post",
			TargetID:   &id,
			Reason:     ptrIfNotEmpty(reason),
		})
		httpx.OK(c, gin.H{"ok": true})
	}
}

// =========================================================
// POST /api/admin/posts/:id/restore
// =========================================================

func AdminRestorePost(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		id := c.Param("id")
		var p models.Post
		if err := gdb.First(&p, "id = ?", id).Error; err != nil {
			httpx.NotFound(c, "帖子不存在")
			return
		}
		err := gdb.Model(&p).Updates(map[string]any{
			"deleted":      false,
			"deletedAt":    nil,
			"deletedBy":    nil,
			"deleteReason": nil,
		}).Error
		if err != nil {
			ServerError(c, err)
			return
		}
		LogAdmin(gdb, adminLogArgs{
			ActorID:    me.ID,
			Action:     "post.restore",
			TargetType: "post",
			TargetID:   &id,
		})
		httpx.OK(c, gin.H{"ok": true})
	}
}

// =========================================================
// PATCH /api/admin/reports/:id   { status, note? }
// =========================================================

type reportPatchBody struct {
	Status string  `json:"status" binding:"required,oneof=resolved rejected"`
	Note   *string `json:"note,omitempty"`
}

func AdminPatchReport(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		id := c.Param("id")
		var body reportPatchBody
		if err := c.ShouldBindJSON(&body); err != nil {
			httpx.BadRequest(c, err.Error())
			return
		}
		var r models.Report
		if err := gdb.First(&r, "id = ?", id).Error; err != nil {
			httpx.NotFound(c, "举报不存在")
			return
		}
		now := time.Now()
		updates := map[string]any{
			"status":     body.Status,
			"handledBy":  me.ID,
			"handledAt":  &now,
			"handleNote": body.Note,
		}
		if err := gdb.Model(&r).Updates(updates).Error; err != nil {
			ServerError(c, err)
			return
		}
		LogAdmin(gdb, adminLogArgs{
			ActorID:    me.ID,
			Action:     "report." + body.Status,
			TargetType: "report",
			TargetID:   &id,
			Reason:     body.Note,
			Meta:       map[string]string{"targetType": r.TargetType, "targetId": r.TargetID},
		})
		httpx.OK(c, gin.H{"ok": true})
	}
}

// =========================================================
// PATCH /api/admin/users/:id
//   - { role: ... }                   改角色
//   - { ban: { days, reason? } }      封禁
//   - { unban: true }                 解封
//   - { pointsDelta, reason? }        加/减积分
// =========================================================

type userPatchBan struct {
	Days   int     `json:"days" binding:"min=0,max=3650"`
	Reason *string `json:"reason,omitempty"`
}
type userPatchBody struct {
	Role         *string       `json:"role,omitempty" binding:"omitempty,oneof=user moderator admin"`
	Ban          *userPatchBan `json:"ban,omitempty"`
	Unban        bool          `json:"unban,omitempty"`
	PointsDelta  *int          `json:"pointsDelta,omitempty"`
	Reason       *string       `json:"reason,omitempty"`
}

func AdminPatchUser(gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		me := middleware.MustUser(c)
		id := c.Param("id")
		var body userPatchBody
		if err := c.ShouldBindJSON(&body); err != nil {
			httpx.BadRequest(c, err.Error())
			return
		}
		if body.Role == nil && body.Ban == nil && !body.Unban && body.PointsDelta == nil {
			httpx.BadRequest(c, "必须指定至少一个操作")
			return
		}
		var target models.User
		if err := gdb.First(&target, "id = ?", id).Error; err != nil {
			httpx.NotFound(c, "用户不存在")
			return
		}
		if target.ID == me.ID && (body.Role != nil || body.Ban != nil) {
			httpx.BadRequest(c, "不能对自己执行该操作")
			return
		}

		updates := map[string]any{}
		if body.Role != nil {
			updates["role"] = *body.Role
		}
		if body.Ban != nil {
			var until time.Time
			if body.Ban.Days == 0 {
				until = time.Now().AddDate(100, 0, 0)
			} else {
				until = time.Now().AddDate(0, 0, body.Ban.Days)
			}
			updates["bannedUntil"] = until
			r := ""
			if body.Ban.Reason != nil {
				r = *body.Ban.Reason
			}
			updates["banReason"] = r
		}
		if body.Unban {
			updates["bannedUntil"] = nil
			updates["banReason"] = nil
		}
		if body.PointsDelta != nil {
			err := gdb.Transaction(func(tx *gorm.DB) error {
				if err := tx.Model(&target).Update("pointsBalance", gorm.Expr("pointsBalance + ?", *body.PointsDelta)).Error; err != nil {
					return err
				}
				remark := "管理员调整"
				if body.Reason != nil {
					remark = *body.Reason
				}
				ledger := models.PointsLedger{
					ID:        GenCUID(),
					UserID:    target.ID,
					Type:      "admin",
					Delta:     *body.PointsDelta,
					Balance:   target.PointsBalance + *body.PointsDelta,
					Remark:    &remark,
					CreatedAt: time.Now(),
				}
				return tx.Create(&ledger).Error
			})
			if err != nil {
				ServerError(c, err)
				return
			}
			LogAdmin(gdb, adminLogArgs{
				ActorID:    me.ID,
				Action:     "user.pointsAdjust",
				TargetType: "user",
				TargetID:   &id,
				Reason:     body.Reason,
				Meta:       map[string]int{"delta": *body.PointsDelta},
			})
		}

		if len(updates) > 0 {
			if err := gdb.Model(&target).Updates(updates).Error; err != nil {
				ServerError(c, err)
				return
			}
		}

		if body.Role != nil {
			LogAdmin(gdb, adminLogArgs{
				ActorID:    me.ID,
				Action:     "user.setRole",
				TargetType: "user",
				TargetID:   &id,
				Meta:       map[string]string{"role": *body.Role},
			})
		}
		if body.Ban != nil {
			LogAdmin(gdb, adminLogArgs{
				ActorID:    me.ID,
				Action:     "user.ban",
				TargetType: "user",
				TargetID:   &id,
				Reason:     body.Ban.Reason,
				Meta:       map[string]int{"days": body.Ban.Days},
			})
		}
		if body.Unban {
			LogAdmin(gdb, adminLogArgs{
				ActorID:    me.ID,
				Action:     "user.unban",
				TargetType: "user",
				TargetID:   &id,
			})
		}

		httpx.OK(c, gin.H{"ok": true})
	}
}

// helpers

func ptrIfNotEmpty(s string) *string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return &s
}
