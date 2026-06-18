package api

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"plants-community-server/internal/httpx"
	"plants-community-server/internal/levels"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"
	"plants-community-server/internal/richtext"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type PostsHandler struct {
	DB *gorm.DB
}

func (h *PostsHandler) Register(g *gin.RouterGroup) {
	g.GET("/posts", h.list)
	g.POST("/posts", middleware.RequireUser(), h.create)
	g.GET("/posts/:id", h.detail)
	g.POST("/posts/:id/like", middleware.RequireUser(), h.toggleLike)
	g.GET("/posts/:id/like", middleware.RequireUser(), h.likeStatus)
	g.POST("/posts/:id/collect", middleware.RequireUser(), h.toggleCollect)
	g.POST("/posts/:id/comments", middleware.RequireUser(), h.comment)
}

// 共享的 board 构造:对 post 的 category/genus/species/board 按优先级序列化
func (h *PostsHandler) boardForPost(p *models.Post) httpx.BoardDTO {
	// species 优先
	if p.SpeciesID != nil {
		var s models.Species
		if err := h.DB.Preload("Genus").Preload("Genus.Category").
			Where("id = ?", *p.SpeciesID).First(&s).Error; err == nil {
			postsCount := httpx.CountInt(h.DB, "posts", "speciesId = ?", s.ID)
			return httpx.SerializeSpecies(&s, postsCount)
		}
	}
	if p.GenusID != nil {
		var g models.Genus
		if err := h.DB.Preload("Category").Where("id = ?", *p.GenusID).First(&g).Error; err == nil {
			postsCount := httpx.CountInt(h.DB, "posts", "genusId = ?", g.ID)
			speciesCount := httpx.CountInt(h.DB, "species", "genusId = ?", g.ID)
			return httpx.SerializeGenus(&g, postsCount, speciesCount)
		}
	}
	if p.CategoryID != nil {
		var c models.Category
		if err := h.DB.Where("id = ?", *p.CategoryID).First(&c).Error; err == nil {
			postsCount := httpx.CountInt(h.DB, "posts", "categoryId = ?", c.ID)
			generaCount := httpx.CountInt(h.DB, "genera", "categoryId = ?", c.ID)
			return httpx.SerializeCategory(&c, postsCount, generaCount)
		}
	}
	// 兜底:空板块
	return httpx.BoardDTO{
		Level: "category",
		Slug:  "unknown",
		Name:  "未分类",
		Icon:  "🌱",
		Path:  []httpx.PathSeg{{Level: "category", Slug: "unknown", Name: "未分类"}},
	}
}

func (h *PostsHandler) authorDTO(authorID string) httpx.UserDTO {
	u, counts, badges, err := httpx.LoadUserAggregate(h.DB, authorID)
	if err != nil {
		return httpx.UserDTO{ID: authorID, Name: "未知用户"}
	}
	return httpx.SerializeUser(u, counts, badges)
}

// GET /api/posts?category=xxx&genus=xxx&species=xxx&author=xxx&sort=latest&limit=24
func (h *PostsHandler) list(c *gin.Context) {
	sort := c.DefaultQuery("sort", "recommend")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "24"))
	if limit > 100 {
		limit = 100
	}

	q := h.DB.Model(&models.Post{})

	if s := c.Query("category"); s != "" {
		// join 查 category.slug
		var cat models.Category
		if err := h.DB.Where("slug = ?", s).First(&cat).Error; err == nil {
			q = q.Where("categoryId = ?", cat.ID)
		}
	}
	if s := c.Query("genus"); s != "" {
		var g models.Genus
		if err := h.DB.Where("slug = ?", s).First(&g).Error; err == nil {
			q = q.Where("genusId = ?", g.ID)
		}
	}
	if s := c.Query("species"); s != "" {
		var sp models.Species
		if err := h.DB.Where("slug = ?", s).First(&sp).Error; err == nil {
			q = q.Where("speciesId = ?", sp.ID)
		}
	}
	if s := c.Query("author"); s != "" {
		q = q.Where("authorId = ?", s)
	}

	switch sort {
	case "latest":
		q = q.Order("createdAt DESC")
	case "hot":
		q = q.Order("views DESC, createdAt DESC")
	default:
		q = q.Order("createdAt DESC")
	}

	var posts []models.Post
	q.Limit(limit).Find(&posts)

	items := make([]httpx.PostDTO, 0, len(posts))
	for i := range posts {
		p := &posts[i]
		items = append(items, httpx.SerializePost(httpx.PostPayload{
			Post:     p,
			Author:   h.authorDTO(p.AuthorID),
			Board:    h.boardForPost(p),
			Likes:    httpx.CountInt(h.DB, "post_likes", "postId = ?", p.ID),
			Comments: httpx.CountInt(h.DB, "comments", "postId = ?", p.ID),
		}))
	}

	httpx.OK(c, gin.H{"items": items, "nextCursor": nil})
}

