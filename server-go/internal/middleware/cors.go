package middleware

import (
	"plants-community-server/internal/config"

	"github.com/gin-gonic/gin"
)

// 允许 Next.js 前端以 credentials 模式跨域调用 Go 后端
func CORS(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		// 如果前端域名和 CORS_ORIGIN 匹配或未配置,放行
		if origin == cfg.CORSOrigin || cfg.CORSOrigin == "*" || origin == "" {
			if origin != "" {
				c.Header("Access-Control-Allow-Origin", origin)
			}
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers",
				"Content-Type, Authorization, X-Requested-With")
			c.Header("Access-Control-Allow-Methods",
				"GET, POST, PUT, PATCH, DELETE, OPTIONS")
		}
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
