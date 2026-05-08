package api

import (
	"math/rand"
	"net/http"

	"plants-community-server/internal/httpx"

	"github.com/gin-gonic/gin"
)

func httpSameSiteLax() http.SameSite { return http.SameSiteLaxMode }

// GenCUID 生成 24 字符 cuid-ish id(以 'c' 开头)。
func GenCUID() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 24)
	b[0] = 'c'
	for i := 1; i < len(b); i++ {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

// ServerError 500 通用响应(httpx 没单独提供,这里包一层)
func ServerError(c *gin.Context, err error) {
	httpx.Fail(c, http.StatusInternalServerError, err.Error())
}