// GET /api/posts/:id
func (h *PostsHandler) detail(c *gin.Context) {
	id := c.Param("id")
	var p models.Post
	if err := h.DB.Where("id = ?", id).First(&p).Error; err != nil {
		httpx.NotFound(c, "帖子不存在")
		return
	}
	// views +1(异步,不阻塞)
	go func() {
		h.DB.Model(&models.Post{}).Where("id = ?", id).
			UpdateColumn("views", gorm.Expr("views + ?", 1))
	}()

	// 取前 50 条顶层评论
	var comments []models.Comment
	h.DB.Where("postId = ? AND parentId IS NULL", p.ID).
		Order("createdAt DESC").Limit(50).Find(&comments)

	commentsOut := make([]httpx.CommentDTO, 0, len(comments))
	for i := range comments {
		cc := &comments[i]
		commentsOut = append(commentsOut, httpx.CommentDTO{
			ID:          cc.ID,
			Author:      h.authorDTO(cc.AuthorID),
			Content:     cc.Content,
			ContentText: cc.ContentText,
			CreatedAt:   cc.CreatedAt.UTC().Format(time.RFC3339),
			Likes:       cc.Likes,
		})
	}

	dto := httpx.SerializePost(httpx.PostPayload{
		Post:       &p,
		Author:     h.authorDTO(p.AuthorID),
		Board:      h.boardForPost(&p),
		Likes:      httpx.CountInt(h.DB, "post_likes", "postId = ?", p.ID),
		Comments:   httpx.CountInt(h.DB, "comments", "postId = ?", p.ID),
		CommentIDs: commentsOut,
	})
	httpx.OK(c, dto)
}

// GET /api/posts/:id/like
func (h *PostsHandler) likeStatus(c *gin.Context) {
	me := middleware.MustUser(c)
	id := c.Param("id")
	var pl models.PostLike
	liked := h.DB.Where("userId = ? AND postId = ?", me.ID, id).First(&pl).Error == nil
	total := httpx.CountInt(h.DB, "post_likes", "postId = ?", id)
	httpx.OK(c, gin.H{"liked": liked, "total": total})
}

// POST /api/posts/:id/like
func (h *PostsHandler) toggleLike(c *gin.Context) {
	me := middleware.MustUser(c)
	id := c.Param("id")
	var p models.Post
	if err := h.DB.Where("id = ?", id).First(&p).Error; err != nil {
		httpx.NotFound(c, "帖子不存在")
		return
	}
	var pl models.PostLike
	err := h.DB.Where("userId = ? AND postId = ?", me.ID, id).First(&pl).Error
	if err == nil {
		h.DB.Where("userId = ? AND postId = ?", me.ID, id).Delete(&models.PostLike{})
	} else {
		h.DB.Create(&models.PostLike{UserID: me.ID, PostID: id, CreatedAt: time.Now()})
	}
	total := httpx.CountInt(h.DB, "post_likes", "postId = ?", id)
	httpx.OK(c, gin.H{"liked": err != nil, "total": total})
}

