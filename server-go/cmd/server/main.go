package main

import (
	"fmt"
	"log"

	"plants-community-server/internal/api"
	"plants-community-server/internal/config"
	"plants-community-server/internal/db"
	"plants-community-server/internal/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	gdb := db.MustOpen(cfg)

	// 发布模式下关闭 Gin 彩色日志
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(middleware.CORS(cfg))
	r.Use(middleware.Auth(cfg, gdb))

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true, "service": "plants-community-go"})
	})

	// 所有业务路由挂在 /api 下,保持与 Next.js 一致
	apiGroup := r.Group("/api")

	(&api.AuthHandler{DB: gdb, Cfg: cfg}).Register(apiGroup)
	(&api.UsersHandler{DB: gdb}).Register(apiGroup)
	(&api.BoardsHandler{DB: gdb}).Register(apiGroup)
	(&api.PostsHandler{DB: gdb}).Register(apiGroup)
	(&api.NotificationsHandler{DB: gdb}).Register(apiGroup)
	(&api.DraftsHandler{DB: gdb}).Register(apiGroup)
	(&api.UploadHandler{}).Register(apiGroup)
	// 第三期:交易 / 拍卖 / VIP / 地址簿
	(&api.MarketHandler{DB: gdb}).Register(apiGroup)
	(&api.OrdersHandler{DB: gdb}).Register(apiGroup)
	(&api.PaymentsHandler{DB: gdb}).Register(apiGroup)
	(&api.VipHandler{DB: gdb}).Register(apiGroup)
	(&api.AuctionsHandler{DB: gdb}).Register(apiGroup)
	(&api.AddressesHandler{DB: gdb}).Register(apiGroup)
	// 求助帖 + 节日主题
	(&api.HelpHandler{DB: gdb}).Register(apiGroup)
	(&api.ThemesHandler{DB: gdb}).Register(apiGroup)
	// Admin 后台
	(&api.AdminHandler{DB: gdb}).Register(apiGroup)
	// 推荐 Feed
	(&api.FeedHandler{DB: gdb}).Register(apiGroup)
	// 实时 SSE
	(&api.SSEHandler{}).Register(apiGroup)

	addr := ":" + cfg.Port
	fmt.Println("")
	fmt.Println("  🌵 Plants Community Go 后端")
	fmt.Println("  =================================")
	fmt.Println("  • 端口:", addr)
	fmt.Println("  • 数据库:", maskDSN(cfg.DatabaseURL))
	fmt.Println("  • CORS Origin:", cfg.CORSOrigin)
	fmt.Println("")
	fmt.Println("  API 路由(25 个):")
	for _, r := range r.Routes() {
		fmt.Printf("    %-6s %s\n", r.Method, r.Path)
	}
	fmt.Println("")
	log.Fatal(r.Run(addr))
}

func maskDSN(s string) string {
	// 遮蔽密码
	out := make([]byte, 0, len(s))
	inPass := false
	for i := 0; i < len(s); i++ {
		if s[i] == ':' && i+2 < len(s) && s[i+1] != '/' {
			// 可能在 user:pass@ 的密码起始
			inPass = true
			out = append(out, ':')
			continue
		}
		if inPass && s[i] == '@' {
			inPass = false
			out = append(out, "***@"...)
			continue
		}
		if !inPass {
			out = append(out, s[i])
		}
	}
	return string(out)
}
