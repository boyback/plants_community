package httpx

import (
	"encoding/json"
	"time"

	"plants-community-server/internal/models"
)

// 把 models.* 转成和 Next.js src/lib/serializers.ts 一致的 JSON 形状。

type UserDTO struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Avatar    string     `json:"avatar"`
	Bio       *string    `json:"bio,omitempty"`
	Level     int        `json:"level"`
	Posts     int        `json:"posts"`
	Followers int        `json:"followers"`
	Following int        `json:"following"`
	JoinedAt  string     `json:"joinedAt"`
	Badges    []BadgeDTO `json:"badges"`
}

type BadgeDTO struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
	Obtained    bool   `json:"obtained"`
}

type UserCounts struct {
	Posts     int
	Followers int
	Following int
}

func SerializeUser(u *models.User, counts UserCounts, badges []models.UserBadge) UserDTO {
	out := UserDTO{
		ID:        u.ID,
		Name:      u.Name,
		Avatar:    u.Avatar,
		Bio:       u.Bio,
		Level:     u.Level,
		Posts:     counts.Posts,
		Followers: counts.Followers,
		Following: counts.Following,
		JoinedAt:  u.JoinedAt.UTC().Format(time.RFC3339),
		Badges:    make([]BadgeDTO, 0, len(badges)),
	}
	for _, ub := range badges {
		out.Badges = append(out.Badges, BadgeDTO{
			ID:          ub.Badge.ID,
			Name:        ub.Badge.Name,
			Icon:        ub.Badge.Icon,
			Description: ub.Badge.Description,
			Obtained:    ub.Obtained,
		})
	}
	return out
}

// --------------- Category / Genus / Species / Board ---------------

type BoardDTO struct {
	ID            string      `json:"id"`
	Level         string      `json:"level"` // category | genus | species
	Slug          string      `json:"slug"`
	Name          string      `json:"name"`
	Description   string      `json:"description"`
	Cover         string      `json:"cover"`
	Icon          string      `json:"icon"`
	Members       int         `json:"members"`
	Posts         int         `json:"posts"`
	Path          []PathSeg   `json:"path"`
	ChildrenCount *int        `json:"childrenCount,omitempty"`
}

type PathSeg struct {
	Level string `json:"level"`
	Slug  string `json:"slug"`
	Name  string `json:"name"`
}

func SerializeCategory(c *models.Category, postsCount, generaCount int) BoardDTO {
	cc := generaCount
	return BoardDTO{
		ID:            c.ID,
		Level:         "category",
		Slug:          c.Slug,
		Name:          c.Name,
		Description:   c.Description,
		Cover:         c.Cover,
		Icon:          getFirstIcon(c.Icons),
		Members:       c.Members,
		Posts:         postsCount,
		Path:          []PathSeg{{Level: "category", Slug: c.Slug, Name: c.Name}},
		ChildrenCount: &cc,
	}
}

func SerializeGenus(g *models.Genus, postsCount, speciesCount int) BoardDTO {
	cover := ""
	if g.Cover != nil {
		cover = *g.Cover
	} else {
		cover = g.Category.Cover
	}
	cc := speciesCount
	return BoardDTO{
		ID:          g.ID,
		Level:       "genus",
		Slug:        g.Slug,
		Name:        g.Name,
		Description: g.Description,
		Cover:       cover,
		Icon:        getFirstIcon(g.Category.Icons),
		Members:     0,
		Posts:       postsCount,
		Path: []PathSeg{
			{Level: "category", Slug: g.Category.Slug, Name: g.Category.Name},
			{Level: "genus", Slug: g.Slug, Name: g.Name},
		},
		ChildrenCount: &cc,
	}
}

func SerializeSpecies(s *models.Species, postsCount int) BoardDTO {
	return BoardDTO{
		ID:          s.ID,
		Level:       "species",
		Slug:        s.Slug,
		Name:        s.Name,
		Description: s.Description,
		Cover:       s.Cover,
		Icon:        getFirstIcon(s.Genus.Category.Icons),
		Members:     0,
		Posts:       postsCount,
		Path: []PathSeg{
			{Level: "category", Slug: s.Genus.Category.Slug, Name: s.Genus.Category.Name},
			{Level: "genus", Slug: s.Genus.Slug, Name: s.Genus.Name},
			{Level: "species", Slug: s.Slug, Name: s.Name},
		},
	}
}

