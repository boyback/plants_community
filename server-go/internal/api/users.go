package api

import (
	"strconv"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UsersHandler struct {
	DB *gorm.DB
}

func (h *UsersHandler) Register(g *gin.RouterGroup) {
	g.GET("/users", h.list)
	g.GET("/users/:id", h.detail)
	g.POST("/users/:id/follow", middleware.RequireUser(), h.follow)
	g.GET("/users/:id/following", h.following)
	g.GET("/users/:id/followers", h.followers)
	g.GET("/users/me/privacy", middleware.RequireUser(), h.getPrivacy)
	g.PATCH("/users/me/privacy", middleware.RequireUser(), h.setPrivacy)
}

// GET /api/users?limit=5
func (h *UsersHandler) list(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))
	if limit > 50 {
		limit = 50
	}
	me := middleware.OptionalUser(c)
	q := h.DB.Model(&models.User{}).
		Order("updatedAt DESC").
		Limit(limit)
	if me != nil {
		q = q.Where("id != ?", me.ID)
	}
	var users []models.User
	q.Find(&users)

	result := make([]httpx.UserDTO, 0, len(users))
	for i := range users {
		u := &users[i]
		counts := httpx.LoadUserCounts(h.DB, u.ID)
		badges := httpx.LoadUserBadges(h.DB, u.ID)
		result = append(result, httpx.SerializeUser(u, counts, badges))
	}
	httpx.OK(c, result)
}

// GET /api/users/:id
func (h *UsersHandler) detail(c *gin.Context) {
	id := c.Param("id")
	u, counts, badges, err := httpx.LoadUserAggregate(h.DB, id)
	if err != nil {
		httpx.NotFound(c, "用户不存在")
		return
	}
	httpx.OK(c, httpx.SerializeUser(u, counts, badges))
}

// POST /api/users/:id/follow
func (h *UsersHandler) follow(c *gin.Context) {
	me := middleware.MustUser(c)
	target := c.Param("id")
	if target == me.ID {
		httpx.BadRequest(c, "不能关注自己")
		return
	}
	var other models.User
	if err := h.DB.Where("id = ?", target).First(&other).Error; err != nil {
		httpx.NotFound(c, "用户不存在")
		return
	}

	var exist models.Follow
	err := h.DB.Where("followerId = ? AND followeeId = ?", me.ID, target).First(&exist).Error
	if err == nil {
		// 取消关注
		h.DB.Where("followerId = ? AND followeeId = ?", me.ID, target).Delete(&models.Follow{})
		followers := httpx.CountInt(h.DB, "follows", "followeeId = ?", target)
		httpx.OK(c, gin.H{"followed": false, "followers": followers})
		return
	}
	// 关注
	h.DB.Create(&models.Follow{
		FollowerID: me.ID,
		FolloweeID: target,
	})
	followers := httpx.CountInt(h.DB, "follows", "followeeId = ?", target)
	httpx.OK(c, gin.H{"followed": true, "followers": followers})
}

// GET /api/users/:id/following
func (h *UsersHandler) following(c *gin.Context) {
	id := c.Param("id")
	var target models.User
	if err := h.DB.Where("id = ?", id).First(&target).Error; err != nil {
		httpx.NotFound(c, "用户不存在")
		return
	}
	me := middleware.OptionalUser(c)
	isMe := me != nil && me.ID == target.ID
	if !target.PrivacyShowFollowing && !isMe {
		httpx.Forbidden(c, target.Name+" 设置了「隐藏关注列表」")
		return
	}
	// 关注的人列表
	var follows []models.Follow
	h.DB.Where("followerId = ?", target.ID).
		Order("createdAt DESC").Limit(200).Find(&follows)
	targetIds := make([]string, len(follows))
	for i, f := range follows {
		targetIds[i] = f.FolloweeID
	}

	users := make([]httpx.UserDTO, 0, len(targetIds))
	if len(targetIds) > 0 {
		var rows []models.User
		h.DB.Where("id IN ?", targetIds).Find(&rows)
		// 按 createdAt 顺序还原
		byID := make(map[string]*models.User)
		for i := range rows {
			byID[rows[i].ID] = &rows[i]
		}
		for _, tid := range targetIds {
			u := byID[tid]
			if u == nil {
				continue
			}
			counts := httpx.LoadUserCounts(h.DB, u.ID)
			badges := httpx.LoadUserBadges(h.DB, u.ID)
			users = append(users, httpx.SerializeUser(u, counts, badges))
		}
	}
	total := httpx.CountInt(h.DB, "follows", "followerId = ?", target.ID)
	httpx.OK(c, gin.H{"items": users, "total": total})
}

// GET /api/users/:id/followers
func (h *UsersHandler) followers(c *gin.Context) {
	id := c.Param("id")
	var target models.User
	if err := h.DB.Where("id = ?", id).First(&target).Error; err != nil {
		httpx.NotFound(c, "用户不存在")
		return
	}
	me := middleware.OptionalUser(c)
	isMe := me != nil && me.ID == target.ID
	if !target.PrivacyShowFollowers && !isMe {
		httpx.Forbidden(c, target.Name+" 设置了「隐藏粉丝列表」")
		return
	}
	var follows []models.Follow
	h.DB.Where("followeeId = ?", target.ID).
		Order("createdAt DESC").Limit(200).Find(&follows)
	ids := make([]string, len(follows))
	for i, f := range follows {
		ids[i] = f.FollowerID
	}

	users := make([]httpx.UserDTO, 0, len(ids))
	if len(ids) > 0 {
		var rows []models.User
		h.DB.Where("id IN ?", ids).Find(&rows)
		byID := make(map[string]*models.User)
		for i := range rows {
			byID[rows[i].ID] = &rows[i]
		}
		for _, tid := range ids {
			u := byID[tid]
			if u == nil {
				continue
			}
			counts := httpx.LoadUserCounts(h.DB, u.ID)
			badges := httpx.LoadUserBadges(h.DB, u.ID)
			users = append(users, httpx.SerializeUser(u, counts, badges))
		}
	}
	total := httpx.CountInt(h.DB, "follows", "followeeId = ?", target.ID)
	httpx.OK(c, gin.H{"items": users, "total": total})
}

// GET / PATCH /api/users/me/privacy

func (h *UsersHandler) getPrivacy(c *gin.Context) {
	me := middleware.MustUser(c)
	httpx.OK(c, gin.H{
		"showFollowing": me.PrivacyShowFollowing,
		"showFollowers": me.PrivacyShowFollowers,
	})
}

type privacyBody struct {
	ShowFollowing *bool `json:"showFollowing"`
	ShowFollowers *bool `json:"showFollowers"`
}

func (h *UsersHandler) setPrivacy(c *gin.Context) {
	me := middleware.MustUser(c)
	var body privacyBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}
	updates := map[string]any{}
	if body.ShowFollowing != nil {
		updates["privacyShowFollowing"] = *body.ShowFollowing
	}
	if body.ShowFollowers != nil {
		updates["privacyShowFollowers"] = *body.ShowFollowers
	}
	if len(updates) > 0 {
		h.DB.Model(&models.User{}).Where("id = ?", me.ID).Updates(updates)
	}
	// 重新读出
	var fresh models.User
	h.DB.Where("id = ?", me.ID).First(&fresh)
	httpx.OK(c, gin.H{
		"showFollowing": fresh.PrivacyShowFollowing,
		"showFollowers": fresh.PrivacyShowFollowers,
	})
}