// POST /api/posts/:id/collect
func (h *PostsHandler) toggleCollect(c *gin.Context) {
	me := middleware.MustUser(c)
	id := c.Param("id")
	var p models.Post
	if err := h.DB.Where("id = ?", id).First(&p).Error; err != nil {
		httpx.NotFound(c, "帖子不存在")
		return
	}
	var pc models.PostCollect
	err := h.DB.Where("userId = ? AND postId = ?", me.ID, id).First(&pc).Error
	if err == nil {
		h.DB.Where("userId = ? AND postId = ?", me.ID, id).Delete(&models.PostCollect{})
	} else {
		h.DB.Create(&models.PostCollect{UserID: me.ID, PostID: id, CreatedAt: time.Now()})
	}
	total := httpx.CountInt(h.DB, "post_collects", "postId = ?", id)
	httpx.OK(c, gin.H{"collected": err != nil, "total": total})
}

// POST /api/posts/:id/comments
type commentBody struct {
	Content     string `json:"content"`
	ContentJson any    `json:"contentJson"`
}

func (h *PostsHandler) comment(c *gin.Context) {
	me := middleware.MustUser(c)
	id := c.Param("id")
	var body commentBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}
	// Demo 阶段:本 Go 端不做 sanitize,直接把 content 当纯文本包成 <p>
	text := body.Content
	if text == "" {
		httpx.BadRequest(c, "评论内容不能为空")
		return
	}
	html := "<p>" + escapeHTML(text) + "</p>"

	var p models.Post
	if err := h.DB.Where("id = ?", id).First(&p).Error; err != nil {
		httpx.NotFound(c, "帖子不存在")
		return
	}

	comment := models.Comment{
		ID:          genCuid(),
		PostID:      id,
		AuthorID:    me.ID,
		Content:     html,
		ContentText: &text,
		Likes:       0,
		CreatedAt:   time.Now(),
	}
	h.DB.Create(&comment)

	// 通知
	if p.AuthorID != me.ID {
		link := "/post/" + p.ID
		note := text
		if len(note) > 40 {
			note = note[:40]
		}
		h.DB.Create(&models.Notification{
			ID:          genCuid(),
			RecipientID: p.AuthorID,
			FromID:      &me.ID,
			Type:        "comment",
			Text:        "评论了你的帖子:" + note,
			Link:        &link,
			Read:        false,
			CreatedAt:   time.Now(),
		})
	}

	httpx.OK(c, httpx.CommentDTO{
		ID:          comment.ID,
		Author:      h.authorDTO(me.ID),
		Content:     comment.Content,
		ContentText: comment.ContentText,
		CreatedAt:   comment.CreatedAt.UTC().Format(time.RFC3339),
		Likes:       0,
	})
}

func escapeHTML(s string) string {
	// 最小安全转义
	out := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		switch s[i] {
		case '<':
			out = append(out, "&lt;"...)
		case '>':
			out = append(out, "&gt;"...)
		case '&':
			out = append(out, "&amp;"...)
		case '"':
			out = append(out, "&quot;"...)
		case '\'':
			out = append(out, "&#39;"...)
		default:
			out = append(out, s[i])
		}
	}
	return string(out)
}

// ===================== 帖子创建 =====================

