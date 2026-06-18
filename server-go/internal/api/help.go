package api

import (
	"fmt"
	"time"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// HelpHandler 处理求助帖专有的路由:采纳 / 标记已解决 / 列表筛选。
// 发帖本身由 PostsHandler.create 处理。
type HelpHandler struct {
	DB *gorm.DB
}

func (h *HelpHandler) Register(g *gin.RouterGroup) {
	// POST /api/posts/:id/accept  { commentId }
	g.POST("/posts/:id/accept", middleware.RequireUser(), h.accept)
}

type acceptBody struct {
	CommentID string `json:"commentId" binding:"required"`
}

// 采纳评论:只有帖子作者可采纳,帖子需为 help 类型且未解决;
// 将悬赏钻石转给被采纳评论的作者,标记 solved。
func (h *HelpHandler) accept(c *gin.Context) {
	me := middleware.MustUser(c)
	var body acceptBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}
	postID := c.Param("id")
	var post models.Post
	if err := h.DB.Where("id = ?", postID).First(&post).Error; err != nil {
		httpx.NotFound(c, "帖子不存在")
		return
	}
	if post.Type != "help" {
		httpx.BadRequest(c, "只有求助帖可以采纳回答")
		return
	}
	if post.AuthorID != me.ID {
		httpx.Forbidden(c, "只有帖子作者可以采纳")
		return
	}
	var hr models.HelpRequest
	if err := h.DB.Where("postId = ?", postID).First(&hr).Error; err != nil {
		httpx.NotFound(c, "求助帖扩展信息不存在")
		return
	}
	if hr.Solved {
		httpx.BadRequest(c, "该求助已经有采纳答案,不能重复采纳")
		return
	}

	var comment models.Comment
	if err := h.DB.Where("id = ? AND postId = ?", body.CommentID, postID).First(&comment).Error; err != nil {
		httpx.NotFound(c, "指定的评论不存在或不属于该帖")
		return
	}
	if comment.AuthorID == me.ID {
		httpx.BadRequest(c, "不能采纳自己的评论")
		return
	}

	// 事务:标记 HelpRequest solved,转移悬赏,发通知
	now := time.Now()
	h.DB.Transaction(func(tx *gorm.DB) error {
		tx.Model(&hr).Updates(map[string]any{
			"solved":            true,
			"acceptedCommentId": comment.ID,
			"solvedAt":          &now,
			"bountyPaidOut":     hr.BountyPoints > 0,
		})
		if hr.BountyPoints > 0 {
			addPoints(tx, comment.AuthorID, hr.BountyPoints, "admin",
				"help_bounty_reward", post.ID,
				fmt.Sprintf("被采纳为「%s」的答案,获得悬赏 %d 钻石", post.Title, hr.BountyPoints))
			tx.Create(&models.Notification{
				ID: genCuid(), RecipientID: comment.AuthorID,
				FromID: &me.ID, Type: "system",
				Text:      fmt.Sprintf("🏆 你的回答被采纳了!获得悬赏 %d 钻石", hr.BountyPoints),
				Link:      strPtr("/post/" + post.ID),
				CreatedAt: now,
			})
		} else {
			tx.Create(&models.Notification{
				ID: genCuid(), RecipientID: comment.AuthorID,
				FromID: &me.ID, Type: "system",
				Text:      "🏆 你的回答被采纳啦!",
				Link:      strPtr("/post/" + post.ID),
				CreatedAt: now,
			})
		}
		return nil
	})

	// 刷新后返回
	var fresh models.HelpRequest
	h.DB.Where("postId = ?", postID).First(&fresh)
	httpx.OK(c, gin.H{
		"solved":            fresh.Solved,
		"acceptedCommentId": fresh.AcceptedCommentID,
		"bountyPoints":      fresh.BountyPoints,
		"bountyPaidOut":     fresh.BountyPoints > 0,
	})
}
