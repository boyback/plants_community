package api

import (
	"encoding/base64"
	"sort"
	"strconv"
	"time"

	"plants-community-server/internal/feed"
	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// FeedHandler 推荐流
type FeedHandler struct {
	DB *gorm.DB
}

func (h *FeedHandler) Register(g *gin.RouterGroup) {
	g.GET("/feed", h.Get)
}

// GET /api/feed?tab=&cursor=&limit=
func (h *FeedHandler) Get(c *gin.Context) {
	tab := c.DefaultQuery("tab", "recommend")
	cursor := c.Query("cursor")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit < 1 || limit > 50 {
		limit = 20
	}
	me := middleware.OptionalUser(c)

	switch tab {
	case "latest", "following":
		h.handleLatest(c, tab, cursor, limit, me)
	case "hot":
		h.handleHot(c, cursor, limit)
	default:
		h.handleRecommend(c, cursor, limit, me)
	}
}

// ---- latest / following ----

func (h *FeedHandler) handleLatest(c *gin.Context, tab string, cursor string, limit int, me *models.User) {
	tx := h.DB.Model(&models.Post{}).Where("deleted = ?", false)
	if tab == "following" {
		if me == nil {
			httpx.Unauthorized(c, "请先登录")
			return
		}
		var ids []string
		h.DB.Model(&models.Follow{}).Where("followerId = ?", me.ID).
			Pluck("followeeId", &ids)
		if len(ids) == 0 {
			httpx.OK(c, gin.H{"items": []any{}, "nextCursor": nil})
			return
		}
		tx = tx.Where("authorId IN ?", ids)
	}
	if cursor != "" {
		t, ok := decodeLatestCursor(cursor)
		if ok {
			tx = tx.Where("createdAt < ?", t)
		}
	}
	var items []models.Post
	if err := tx.Order("createdAt desc").Limit(limit + 1).Preload("Author").Find(&items).Error; err != nil {
		ServerError(c, err)
		return
	}
	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}
	var next *string
	if hasMore && len(items) > 0 {
		s := encodeLatestCursor(items[len(items)-1].CreatedAt)
		next = &s
	}
	httpx.OK(c, gin.H{"items": items, "nextCursor": next})
}

// ---- hot ----

func (h *FeedHandler) handleHot(c *gin.Context, cursor string, limit int) {
	tx := h.DB.Model(&models.Post{}).Where("deleted = ?", false)
	if cursor != "" {
		score, id, ok := decodeHotCursor(cursor)
		if ok {
			tx = tx.Where("hotScore < ? OR (hotScore = ? AND id < ?)", score, score, id)
		}
	}
	var items []models.Post
	if err := tx.Order("hotScore desc, id desc").Limit(limit + 1).Preload("Author").Find(&items).Error; err != nil {
		ServerError(c, err)
		return
	}
	hasMore := len(items) > limit
	if hasMore {
		items = items[:limit]
	}
	var next *string
	if hasMore && len(items) > 0 {
		last := items[len(items)-1]
		s := encodeHotCursor(last.HotScore, last.ID)
		next = &s
	}
	httpx.OK(c, gin.H{"items": items, "nextCursor": next})
}

// ---- recommend ----

func (h *FeedHandler) handleRecommend(c *gin.Context, cursor string, limit int, me *models.User) {
	page, _ := strconv.Atoi(cursor)
	if page < 0 {
		page = 0
	}
	since := time.Now().Add(-14 * 24 * time.Hour)
	var pool []models.Post
	if err := h.DB.Where("deleted = ? AND createdAt >= ?", false, since).
		Order("hotScore desc").Limit(200).
		Preload("Author").Find(&pool).Error; err != nil {
		ServerError(c, err)
		return
	}

	var profile *feed.UserProfile
	if me != nil {
		profile = h.loadUserProfile(me.ID)
	}

	if profile != nil {
		sort.SliceStable(pool, func(i, j int) bool {
			return feed.Personalize(toRankInput(pool[i]), profile) >
				feed.Personalize(toRankInput(pool[j]), profile)
		})
	}

	start := page * limit
	end := start + limit
	if start > len(pool) {
		start = len(pool)
	}
	if end > len(pool) {
		end = len(pool)
	}
	slice := pool[start:end]
	hasMore := end < len(pool)
	var next *string
	if hasMore {
		s := strconv.Itoa(page + 1)
		next = &s
	}
	httpx.OK(c, gin.H{"items": slice, "nextCursor": next})
}

func toRankInput(p models.Post) feed.PostForRank {
	return feed.PostForRank{
		ID: p.ID, AuthorID: p.AuthorID,
		CategoryID: p.CategoryID, GenusID: p.GenusID, SpeciesID: p.SpeciesID,
		HotScore: p.HotScore, CreatedAt: p.CreatedAt,
	}
}

// loadUserProfile 拉关注/板块关注/最近 30 天浏览的 categoryAffinity
func (h *FeedHandler) loadUserProfile(userID string) *feed.UserProfile {
	following := map[string]bool{}
	var fIds []string
	h.DB.Model(&models.Follow{}).Where("followerId = ?", userID).Pluck("followeeId", &fIds)
	for _, id := range fIds {
		following[id] = true
	}
	var bIds []string
	h.DB.Model(&models.BoardFollow{}).Where("userId = ?", userID).Pluck("targetId", &bIds)
	boards := map[string]bool{}
	for _, id := range bIds {
		boards[id] = true
	}
	// 最近 30 天 PostView 聚合
	since := time.Now().Add(-30 * 24 * time.Hour)
	type row struct{ CategoryID *string }
	var rows []row
	h.DB.Raw(`
		SELECT p.categoryId AS category_id
		FROM post_views v JOIN posts p ON p.id = v.postId
		WHERE v.userId = ? AND v.createdAt >= ?
		LIMIT 500
	`, userID, since).Scan(&rows)
	counts := map[string]int{}
	for _, r := range rows {
		if r.CategoryID != nil {
			counts[*r.CategoryID]++
		}
	}
	return &feed.UserProfile{
		UserID:           userID,
		FollowingSet:     following,
		FollowedBoardIDs: boards,
		CategoryAffinity: feed.Softmax(counts),
	}
}

// ---- cursor ----

func encodeLatestCursor(t time.Time) string {
	return base64.RawURLEncoding.EncodeToString([]byte(t.UTC().Format(time.RFC3339Nano)))
}
func decodeLatestCursor(s string) (time.Time, bool) {
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return time.Time{}, false
	}
	t, err := time.Parse(time.RFC3339Nano, string(b))
	if err != nil {
		return time.Time{}, false
	}
	return t, true
}
func encodeHotCursor(score float64, id string) string {
	s := strconv.FormatFloat(score, 'f', -1, 64) + "::" + id
	return base64.RawURLEncoding.EncodeToString([]byte(s))
}
func decodeHotCursor(s string) (float64, string, bool) {
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return 0, "", false
	}
	parts := splitOnce(string(b), "::")
	if len(parts) != 2 {
		return 0, "", false
	}
	f, err := strconv.ParseFloat(parts[0], 64)
	if err != nil {
		return 0, "", false
	}
	return f, parts[1], true
}
func splitOnce(s, sep string) []string {
	for i := 0; i+len(sep) <= len(s); i++ {
		if s[i:i+len(sep)] == sep {
			return []string{s[:i], s[i+len(sep):]}
		}
	}
	return []string{s}
}
