package feed

import (
	"math"
	"time"
)

// HotInputs 单帖输入
type HotInputs struct {
	Likes     int
	Comments  int
	Collects  int
	Shares    int
	Views     int
	CreatedAt time.Time
	AuthorVip bool
	HasCover  bool
}

// ComputeHotScore 与 Next.js 端 src/lib/feed/ranker.ts 公式严格一致。
//
//	gravity = 1.6
//	score = log10(1 + interactions + 1) / (hours+2)^gravity * modifier
func ComputeHotScore(in HotInputs, now time.Time) float64 {
	interactions := float64(maxInt(0, in.Likes)) +
		float64(maxInt(0, in.Comments))*2 +
		float64(maxInt(0, in.Collects))*3 +
		float64(maxInt(0, in.Shares))*0.5 +
		float64(maxInt(0, in.Views))*0.05
	hours := math.Max(0, now.Sub(in.CreatedAt).Hours())
	gravity := 1.6
	base := math.Log10(1+interactions+1) / math.Pow(hours+2, gravity)

	modifier := 1.0
	if in.AuthorVip {
		modifier *= 1.1
	}
	if in.HasCover {
		modifier *= 1.05
	}
	if hours < 24 {
		modifier *= 1.3
	}
	return base * modifier
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// UserProfile 个性化输入
type UserProfile struct {
	UserID            string
	FollowingSet      map[string]bool
	FollowedBoardIDs  map[string]bool
	CategoryAffinity  map[string]float64 // softmax 归一化
}

// PostForRank 排序所需的 post 字段
type PostForRank struct {
	ID         string
	AuthorID   string
	CategoryID *string
	GenusID    *string
	SpeciesID  *string
	HotScore   float64
	CreatedAt  time.Time
}

// Personalize 个性化加权,与 ranker.ts personalize 一致
func Personalize(p PostForRank, u *UserProfile) float64 {
	base := p.HotScore
	if u == nil {
		return base
	}
	bonus := 0.0
	if u.FollowingSet[p.AuthorID] {
		bonus += 0.8
	}
	for _, bid := range []*string{p.CategoryID, p.GenusID, p.SpeciesID} {
		if bid != nil && u.FollowedBoardIDs[*bid] {
			bonus += 0.4
			break
		}
	}
	scale := 1.0
	if p.CategoryID != nil {
		if aff, ok := u.CategoryAffinity[*p.CategoryID]; ok {
			scale = 0.5 + aff
		}
	}
	return base*scale + bonus
}

// Softmax 把计数转 0~1 权重(和为 1)
func Softmax(counts map[string]int) map[string]float64 {
	if len(counts) == 0 {
		return map[string]float64{}
	}
	maxV := math.Inf(-1)
	for _, v := range counts {
		fv := float64(v)
		if fv > maxV {
			maxV = fv
		}
	}
	sum := 0.0
	exp := make(map[string]float64, len(counts))
	for k, v := range counts {
		e := math.Exp(float64(v) - maxV)
		exp[k] = e
		sum += e
	}
	out := make(map[string]float64, len(counts))
	for k, e := range exp {
		out[k] = e / sum
	}
	return out
}
