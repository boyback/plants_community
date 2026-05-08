package api

import (
	"plants-community-server/internal/httpx"
	"plants-community-server/internal/middleware"
	"plants-community-server/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type BoardsHandler struct {
	DB *gorm.DB
}

func (h *BoardsHandler) Register(g *gin.RouterGroup) {
	g.GET("/categories", h.listCategories)
	g.GET("/categories/:slug", h.categoryDetail)
	g.GET("/genera/:slug", h.genusDetail)
	g.GET("/species/:slug", h.speciesDetail)
	g.POST("/boards/follow", middleware.RequireUser(), h.follow)
	g.DELETE("/boards/follow", middleware.RequireUser(), h.unfollow)
	g.GET("/boards/followed", middleware.RequireUser(), h.followed)
	// 兼容旧接口
	g.GET("/boards", h.listCategories)
}

// GET /api/categories?kind=family|discussion|market
func (h *BoardsHandler) listCategories(c *gin.Context) {
	kind := c.Query("kind")
	q := h.DB.Model(&models.Category{}).Where("enabled = ?", true).Order("orderIdx ASC, name ASC")
	if kind != "" {
		q = q.Where("kind = ?", kind)
	}
	var list []models.Category
	q.Find(&list)

	out := make([]httpx.BoardDTO, 0, len(list))
	for i := range list {
		cat := &list[i]
		postsCount := httpx.CountInt(h.DB, "posts", "categoryId = ?", cat.ID)
		generaCount := httpx.CountInt(h.DB, "genera", "categoryId = ?", cat.ID)
		out = append(out, httpx.SerializeCategory(cat, postsCount, generaCount))
	}
	httpx.OK(c, out)
}

// GET /api/categories/:slug
func (h *BoardsHandler) categoryDetail(c *gin.Context) {
	slug := c.Param("slug")
	var cat models.Category
	if err := h.DB.Where("slug = ?", slug).First(&cat).Error; err != nil {
		httpx.NotFound(c, "板块不存在")
		return
	}
	var genera []models.Genus
	h.DB.Where("categoryId = ?", cat.ID).
		Order("orderIdx ASC, name ASC").Find(&genera)

	generaOut := make([]httpx.BoardDTO, 0, len(genera))
	for i := range genera {
		g := &genera[i]
		g.Category = cat
		postsCount := httpx.CountInt(h.DB, "posts", "genusId = ?", g.ID)
		speciesCount := httpx.CountInt(h.DB, "species", "genusId = ?", g.ID)
		generaOut = append(generaOut, httpx.SerializeGenus(g, postsCount, speciesCount))
	}

	postsCount := httpx.CountInt(h.DB, "posts", "categoryId = ?", cat.ID)
	generaCount := httpx.CountInt(h.DB, "genera", "categoryId = ?", cat.ID)

	httpx.OK(c, gin.H{
		"category":  httpx.SerializeCategory(&cat, postsCount, generaCount),
		"latinName": cat.LatinName,
		"kind":      cat.Kind,
		"genera":    generaOut,
	})
}

// GET /api/genera/:slug?category=xxx
func (h *BoardsHandler) genusDetail(c *gin.Context) {
	slug := c.Param("slug")
	catSlug := c.Query("category")

	q := h.DB.Preload("Category").Where("slug = ?", slug)
	if catSlug != "" {
		// 先查 category
		var cat models.Category
		if err := h.DB.Where("slug = ?", catSlug).First(&cat).Error; err == nil {
			q = q.Where("categoryId = ?", cat.ID)
		}
	}
	var g models.Genus
	if err := q.First(&g).Error; err != nil {
		httpx.NotFound(c, "属不存在")
		return
	}

	var species []models.Species
	h.DB.Where("genusId = ?", g.ID).Order("name ASC").Find(&species)
	speciesOut := make([]httpx.BoardDTO, 0, len(species))
	for i := range species {
		s := &species[i]
		s.Genus = g
		s.Genus.Category = g.Category
		postsCount := httpx.CountInt(h.DB, "posts", "speciesId = ?", s.ID)
		speciesOut = append(speciesOut, httpx.SerializeSpecies(s, postsCount))
	}

	genusPosts := httpx.CountInt(h.DB, "posts", "genusId = ?", g.ID)
	genusSpecies := httpx.CountInt(h.DB, "species", "genusId = ?", g.ID)
	catPosts := httpx.CountInt(h.DB, "posts", "categoryId = ?", g.CategoryID)
	catGenera := httpx.CountInt(h.DB, "genera", "categoryId = ?", g.CategoryID)

	httpx.OK(c, gin.H{
		"genus":     httpx.SerializeGenus(&g, genusPosts, genusSpecies),
		"latinName": g.LatinName,
		"category":  httpx.SerializeCategory(&g.Category, catPosts, catGenera),
		"species":   speciesOut,
	})
}

// GET /api/species/:slug?genus=xxx
func (h *BoardsHandler) speciesDetail(c *gin.Context) {
	slug := c.Param("slug")
	genusSlug := c.Query("genus")

	q := h.DB.Preload("Genus").Preload("Genus.Category").Where("slug = ?", slug)
	if genusSlug != "" {
		var g models.Genus
		if err := h.DB.Where("slug = ?", genusSlug).First(&g).Error; err == nil {
			q = q.Where("genusId = ?", g.ID)
		}
	}
	var s models.Species
	if err := q.First(&s).Error; err != nil {
		httpx.NotFound(c, "品种不存在")
		return
	}
	postsCount := httpx.CountInt(h.DB, "posts", "speciesId = ?", s.ID)
	httpx.OK(c, httpx.SerializeSpeciesFull(&s, postsCount))
}

