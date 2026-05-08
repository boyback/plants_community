package api

import (
	"io"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/uploadx"

	"github.com/gin-gonic/gin"
)

type UploadHandler struct{}

func (h *UploadHandler) Register(g *gin.RouterGroup) {
	g.POST("/upload", middleware.RequireUser(), h.upload)
}

// POST /api/upload
// multipart field 'file'
func (h *UploadHandler) upload(c *gin.Context) {
	me := middleware.MustUser(c)

	fh, err := c.FormFile("file")
	if err != nil {
		httpx.BadRequest(c, "缺少 file 字段")
		return
	}
	if fh.Size > uploadx.MaxUploadSize {
		httpx.BadRequest(c, "文件过大,最大允许 5 MB")
		return
	}
	// 打开 file 读取字节
	f, err := fh.Open()
	if err != nil {
		httpx.Internal(c, err)
		return
	}
	defer f.Close()
	buf, err := io.ReadAll(f)
	if err != nil {
		httpx.Internal(c, err)
		return
	}

	res, err := uploadx.Put(me.ID, buf)
	if err != nil {
		httpx.BadRequest(c, err.Error())
		return
	}
	httpx.OK(c, gin.H{
		"url":  res.URL,
		"key":  res.Key,
		"mime": res.Mime,
		"size": res.Size,
	})
}