// createPostBody 对齐 Next.js 的 CreateBody
type createPostBody struct {
	Type         string   `json:"type" binding:"required,oneof=rich short vote video event help"`
	Title        string   `json:"title" binding:"required,min=1,max=100"`
	CategorySlug string   `json:"categorySlug"`
	GenusSlug    string   `json:"genusSlug"`
	SpeciesSlug  string   `json:"speciesSlug"`
	BoardSlug    string   `json:"boardSlug"` // 向后兼容
	// content 字段:rich/event/help 用 contentJson;short/video/vote 用纯文本 content
	Content     any      `json:"content"`
	ContentJSON any      `json:"contentJson"`
	Tags        []string `json:"tags"`
	Images      []string `json:"images"`
	VideoURL    string   `json:"videoUrl"`
	Vote        *struct {
		Question string   `json:"question"`
		Options  []string `json:"options"`
		Multi    bool     `json:"multi"`
		Deadline string   `json:"deadline"`
	} `json:"vote"`
	Event *struct {
		Location string `json:"location"`
		StartAt  string `json:"startAt"`
		EndAt    string `json:"endAt"`
	} `json:"event"`
	// 求助贴字段
	Help *struct {
		Urgency      string `json:"urgency"`      // low/normal/high
		BountyPoints int    `json:"bountyPoints"` // 悬赏钻石(0 即无悬赏)
	} `json:"help"`
}

type resolvedBoardIDs struct {
	CategoryID *string
	GenusID    *string
	SpeciesID  *string
	BoardID    *string
}

func (h *PostsHandler) resolvePostBoard(body *createPostBody) (*resolvedBoardIDs, string) {
	out := &resolvedBoardIDs{}
	// speciesSlug
	if body.SpeciesSlug != "" {
		var s models.Species
		if err := h.DB.Preload("Genus").Where("slug = ?", body.SpeciesSlug).First(&s).Error; err != nil {
			return nil, "指定的品种不存在"
		}
		out.SpeciesID = &s.ID
		out.GenusID = &s.GenusID
		catID := s.Genus.CategoryID
		out.CategoryID = &catID
		return out, ""
	}
	// genusSlug
	if body.GenusSlug != "" {
		var g models.Genus
		if err := h.DB.Where("slug = ?", body.GenusSlug).First(&g).Error; err != nil {
			return nil, "指定的属不存在"
		}
		out.GenusID = &g.ID
		cat := g.CategoryID
		out.CategoryID = &cat
		return out, ""
	}
	// categorySlug
	if body.CategorySlug != "" {
		var c models.Category
		if err := h.DB.Where("slug = ?", body.CategorySlug).First(&c).Error; err != nil {
			return nil, "指定的板块不存在"
		}
		out.CategoryID = &c.ID
		return out, ""
	}
	// legacy boardSlug → 按 Category.slug 查
	if body.BoardSlug != "" {
		var c models.Category
		if err := h.DB.Where("slug = ?", body.BoardSlug).First(&c).Error; err == nil {
			out.CategoryID = &c.ID
			return out, ""
		}
		return nil, "指定的板块不存在"
	}
	return nil, "必须指定板块"
}

