package api

import (
	"time"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AddressesHandler struct {
	DB *gorm.DB
}

func (h *AddressesHandler) Register(g *gin.RouterGroup) {
	g.GET("/addresses", middleware.RequireUser(), h.list)
	g.POST("/addresses", middleware.RequireUser(), h.create)
	g.PATCH("/addresses/:id", middleware.RequireUser(), h.update)
	g.DELETE("/addresses/:id", middleware.RequireUser(), h.del)
}

// GET /api/addresses
func (h *AddressesHandler) list(c *gin.Context) {
	me := middleware.MustUser(c)
	var rows []models.Address
	h.DB.Where("userId = ?", me.ID).
		Order("isDefault DESC, updatedAt DESC").Find(&rows)
	out := make([]gin.H, 0, len(rows))
	for i := range rows {
		out = append(out, h.serialize(&rows[i]))
	}
	httpx.OK(c, out)
}

// POST /api/addresses
type addressBody struct {
	Name      string `json:"name" binding:"required,min=1,max=40"`
	Phone     string `json:"phone" binding:"required,min=1,max=20"`
	Province  string `json:"province"`
	City      string `json:"city"`
	District  string `json:"district"`
	Detail    string `json:"detail" binding:"required,min=2,max=200"`
	Zip       string `json:"zip"`
	Tag       string `json:"tag"`
	IsDefault bool   `json:"isDefault"`
}

func (h *AddressesHandler) create(c *gin.Context) {
	me := middleware.MustUser(c)
	var body addressBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	h.DB.Transaction(func(tx *gorm.DB) error {
		var count int64
		tx.Model(&models.Address{}).Where("userId = ?", me.ID).Count(&count)
		isDefault := body.IsDefault || count == 0
		if isDefault {
			tx.Model(&models.Address{}).
				Where("userId = ? AND isDefault = ?", me.ID, true).
				Update("isDefault", false)
		}
		addr := models.Address{
			ID: genCuid(), UserID: me.ID,
			Name: body.Name, Phone: body.Phone,
			Province: nullable(body.Province),
			City:     nullable(body.City), District: nullable(body.District),
			Detail:    body.Detail,
			Zip:       nullable(body.Zip), Tag: nullable(body.Tag),
			IsDefault: isDefault,
			CreatedAt: time.Now(), UpdatedAt: time.Now(),
		}
		if err := tx.Create(&addr).Error; err != nil {
			return err
		}
		httpx.OK(c, h.serialize(&addr))
		return nil
	})
}

// PATCH /api/addresses/:id
func (h *AddressesHandler) update(c *gin.Context) {
	me := middleware.MustUser(c)
	var addr models.Address
	if err := h.DB.Where("id = ? AND userId = ?", c.Param("id"), me.ID).First(&addr).Error; err != nil {
		httpx.NotFound(c, "地址不存在")
		return
	}
	var body addressBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}

	h.DB.Transaction(func(tx *gorm.DB) error {
		if body.IsDefault && !addr.IsDefault {
			tx.Model(&models.Address{}).
				Where("userId = ? AND isDefault = ?", me.ID, true).
				Update("isDefault", false)
		}
		tx.Model(&addr).Updates(map[string]any{
			"name": body.Name, "phone": body.Phone,
			"province": nullable(body.Province),
			"city":     nullable(body.City), "district": nullable(body.District),
			"detail": body.Detail,
			"zip":    nullable(body.Zip), "tag": nullable(body.Tag),
			"isDefault": body.IsDefault,
		})
		tx.Where("id = ?", addr.ID).First(&addr)
		httpx.OK(c, h.serialize(&addr))
		return nil
	})
}

// DELETE /api/addresses/:id
func (h *AddressesHandler) del(c *gin.Context) {
	me := middleware.MustUser(c)
	res := h.DB.Where("id = ? AND userId = ?", c.Param("id"), me.ID).Delete(&models.Address{})
	if res.RowsAffected == 0 {
		httpx.NotFound(c, "地址不存在")
		return
	}
	httpx.OK(c, gin.H{"ok": true})
}

func (h *AddressesHandler) serialize(a *models.Address) gin.H {
	return gin.H{
		"id": a.ID, "name": a.Name, "phone": a.Phone,
		"province": a.Province, "city": a.City, "district": a.District,
		"detail":    a.Detail,
		"zip":       a.Zip,
		"tag":       a.Tag,
		"isDefault": a.IsDefault,
		"createdAt": a.CreatedAt.UTC().Format(time.RFC3339),
	}
}
