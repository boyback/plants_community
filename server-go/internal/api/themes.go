package api

import (
	"encoding/json"
	"time"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"
	"plants-community-server/internal/themes"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ThemesHandler struct {
	DB *gorm.DB
}

func (h *ThemesHandler) Register(g *gin.RouterGroup) {
	g.GET("/themes/active", h.active)
	g.GET("/themes/calendar", h.calendar)
	g.GET("/themes/preferences", middleware.RequireUser(), h.getPrefs)
	g.PATCH("/themes/preferences", middleware.RequireUser(), h.updatePrefs)
}

// GET /api/themes/active
// 默认按当前服务器时间;可传 ?at=ISO8601 做预览
// 登录用户:已关闭的主题会从结果里过滤掉
func (h *ThemesHandler) active(c *gin.Context) {
	t := time.Now()
	if s := c.Query("at"); s != "" {
		if parsed, err := time.Parse(time.RFC3339, s); err == nil {
			t = parsed
		}
	}
	all := themes.ActiveAt(t)

	// 结合用户偏好过滤
	me := middleware.OptionalUser(c)
	disabled := map[string]bool{}
	globalOff := false
	if me != nil {
		globalOff = me.ThemesDisabled
		if me.DisabledThemes != "" {
			var arr []string
			_ = json.Unmarshal([]byte(me.DisabledThemes), &arr)
			for _, s := range arr {
				disabled[s] = true
			}
		}
	}

	if globalOff {
		httpx.OK(c, gin.H{"themes": []any{}, "globalDisabled": true})
		return
	}
	filtered := make([]*themes.Theme, 0, len(all))
	for _, th := range all {
		if !disabled[th.Slug] {
			filtered = append(filtered, th)
		}
	}
	httpx.OK(c, gin.H{
		"themes":         filtered,
		"at":             t.UTC().Format(time.RFC3339),
		"globalDisabled": false,
	})
}

// GET /api/themes/calendar  — 全年主题时间表
func (h *ThemesHandler) calendar(c *gin.Context) {
	httpx.OK(c, themes.Calendar())
}

// GET /api/themes/preferences
func (h *ThemesHandler) getPrefs(c *gin.Context) {
	me := middleware.MustUser(c)
	var disabled []string
	if me.DisabledThemes != "" {
		_ = json.Unmarshal([]byte(me.DisabledThemes), &disabled)
	}
	if disabled == nil {
		disabled = []string{}
	}
	httpx.OK(c, gin.H{
		"globalDisabled": me.ThemesDisabled,
		"disabledSlugs":  disabled,
	})
}

type updateThemesBody struct {
	GlobalDisabled *bool     `json:"globalDisabled"`
	DisabledSlugs  *[]string `json:"disabledSlugs"`
}

// PATCH /api/themes/preferences
func (h *ThemesHandler) updatePrefs(c *gin.Context) {
	me := middleware.MustUser(c)
	var body updateThemesBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}
	updates := map[string]any{}
	if body.GlobalDisabled != nil {
		updates["themesDisabled"] = *body.GlobalDisabled
	}
	if body.DisabledSlugs != nil {
		// 校验 slug 是否合法
		valid := map[string]bool{}
		for _, th := range themes.Registry {
			valid[th.Slug] = true
		}
		cleaned := []string{}
		for _, s := range *body.DisabledSlugs {
			if valid[s] {
				cleaned = append(cleaned, s)
			}
		}
		b, _ := json.Marshal(cleaned)
		updates["disabledThemes"] = string(b)
	}
	if len(updates) > 0 {
		h.DB.Model(&models.User{}).Where("id = ?", me.ID).Updates(updates)
	}

	// 返回新状态
	var u models.User
	h.DB.Where("id = ?", me.ID).First(&u)
	var disabled []string
	if u.DisabledThemes != "" {
		_ = json.Unmarshal([]byte(u.DisabledThemes), &disabled)
	}
	if disabled == nil {
		disabled = []string{}
	}
	httpx.OK(c, gin.H{
		"globalDisabled": u.ThemesDisabled,
		"disabledSlugs":  disabled,
	})
}
