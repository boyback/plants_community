package api

import (
	"encoding/json"
	"time"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DraftsHandler struct {
	DB *gorm.DB
}

func (h *DraftsHandler) Register(g *gin.RouterGroup) {
	g.GET("/drafts", middleware.RequireUser(), h.list)
	g.POST("/drafts", middleware.RequireUser(), h.save)
	g.DELETE("/drafts/:id", middleware.RequireUser(), h.del)
}

// GET /api/drafts
func (h *DraftsHandler) list(c *gin.Context) {
	me := middleware.MustUser(c)
	var rows []models.Draft
	h.DB.Where("userId = ?", me.ID).Order("updatedAt DESC").Limit(50).Find(&rows)

	out := make([]gin.H, 0, len(rows))
	for _, d := range rows {
		var payload any
		_ = json.Unmarshal([]byte(d.Payload), &payload)
		out = append(out, gin.H{
			"id":      d.ID,
			"title":   d.Title,
			"type":    d.Type,
			"savedAt": d.UpdatedAt.UTC().Format(time.RFC3339),
			"payload": payload,
		})
	}
	httpx.OK(c, out)
}

// POST /api/drafts
type saveDraftBody struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Type    string `json:"type" binding:"required"`
	Payload any    `json:"payload"`
}

func (h *DraftsHandler) save(c *gin.Context) {
	me := middleware.MustUser(c)
	var body saveDraftBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}
	payloadBytes, _ := json.Marshal(body.Payload)

	// 若带 id 且属于本人,执行 update
	if body.ID != "" {
		var existing models.Draft
		if err := h.DB.Where("id = ? AND userId = ?", body.ID, me.ID).First(&existing).Error; err == nil {
			h.DB.Model(&existing).Updates(map[string]any{
				"title":   body.Title,
				"type":    body.Type,
				"payload": string(payloadBytes),
			})
			var fresh models.Draft
			h.DB.Where("id = ?", existing.ID).First(&fresh)
			httpx.OK(c, gin.H{
				"id":      fresh.ID,
				"savedAt": fresh.UpdatedAt.UTC().Format(time.RFC3339),
			})
			return
		}
	}

	// 新建
	d := models.Draft{
		ID:        genCuid(),
		UserID:    me.ID,
		Title:     body.Title,
		Type:      body.Type,
		Payload:   string(payloadBytes),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if err := h.DB.Create(&d).Error; err != nil {
		httpx.Internal(c, err)
		return
	}
	httpx.OK(c, gin.H{
		"id":      d.ID,
		"savedAt": d.UpdatedAt.UTC().Format(time.RFC3339),
	})
}

// DELETE /api/drafts/:id
func (h *DraftsHandler) del(c *gin.Context) {
	me := middleware.MustUser(c)
	id := c.Param("id")
	var d models.Draft
	if err := h.DB.Where("id = ?", id).First(&d).Error; err != nil {
		httpx.NotFound(c, "草稿不存在")
		return
	}
	if d.UserID != me.ID {
		httpx.Forbidden(c, "无权删除")
		return
	}
	h.DB.Where("id = ?", id).Delete(&models.Draft{})
	httpx.OK(c, gin.H{"ok": true})
}