// -------------------- Board 关注 --------------------

type followBoardBody struct {
	Type         string `json:"type" binding:"required"` // category|genus|species
	Slug         string `json:"slug" binding:"required"`
	CategorySlug string `json:"categorySlug"`
	GenusSlug    string `json:"genusSlug"`
}

func (h *BoardsHandler) resolveTargetID(b followBoardBody) string {
	switch b.Type {
	case "category":
		var c models.Category
		if err := h.DB.Where("slug = ?", b.Slug).First(&c).Error; err == nil {
			return c.ID
		}
	case "genus":
		q := h.DB.Where("slug = ?", b.Slug)
		if b.CategorySlug != "" {
			var cat models.Category
			if err := h.DB.Where("slug = ?", b.CategorySlug).First(&cat).Error; err == nil {
				q = q.Where("categoryId = ?", cat.ID)
			}
		}
		var g models.Genus
		if err := q.First(&g).Error; err == nil {
			return g.ID
		}
	case "species":
		q := h.DB.Where("slug = ?", b.Slug)
		if b.GenusSlug != "" {
			var gg models.Genus
			if err := h.DB.Where("slug = ?", b.GenusSlug).First(&gg).Error; err == nil {
				q = q.Where("genusId = ?", gg.ID)
			}
		}
		var s models.Species
		if err := q.First(&s).Error; err == nil {
			return s.ID
		}
	}
	return ""
}

// POST /api/boards/follow
func (h *BoardsHandler) follow(c *gin.Context) {
	me := middleware.MustUser(c)
	var body followBoardBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}
	targetID := h.resolveTargetID(body)
	if targetID == "" {
		httpx.NotFound(c, "目标板块不存在")
		return
	}
	// 幂等:先查
	var exist models.BoardFollow
	if err := h.DB.Where("userId = ? AND type = ? AND targetId = ?",
		me.ID, body.Type, targetID).First(&exist).Error; err == nil {
		httpx.OK(c, gin.H{"ok": true})
		return
	}
	h.DB.Create(&models.BoardFollow{
		ID:       genCuid(),
		UserID:   me.ID,
		Type:     body.Type,
		TargetID: targetID,
	})
	httpx.OK(c, gin.H{"ok": true})
}

// DELETE /api/boards/follow
func (h *BoardsHandler) unfollow(c *gin.Context) {
	me := middleware.MustUser(c)
	var body followBoardBody
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.BadRequest(c, "参数错误")
		return
	}
	targetID := h.resolveTargetID(body)
	if targetID == "" {
		httpx.NotFound(c, "目标板块不存在")
		return
	}
	h.DB.Where("userId = ? AND type = ? AND targetId = ?",
		me.ID, body.Type, targetID).Delete(&models.BoardFollow{})
	httpx.OK(c, gin.H{"ok": true})
}

// GET /api/boards/followed
func (h *BoardsHandler) followed(c *gin.Context) {
	me := middleware.MustUser(c)
	var follows []models.BoardFollow
	h.DB.Where("userId = ?", me.ID).Order("createdAt DESC").Find(&follows)

	// 分三类批量读
	var catIDs, genusIDs, speciesIDs []string
	for _, f := range follows {
		switch f.Type {
		case "category":
			catIDs = append(catIDs, f.TargetID)
		case "genus":
			genusIDs = append(genusIDs, f.TargetID)
		case "species":
			speciesIDs = append(speciesIDs, f.TargetID)
		}
	}

	cats := map[string]models.Category{}
	if len(catIDs) > 0 {
		var list []models.Category
		h.DB.Where("id IN ?", catIDs).Find(&list)
		for i := range list {
			cats[list[i].ID] = list[i]
		}
	}
	genera := map[string]models.Genus{}
	if len(genusIDs) > 0 {
		var list []models.Genus
		h.DB.Preload("Category").Where("id IN ?", genusIDs).Find(&list)
		for i := range list {
			genera[list[i].ID] = list[i]
		}
	}
	speciesMap := map[string]models.Species{}
	if len(speciesIDs) > 0 {
		var list []models.Species
		h.DB.Preload("Genus").Preload("Genus.Category").Where("id IN ?", speciesIDs).Find(&list)
		for i := range list {
			speciesMap[list[i].ID] = list[i]
		}
	}

	// 按 follows 原顺序输出
	out := make([]httpx.BoardDTO, 0, len(follows))
	for _, f := range follows {
		switch f.Type {
		case "category":
			if c2, ok := cats[f.TargetID]; ok {
				postsCount := httpx.CountInt(h.DB, "posts", "categoryId = ?", c2.ID)
				generaCount := httpx.CountInt(h.DB, "genera", "categoryId = ?", c2.ID)
				out = append(out, httpx.SerializeCategory(&c2, postsCount, generaCount))
			}
		case "genus":
			if g, ok := genera[f.TargetID]; ok {
				postsCount := httpx.CountInt(h.DB, "posts", "genusId = ?", g.ID)
				speciesCount := httpx.CountInt(h.DB, "species", "genusId = ?", g.ID)
				out = append(out, httpx.SerializeGenus(&g, postsCount, speciesCount))
			}
		case "species":
			if s, ok := speciesMap[f.TargetID]; ok {
				postsCount := httpx.CountInt(h.DB, "posts", "speciesId = ?", s.ID)
				out = append(out, httpx.SerializeSpecies(&s, postsCount))
			}
		}
	}
	httpx.OK(c, out)
}
