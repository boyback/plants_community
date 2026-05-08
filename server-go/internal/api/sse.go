package api

import (
	"io"
	"time"

	"plants-community-server/internal/middleware"
	"plants-community-server/internal/realtime"

	"github.com/gin-gonic/gin"
)

// SSEHandler 提供 /api/sse/connect
type SSEHandler struct{}

func (h *SSEHandler) Register(g *gin.RouterGroup) {
	g.GET("/sse/connect", middleware.RequireUser(), h.Connect)
}

// Connect 长连接(必须登录)
//
//	GET /api/sse/connect
//
// 心跳:每 30s 发一条 ping;客户端 EventSource 自动重连。
func (h *SSEHandler) Connect(c *gin.Context) {
	me := middleware.MustUser(c)

	c.Writer.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	c.Writer.Header().Set("Cache-Control", "no-cache, no-transform")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	bus := realtime.Default()
	ch, unsubscribe := bus.Subscribe(me.ID)
	defer unsubscribe()

	// 立即回 ready
	io.WriteString(c.Writer, `event: ready
data: {"userId":"`+me.ID+`","at":`+itoaInt64(time.Now().UnixMilli())+`}

`)
	c.Writer.Flush()

	heartbeat := time.NewTicker(30 * time.Second)
	defer heartbeat.Stop()

	closeNotify := c.Request.Context().Done()
	for {
		select {
		case <-closeNotify:
			return
		case <-heartbeat.C:
			io.WriteString(c.Writer, `event: ping
data: {"at":`+itoaInt64(time.Now().UnixMilli())+`}

`)
			c.Writer.Flush()
		case payload, ok := <-ch:
			if !ok {
				return
			}
			c.Writer.Write(payload)
			c.Writer.Flush()
		}
	}
}

func itoaInt64(n int64) string {
	// 避免 import strconv,重复用 strconv.FormatInt 也行
	const digits = "0123456789"
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	buf := make([]byte, 20)
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = digits[n%10]
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
