package api

import (
	"time"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type NotificationsHandler struct {
	DB *gorm.DB
}

func (h *NotificationsHandler) Register(g *gin.RouterGroup) {
	g.GET("/notifications", middleware.RequireUser(), h.list)
	g.POST("/notifications/read", middleware.RequireUser(), h.markRead)
}

// GET /api/notifications
func (h *NotificationsHandler) list(c *gin.Context) {
	me := middleware.MustUser(c)
	var rows []models.Notification
	h.DB.Preload("From").
		Where("recipientId = ?", me.ID).
		Order("createdAt DESC").
		Limit(100).Find(&rows)

	items := make([]gin.H, 0, len(rows))
	for i := range rows {
		n := &rows[i]
		var fromUser any = nil
		if n.From != nil {
			counts := httpx.LoadUserCounts(h.DB, n.From.ID)
			badges := httpx.LoadUserBadges(h.DB, n.From.ID)
			fromUser = httpx.SerializeUser(n.From, counts, badges)
		}
		items = append(items, gin.H{
			"id":        n.ID,
			"type":      n.Type,
			"fromUser":  fromUser,
			"text":      n.Text,
			"link":      n.Link,
			"createdAt": n.CreatedAt.UTC().Format(time.RFC3339),
			"read":      n.Read,
		})
	}
	unread := httpx.CountInt(h.DB, "notifications",
		"recipientId = ? AND `read` = ?", me.ID, false)
	httpx.OK(c, gin.H{"items": items, "unread": unread})
}

// POST /api/notifications/read
type readBody struct {
	IDs []string `json:"ids"`
	All bool     `json:"all"`
}

func (h *NotificationsHandler) markRead(c *gin.Context) {
	me := middleware.MustUser(c)
	var body readBody
	_ = c.ShouldBindJSON(&body) // allow empty body

	q := h.DB.Model(&models.Notification{}).Where("recipientId = ?", me.ID)
	if body.All || len(body.IDs) == 0 {
		q.Where("`read` = ?", false).Update("read", true)
	} else {
		q.Where("id IN ?", body.IDs).Update("read", true)
	}

	unread := httpx.CountInt(h.DB, "notifications",
		"recipientId = ? AND `read` = ?", me.ID, false)
	httpx.OK(c, gin.H{"unread": unread})
}
