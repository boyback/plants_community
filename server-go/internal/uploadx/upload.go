// Package uploadx 实现图片上传,对齐 Next.js src/lib/upload.ts:
//   - magic-byte 嗅探
//   - 白名单:jpg/png/webp/gif
//   - 5MB 限制
//   - 路径 public/uploads/{userId}/{yyyymm}/{cuid}.{ext}
package uploadx

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

const (
	MaxUploadSize = 5 * 1024 * 1024 // 5MB
)

// 和 Next.js 共享同一个 public/uploads 目录,避免重复
var RootDir = filepath.Join("..", "public", "uploads")

// 允许 Next.js 项目路径变化
func SetRootDir(dir string) { RootDir = dir }

// SniffImageMime 用 magic byte 判别真实 MIME 类型
func SniffImageMime(buf []byte) string {
	if len(buf) < 12 {
		return ""
	}
	// PNG
	if buf[0] == 0x89 && buf[1] == 0x50 && buf[2] == 0x4e && buf[3] == 0x47 {
		return "image/png"
	}
	// JPEG
	if buf[0] == 0xff && buf[1] == 0xd8 && buf[2] == 0xff {
		return "image/jpeg"
	}
	// GIF
	if buf[0] == 0x47 && buf[1] == 0x49 && buf[2] == 0x46 {
		return "image/gif"
	}
	// WEBP: RIFF....WEBP
	if buf[0] == 0x52 && buf[1] == 0x49 && buf[2] == 0x46 && buf[3] == 0x46 &&
		buf[8] == 0x57 && buf[9] == 0x45 && buf[10] == 0x42 && buf[11] == 0x50 {
		return "image/webp"
	}
	return ""
}

func ExtForMime(mime string) string {
	switch mime {
	case "image/png":
		return "png"
	case "image/jpeg":
		return "jpg"
	case "image/gif":
		return "gif"
	case "image/webp":
		return "webp"
	}
	return "bin"
}

// PutResult 是上传成功后返回的数据
type PutResult struct {
	URL  string
	Key  string
	Size int64
	Mime string
}

// Put 把字节流写到 uploads 目录,返回可被前端 <img src> 直接使用的路径
func Put(userID string, buf []byte) (*PutResult, error) {
	if int64(len(buf)) > MaxUploadSize {
		return nil, fmt.Errorf("文件过大,最大允许 %d MB", MaxUploadSize/1024/1024)
	}
	mime := SniffImageMime(buf)
	if mime == "" {
		return nil, errors.New("仅支持 jpg / png / webp / gif 图片")
	}
	ext := ExtForMime(mime)

	now := time.Now()
	yyyymm := now.Format("200601")
	id := cuidLike()

	key := fmt.Sprintf("%s/%s/%s.%s", userID, yyyymm, id, ext)
	full := filepath.Join(RootDir, key)

	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return nil, err
	}
	if err := os.WriteFile(full, buf, 0o644); err != nil {
		return nil, err
	}

	return &PutResult{
		URL:  "/uploads/" + key,
		Key:  key,
		Size: int64(len(buf)),
		Mime: mime,
	}, nil
}

func cuidLike() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	// base36-ish 后缀,够唯一
	return fmt.Sprintf("%x%s", time.Now().UnixNano(), hex.EncodeToString(b)[:6])
}