// Species 完整图鉴信息
type SpeciesFullDTO struct {
	BoardDTO
	LatinName     string   `json:"latinName"`
	Alias         []string `json:"alias"`
	Gallery       []string `json:"gallery"`
	Difficulty    int      `json:"difficulty"`
	Light         string   `json:"light"`
	Watering      string   `json:"watering"`
	Hardiness     string   `json:"hardiness"`
	Tips          []string `json:"tips"`
	Blooming      *string  `json:"blooming,omitempty"`
	OriginRegion  *string  `json:"originRegion,omitempty"`
	GrowthType    *string  `json:"growthType,omitempty"`
	CategorySlug  string   `json:"categorySlug"`
	GenusSlug     string   `json:"genusSlug"`
}

func SerializeSpeciesFull(s *models.Species, postsCount int) SpeciesFullDTO {
	base := SerializeSpecies(s, postsCount)
	return SpeciesFullDTO{
		BoardDTO:     base,
		LatinName:    s.LatinName,
		Alias:        parseJSONArray(s.Alias),
		Gallery:      parseJSONArray(&s.Gallery),
		Difficulty:   s.Difficulty,
		Light:        s.Light,
		Watering:     s.Watering,
		Hardiness:    s.Hardiness,
		Tips:         parseJSONArray(&s.Tips),
		Blooming:     s.Blooming,
		OriginRegion: s.OriginRegion,
		GrowthType:   s.GrowthType,
		CategorySlug: s.Genus.Category.Slug,
		GenusSlug:    s.Genus.Slug,
	}
}

// --------------- Post ---------------

type PostDTO struct {
	ID          string      `json:"id"`
	Type        string      `json:"type"`
	Title       string      `json:"title"`
	Content     string      `json:"content"`
	ContentJson any         `json:"contentJson,omitempty"`
	ContentText *string     `json:"contentText,omitempty"`
	Images      []string    `json:"images"`
	VideoURL    *string     `json:"videoUrl,omitempty"`
	Cover       *string     `json:"cover,omitempty"`
	Author      UserDTO     `json:"author"`
	Board       BoardDTO    `json:"board"`
	Tags        []string    `json:"tags"`
	CreatedAt   string      `json:"createdAt"`
	Likes       int         `json:"likes"`
	Comments    int         `json:"comments"`
	Shares      int         `json:"shares"`
	Views       int         `json:"views"`
	CommentList []CommentDTO `json:"commentList,omitempty"`
}

type CommentDTO struct {
	ID          string  `json:"id"`
	Author      UserDTO `json:"author"`
	Content     string  `json:"content"`
	ContentJson any     `json:"contentJson,omitempty"`
	ContentText *string `json:"contentText,omitempty"`
	CreatedAt   string  `json:"createdAt"`
	Likes       int     `json:"likes"`
}

// PostPayload 是构造 PostDTO 需要的数据聚合
type PostPayload struct {
	Post       *models.Post
	Author     UserDTO
	Board      BoardDTO
	Likes      int
	Comments   int
	CommentIDs []CommentDTO
}

func SerializePost(p PostPayload) PostDTO {
	out := PostDTO{
		ID:        p.Post.ID,
		Type:      p.Post.Type,
		Title:     p.Post.Title,
		Content:   p.Post.Content,
		Author:    p.Author,
		Board:     p.Board,
		Tags:      parseJSONArray(p.Post.Tags),
		Images:    parseJSONArray(p.Post.Images),
		VideoURL:  p.Post.VideoURL,
		Cover:     p.Post.Cover,
		CreatedAt: p.Post.CreatedAt.UTC().Format(time.RFC3339),
		Likes:     p.Likes,
		Comments:  p.Comments,
		Shares:    p.Post.Shares,
		Views:     p.Post.Views,
	}
	if p.Post.ContentText != nil {
		out.ContentText = p.Post.ContentText
	}
	if p.Post.ContentJson != nil && *p.Post.ContentJson != "" {
		var v any
		if err := json.Unmarshal([]byte(*p.Post.ContentJson), &v); err == nil {
			out.ContentJson = v
		}
	}
	if len(p.CommentIDs) > 0 {
		out.CommentList = p.CommentIDs
	}
	return out
}

// --------------- Helpers ---------------

// parseJSONArray 解析数据库里的 JSON 字符串字段(多肉项目里数组字段全部这样存)
func parseJSONArray(s *string) []string {
	if s == nil || *s == "" {
		return []string{}
	}
	var arr []string
	if err := json.Unmarshal([]byte(*s), &arr); err != nil {
		return []string{}
	}
	return arr
}

// getFirstIcon 从 icons JSON 数组中获取第一个图标，如果为空返回空字符串
func getFirstIcon(icons string) string {
	if icons == "" {
		return ""
	}
	var arr []string
	if err := json.Unmarshal([]byte(icons), &arr); err != nil || len(arr) == 0 {
		return ""
	}
	return arr[0]
}
