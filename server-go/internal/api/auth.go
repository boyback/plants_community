package api

import (
	"math/rand"
	"strings"
	"time"

	"plants-community-server/internal/config"
	"plants-community-server/internal/httpx"
	"plants-community-server/internal/levels"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	DB  *gorm.DB
	Cfg *config.Config
}

func (h *AuthHandler) Register(g *gin.RouterGroup) {
	g.POST("/auth/register", h.register)
	g.POST("/auth/login", h.login)
	g.POST("/auth/logout", h.logout)
	g.GET("/auth/me", h.me)
	g.POST("/auth/signin", middleware.RequireUser(), h.signin)
}

// -------------------- register --------------------

type registerBody struct {
	Name     string `json:"name" binding:"required,min=2,max=24"`
	Password string `json:"password" binding:"required,min=6,max=64"`
}

var defaultAvatars = []string{
	"https://i.pravatar.cc/150?img=5",
	"https://i.pravatar.cc/150?img=12",
	"https://i.pravatar.cc/150?img=23",
	"https://i.pravatar.cc/150?img=32",
	"https://i.pravatar.cc/150?img=44",
	"https://i.pravatar.cc/150?img=47",
	"https://i.pravatar.cc/150?img=68",
}

func (h *AuthHandler) register(c *gin.Context) {
	var body registerBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}
	body.Name = strings.TrimSpace(body.Name)

	var existing models.User
	if err := h.DB.Where("name = ?", body.Name).First(&existing).Error; err == nil {
		httpx.Fail(c, 409, "用户名已被占用")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), 10)
	if err != nil {
		httpx.Internal(c, err)
		return
	}
	bio := "新加入的肉友 🌱"
	u := models.User{
		ID:                   genCuid(),
		Name:                 body.Name,
		PasswordHash:         string(hash),
		Avatar:               defaultAvatars[rand.Intn(len(defaultAvatars))],
		Bio:                  &bio,
		Level:                1,
		JoinedAt:             time.Now(),
		UpdatedAt:            time.Now(),
		PrivacyShowFollowing: true,
		PrivacyShowFollowers: true,
	}
	if err := h.DB.Create(&u).Error; err != nil {
		httpx.Internal(c, err)
		return
	}

	h.setAuthCookie(c, u.ID)

	_, counts, badges, _ := httpx.LoadUserAggregate(h.DB, u.ID)
	httpx.OK(c, httpx.SerializeUser(&u, counts, badges))
}

// -------------------- login --------------------

type loginBody struct {
	Name     string `json:"name" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) login(c *gin.Context) {
	var body loginBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}
	var u models.User
	if err := h.DB.Where("name = ?", body.Name).First(&u).Error; err != nil {
		httpx.Unauthorized(c, "用户名或密码错误")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(body.Password)); err != nil {
		httpx.Unauthorized(c, "用户名或密码错误")
		return
	}
	h.setAuthCookie(c, u.ID)
	_, counts, badges, _ := httpx.LoadUserAggregate(h.DB, u.ID)
	httpx.OK(c, httpx.SerializeUser(&u, counts, badges))
}

// -------------------- logout --------------------

func (h *AuthHandler) logout(c *gin.Context) {
	c.SetCookie(h.Cfg.CookieName, "", -1, "/", "", false, true)
	httpx.OK(c, gin.H{"ok": true})
}

// -------------------- me --------------------

// /api/auth/me 返回扩展信息:User + signInStreak + signedInToday + exp + pointsBalance + vip + privacy + equip
func (h *AuthHandler) me(c *gin.Context) {
	u := middleware.OptionalUser(c)
	if u == nil {
		httpx.OK(c, nil)
		return
	}
	_, counts, badges, _ := httpx.LoadUserAggregate(h.DB, u.ID)
	dto := httpx.SerializeUser(u, counts, badges)

	today := time.Now()
	signed := u.LastSignInAt != nil &&
		u.LastSignInAt.Year() == today.Year() &&
		u.LastSignInAt.YearDay() == today.YearDay()

	isVip := u.VipLifetime ||
		(u.VipExpireAt != nil && u.VipExpireAt.After(time.Now()))

	resp := gin.H{
		"user":          dto,
		"signInStreak":  u.SignInStreak,
		"signedInToday": signed,
		"exp":           u.Exp,
		"expProgress":   levels.ExpProgress(u.Exp),
		"pointsBalance": u.PointsBalance,
		"vip": gin.H{
			"isVip":    isVip,
			"lifetime": u.VipLifetime,
			"expireAt": isoOrNil(u.VipExpireAt),
		},
		"privacy": gin.H{
			"showFollowing": u.PrivacyShowFollowing,
			"showFollowers": u.PrivacyShowFollowers,
		},
	}
	httpx.OK(c, resp)
}

func isoOrNil(t *time.Time) any {
	if t == nil {
		return nil
	}
	return t.UTC().Format(time.RFC3339)
}

// -------------------- signin(每日签到) --------------------

func (h *AuthHandler) signin(c *gin.Context) {
	u := middleware.MustUser(c)
	now := time.Now()

	isSameDay := func(a, b time.Time) bool {
		return a.Year() == b.Year() && a.YearDay() == b.YearDay()
	}
	isYesterday := func(prev, today time.Time) bool {
		y := today.AddDate(0, 0, -1)
		return isSameDay(prev, y)
	}

	streak := u.SignInStreak
	already := false
	if u.LastSignInAt != nil && isSameDay(*u.LastSignInAt, now) {
		already = true
	} else if u.LastSignInAt != nil && isYesterday(*u.LastSignInAt, now) {
		streak = streak + 1
	} else {
		streak = 1
	}

	if !already {
		h.DB.Model(&models.User{}).
			Where("id = ?", u.ID).
			Updates(map[string]any{
				"lastSignInAt": now,
				"signInStreak": streak,
				"pointsBalance": gorm.Expr("pointsBalance + ?", 5),
				"exp":           gorm.Expr("exp + ?", 5),
			})
	}

	httpx.OK(c, gin.H{
		"signInStreak":  streak,
		"signedInToday": true,
		"alreadySigned": already,
	})
}

// -------------------- helpers --------------------

func (h *AuthHandler) setAuthCookie(c *gin.Context, userID string) {
	tok, err := middleware.SignToken(userID, h.Cfg.JWTSecret, h.Cfg.CookieMaxAge)
	if err != nil {
		return
	}
	// domain 留空 = 当前域;SameSite=Lax;仅 prod 开 Secure
	c.SetSameSite(httpSameSiteLax())
	c.SetCookie(h.Cfg.CookieName, tok, h.Cfg.CookieMaxAge, "/", "", false, true)
}

// cuid-ish:简短随机 id(不严格符合 cuid 规范,但够唯一)
func genCuid() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 24)
	b[0] = 'c' // 使 id 看起来像 cuid
	for i := 1; i < len(b); i++ {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}
