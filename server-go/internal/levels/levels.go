// Package levels mirrors Next.js 的 src/lib/levels.ts:
//   10 级等级体系 + 累积权限 + VIP 无视等级的权限快通道。
package levels

import "fmt"

type Permission string

const (
	PermComment     Permission = "comment"
	PermPostRich    Permission = "post:rich"
	PermPostShort   Permission = "post:short"
	PermPostImage   Permission = "post:image"
	PermPostVideo   Permission = "post:video"
	PermPostVote    Permission = "post:vote"
	PermPostEvent   Permission = "post:event"
	PermPostCollect Permission = "post:collect"
	PermMarketBuy   Permission = "market:buy"
	PermMarketSell  Permission = "market:sell"
	PermMarketPin   Permission = "market:pin"
	PermBadgeChoose Permission = "badge:choose"
)

type LevelDef struct {
	Level       int          `json:"level"`
	Name        string       `json:"name"`
	ExpRequired int          `json:"expRequired"`
	Permissions []Permission `json:"permissions"`
	Perks       []string     `json:"perks"`
}

// 与 Next.js 保持完全一致
var LEVELS = []LevelDef{
	{1, "新苗", 0, []Permission{PermComment, PermPostShort}, []string{"可发评论", "可发短内容贴"}},
	{2, "小苗", 50, []Permission{PermPostCollect}, []string{"可收藏帖子"}},
	{3, "幼株", 150, []Permission{PermPostRich}, []string{"可发富文本贴"}},
	{4, "青株", 350, []Permission{PermPostImage}, []string{"发帖可带图"}},
	{5, "成株", 700, []Permission{PermPostVideo, PermMarketBuy}, []string{"可发视频贴", "可在交易区购买"}},
	{6, "大株", 1200, []Permission{PermPostVote}, []string{"可发投票贴"}},
	{7, "老桩", 2000, []Permission{PermPostEvent}, []string{"可发 EVENT 贴"}},
	{8, "园艺师", 3500, []Permission{PermMarketSell}, []string{"可在交易区出售"}},
	{9, "大师", 6000, []Permission{PermMarketPin}, []string{"可申请置顶帖子"}},
	{10, "宗师", 10000, []Permission{PermBadgeChoose}, []string{"自选展示徽章"}},
}

var VIPPermissions = []Permission{
	PermComment, PermPostShort, PermPostRich, PermPostImage,
	PermPostVideo, PermPostVote, PermPostEvent, PermPostCollect,
	PermMarketBuy, PermMarketSell, PermMarketPin,
}

// LevelByExp 根据 EXP 反推当前等级
func LevelByExp(exp int) int {
	lv := 1
	for _, def := range LEVELS {
		if exp >= def.ExpRequired {
			lv = def.Level
		} else {
			break
		}
	}
	return lv
}

// PermissionsForLevel 返回某等级累积拥有的全部权限
func PermissionsForLevel(level int) []Permission {
	set := map[Permission]struct{}{}
	for _, def := range LEVELS {
		if def.Level <= level {
			for _, p := range def.Permissions {
				set[p] = struct{}{}
			}
		}
	}
	out := make([]Permission, 0, len(set))
	for p := range set {
		out = append(out, p)
	}
	return out
}

// Has 判断用户(可能是 VIP)是否拥有某权限
func Has(level int, isVip bool, need Permission) bool {
	if isVip {
		for _, p := range VIPPermissions {
			if p == need {
				return true
			}
		}
	}
	for _, p := range PermissionsForLevel(level) {
		if p == need {
			return true
		}
	}
	return false
}

// Hint 生成缺权限时给前端看的提示
func Hint(need Permission) string {
	for _, def := range LEVELS {
		for _, p := range def.Permissions {
			if p == need {
				return fmt.Sprintf("需要 Lv.%d「%s」或开通大会员", def.Level, def.Name)
			}
		}
	}
	return "权限不足"
}

// ExpProgress 返回离下一级的进度(和 TS 一致的字段)
type ExpProgressInfo struct {
	Level           int  `json:"level"`
	CurrentLevelExp int  `json:"currentLevelExp"`
	NextLevelExp    int  `json:"nextLevelExp"`
	Percent         int  `json:"percent"`
	PointsToNext    int  `json:"pointsToNext"`
	IsMax           bool `json:"isMax"`
}

func ExpProgress(exp int) ExpProgressInfo {
	lv := LevelByExp(exp)
	var next *LevelDef
	for i := range LEVELS {
		if LEVELS[i].Level == lv+1 {
			next = &LEVELS[i]
			break
		}
	}
	if next == nil {
		return ExpProgressInfo{Level: lv, CurrentLevelExp: exp, NextLevelExp: exp, Percent: 100, IsMax: true}
	}
	var cur *LevelDef
	for i := range LEVELS {
		if LEVELS[i].Level == lv {
			cur = &LEVELS[i]
			break
		}
	}
	start := 0
	if cur != nil {
		start = cur.ExpRequired
	}
	end := next.ExpRequired
	percent := 0
	if end > start {
		percent = int(float64(exp-start) / float64(end-start) * 100)
		if percent > 100 {
			percent = 100
		}
		if percent < 0 {
			percent = 0
		}
	}
	return ExpProgressInfo{
		Level:           lv,
		CurrentLevelExp: exp - start,
		NextLevelExp:    end - start,
		Percent:         percent,
		PointsToNext:    end - exp,
		IsMax:           false,
	}
}

// 权限 → 类型的快查映射(给 POST /posts 用)
func PermForPostType(postType string) Permission {
	switch postType {
	case "rich":
		return PermPostRich
	case "short":
		return PermPostShort
	case "video":
		return PermPostVideo
	case "vote":
		return PermPostVote
	case "event":
		return PermPostEvent
	case "help":
		// 求助帖权限门槛复用 post:rich(Lv.3),让新手用户也能求助。
		return PermPostRich
	}
	return ""
}

// IsVipActive 判断 User 是否当前 VIP;时间传 nil 表示不是 VIP。
func IsVipActive(vipLifetime bool, expireAtUnix int64, nowUnix int64) bool {
	if vipLifetime {
		return true
	}
	return expireAtUnix > nowUnix
}
