package middleware

import (
	"errors"
	"time"

	"plants-community-server/internal/config"
	"plants-community-server/internal/httpx"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// 和 Next.js 的 src/lib/auth.ts 保持一致:
//   - HS256 签名
//   - payload 只有 { sub: userId }
//   - Cookie 名 rouyou_token(可配置)

const ctxUser = "authUser"

// ParseToken 校验 JWT 并返回 userId
func ParseToken(tokenStr, secret string) (string, error) {
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return "", err
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok || !tok.Valid {
		return "", errors.New("invalid token")
	}
	sub, ok := claims["sub"].(string)
	if !ok || sub == "" {
		return "", errors.New("no sub in token")
	}
	return sub, nil
}

// SignToken 产出 HS256 token,与 Next.js 的 signToken 逻辑一致
func SignToken(userID string, secret string, maxAgeSec int) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub": userID,
		"iat": now.Unix(),
		"exp": now.Add(time.Duration(maxAgeSec) * time.Second).Unix(),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString([]byte(secret))
}

// Auth 中间件:如果 cookie 有合法 token,则把 userId 放进 context;没有也不报错
// 后续需要鉴权的 handler 用 RequireUser 包裹。
func Auth(cfg *config.Config, gdb *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(cfg.CookieName)
		if err != nil || token == "" {
			c.Next()
			return
		}
		userID, err := ParseToken(token, cfg.JWTSecret)
		if err != nil {
			c.Next()
			return
		}
		var u models.User
		if err := gdb.Where("id = ?", userID).First(&u).Error; err != nil {
			c.Next()
			return
		}
		c.Set(ctxUser, &u)
		c.Next()
	}
}

// RequireUser 在需要登录的路由前加,如:router.POST("/x", RequireUser(), handler)
func RequireUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := c.Get(ctxUser); !ok {
			httpx.Unauthorized(c, "")
			return
		}
		c.Next()
	}
}

// MustUser 从 context 取已认证的用户,handler 里用;未登录时触发 panic 交给 recover
func MustUser(c *gin.Context) *models.User {
	v, ok := c.Get(ctxUser)
	if !ok {
		panic("MustUser called without RequireUser")
	}
	return v.(*models.User)
}

// OptionalUser 取可选登录的用户(可能为 nil)
func OptionalUser(c *gin.Context) *models.User {
	if v, ok := c.Get(ctxUser); ok {
		return v.(*models.User)
	}
	return nil
}

// RequireAdmin 仅 admin。
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		v, ok := c.Get(ctxUser)
		if !ok {
			httpx.Unauthorized(c, "")
			return
		}
		u := v.(*models.User)
		if !u.IsAdmin() {
			httpx.Forbidden(c, "需要管理员权限")
			return
		}
		c.Next()
	}
}

// RequireModerator admin 或 moderator 都可。
func RequireModerator() gin.HandlerFunc {
	return func(c *gin.Context) {
		v, ok := c.Get(ctxUser)
		if !ok {
			httpx.Unauthorized(c, "")
			return
		}
		u := v.(*models.User)
		if !u.IsModerator() {
			httpx.Forbidden(c, "需要版主权限")
			return
		}
		c.Next()
	}
}