func (h *PostsHandler) create(c *gin.Context) {
	me := middleware.MustUser(c)
	var body createPostBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	// 依赖校验
	switch body.Type {
	case "vote":
		if body.Vote == nil {
			httpx.BadRequest(c, "投票贴必须包含 vote 字段")
			return
		}
		if len(body.Vote.Options) < 2 || len(body.Vote.Options) > 8 {
			httpx.BadRequest(c, "投票选项数必须在 2-8 之间")
			return
		}
	case "event":
		if body.Event == nil {
			httpx.BadRequest(c, "EVENT 贴必须包含 event 字段")
			return
		}
	case "video":
		if body.VideoURL == "" {
			httpx.BadRequest(c, "视频贴必须包含 videoUrl")
			return
		}
	case "help":
		if body.Help == nil {
			body.Help = &struct {
				Urgency      string `json:"urgency"`
				BountyPoints int    `json:"bountyPoints"`
			}{Urgency: "normal", BountyPoints: 0}
		}
		if body.Help.Urgency == "" {
			body.Help.Urgency = "normal"
		}
		if body.Help.Urgency != "low" && body.Help.Urgency != "normal" && body.Help.Urgency != "high" {
			httpx.BadRequest(c, "urgency 必须是 low / normal / high")
			return
		}
		if body.Help.BountyPoints < 0 || body.Help.BountyPoints > 10000 {
			httpx.BadRequest(c, "悬赏钻石需在 0 - 10000 之间")
			return
		}
		if body.Help.BountyPoints > 0 && me.PointsBalance < body.Help.BountyPoints {
			httpx.BadRequest(c, fmt.Sprintf("钻石不足,当前 %d,需 %d", me.PointsBalance, body.Help.BountyPoints))
			return
		}
	}

	// 权限检查
	isVip := levels.IsVipActive(me.VipLifetime,
		func() int64 {
			if me.VipExpireAt == nil {
				return 0
			}
			return me.VipExpireAt.Unix()
		}(),
		time.Now().Unix(),
	)
	need := levels.PermForPostType(body.Type)
	if need == "" || !levels.Has(me.Level, isVip, need) {
		httpx.Forbidden(c, "当前等级不允许发布该类型帖子,开通大会员或升级即可解锁")
		return
	}
	if len(body.Images) > 0 && !levels.Has(me.Level, isVip, levels.PermPostImage) {
		httpx.Forbidden(c, "需要 Lv.4 以上才能在帖子里附图,开通大会员可解锁")
		return
	}

	// 解析板块
	resolved, perr := h.resolvePostBoard(&body)
	if perr != "" {
		httpx.BadRequest(c, perr)
		return
	}

	// 富文本处理
	isRich := body.Type == "rich" || body.Type == "event" || body.Type == "help"
	stored := richtext.Process(richtext.Input{
		JSON:       conditionalAny(isRich, body.ContentJSON),
		HTML:       conditionalString(isRich, asString(body.Content)),
		Text:       conditionalString(!isRich, asString(body.Content)),
		TextMaxLen: 2000,
	})

	// 封面 = 第一张图
	var cover *string
	if len(body.Images) > 0 {
		cover = &body.Images[0]
	}
	imgStr := jsonArrayString(body.Images)
	tagStr := jsonArrayString(body.Tags)

	post := models.Post{
		ID:          genCuid(),
		Type:        body.Type,
		Title:       body.Title,
		Content:     stored.HTML,
		ContentJson: nullableStr(stored.JSON),
		ContentText: nullableStr(stored.Text),
		Cover:       cover,
		Images:      &imgStr,
		Tags:        &tagStr,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		AuthorID:    me.ID,
		CategoryID:  resolved.CategoryID,
		GenusID:     resolved.GenusID,
		SpeciesID:   resolved.SpeciesID,
	}
	if body.Type == "video" && body.VideoURL != "" {
		post.VideoURL = &body.VideoURL
	}

	if err := h.DB.Create(&post).Error; err != nil {
		httpx.Internal(c, err)
		return
	}

	// 求助贴扩展:扣悬赏 + 写 HelpRequest
	if body.Type == "help" && body.Help != nil {
		hr := models.HelpRequest{
			ID:           genCuid(),
			PostID:       post.ID,
			Urgency:      body.Help.Urgency,
			Solved:       false,
			BountyPoints: body.Help.BountyPoints,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}
		h.DB.Create(&hr)
		if body.Help.BountyPoints > 0 {
			addPoints(h.DB, me.ID, -body.Help.BountyPoints, "admin",
				"help_bounty", post.ID,
				fmt.Sprintf("悬赏求助帖「%s」扣除 %d 钻石", post.Title, body.Help.BountyPoints))
		}
	}

	// 返回完整 PostDTO
	p := &post
	httpx.OK(c, httpx.SerializePost(httpx.PostPayload{
		Post:     p,
		Author:   h.authorDTO(p.AuthorID),
		Board:    h.boardForPost(p),
		Likes:    0,
		Comments: 0,
	}))
}

// ===================== helpers =====================

func conditionalAny(cond bool, v any) any {
	if cond {
		return v
	}
	return nil
}
func conditionalString(cond bool, s string) string {
	if cond {
		return s
	}
	return ""
}
func asString(v any) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}
func nullableStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
func jsonArrayString(a []string) string {
	if len(a) == 0 {
		return "[]"
	}
	b, _ := json.Marshal(a)
	return string(b)
}
