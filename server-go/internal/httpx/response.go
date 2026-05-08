package httpx

import "github.com/gin-gonic/gin"

// 统一与 Next.js 后端一致的响应格式:
//   成功:{ "ok": true, "data": ... }
//   失败:{ "ok": false, "error": { "message": "...", "detail": ... } }

func OK(c *gin.Context, data any) {
	c.JSON(200, gin.H{"ok": true, "data": data})
}

func Fail(c *gin.Context, status int, msg string, detail ...any) {
	err := gin.H{"message": msg}
	if len(detail) > 0 {
		err["detail"] = detail[0]
	}
	c.AbortWithStatusJSON(status, gin.H{"ok": false, "error": err})
}

func BadRequest(c *gin.Context, msg string) { Fail(c, 400, msg) }
func Unauthorized(c *gin.Context, msg string) {
	if msg == "" {
		msg = "请先登录"
	}
	Fail(c, 401, msg)
}
func Forbidden(c *gin.Context, msg string) { Fail(c, 403, msg) }
func NotFound(c *gin.Context, msg string)  { Fail(c, 404, msg) }
func Internal(c *gin.Context, err error) {
	Fail(c, 500, "服务器内部错误", err.Error())
}
