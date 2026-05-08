// Package themes 定义社区节日主题。
//
// 设计原则:
//   - 纯数据 + 纯函数,后端只负责「今天哪些主题活跃」,前端负责渲染。
//   - 单一窗口(startMonth/startDay → endMonth/endDay)表达节日持续时间。
//     跨年(如 12.20 → 1.2)通过两个窗口分段表达。
//   - 每个主题附带足量前端可消费的元数据:色板、emoji、装饰槽位。
package themes

import (
	"time"
)

// Decoration 主题装饰元数据,给前端渲染层消费。
type Decoration struct {
	// 主色(Tailwind 颜色名或具体 CSS hex),用于顶部导航渐变
	AccentFrom string `json:"accentFrom"`
	AccentTo   string `json:"accentTo"`
	// 顶部导航左上角 Logo 旁叠加的 emoji(如 🎄🐰🎃)
	LogoBadge string `json:"logoBadge"`
	// 头像右上角叠加的小装饰 emoji
	AvatarBadge string `json:"avatarBadge"`
	// 顶部横幅文案(用 locale 映射前端再转)
	BannerTextKey string `json:"bannerTextKey"`
	// 背景漂浮元素(前端用 CSS 画粒子动画)
	ParticleEmoji string `json:"particleEmoji"`
	ParticleCount int    `json:"particleCount"` // 0 表示不启用粒子
}

// Window 主题活跃窗口(按月.日,不含年份)
type Window struct {
	StartMonth int
	StartDay   int
	EndMonth   int
	EndDay     int
}

// Theme 单个主题定义
type Theme struct {
	Slug       string       `json:"slug"`
	Name       string       `json:"name"` // 中文展示名,前端用 i18n key theme.<slug>
	Category   string       `json:"category"` // cn-festival / intl-festival / commemorative
	Windows    []Window     `json:"-"` // 不直出,活跃判定用
	Decoration Decoration   `json:"decoration"`
}

// Active 判断主题在 t 时刻是否活跃。
//
// 规则:
//   - 如果 slug 是农历节日且当年在查表范围里,只看农历窗口(公历窗口忽略)
//   - 如果 slug 是农历节日但当年不在查表里,回退到公历窗口
//   - 其他 slug 直接用公历窗口
func (th *Theme) Active(t time.Time) bool {
	if ev, ok := isLunarSlug(th.Slug); ok {
		// 当年在查表范围 → 权威,不叠加公历窗口
		if _, inTable := ev.dates[t.Year()]; inTable {
			return inLunarWindow(ev, t)
		}
		// 相邻年份也可能覆盖(年末跨年场景)
		if inLunarWindow(ev, t) {
			return true
		}
		// 不在查表范围:fallback 到公历窗口
	}
	m, d := int(t.Month()), t.Day()
	for _, w := range th.Windows {
		if inWindow(m, d, w) {
			return true
		}
	}
	return false
}

func inWindow(m, d int, w Window) bool {
	start := w.StartMonth*100 + w.StartDay
	end := w.EndMonth*100 + w.EndDay
	cur := m*100 + d
	if start <= end {
		return cur >= start && cur <= end
	}
	// 跨年窗口:如 12.20 → 1.2
	return cur >= start || cur <= end
}

// Registry 所有主题。按配置顺序决定前端展示优先级(先活跃者优先)。
var Registry = []Theme{
	{
		Slug: "spring-festival", Name: "春节", Category: "cn-festival",
		Windows: []Window{
			{1, 20, 2, 15}, // 大概覆盖除夕到元宵
			{2, 1, 2, 10},
		},
		Decoration: Decoration{
			AccentFrom: "#ff4d4f", AccentTo: "#ffbf3c",
			LogoBadge: "🏮", AvatarBadge: "🧧",
			BannerTextKey: "theme.springFestival.banner",
			ParticleEmoji: "🧨", ParticleCount: 8,
		},
	},
	{
		Slug: "lantern", Name: "灯会", Category: "cn-festival",
		Windows: []Window{{2, 14, 2, 16}},
		Decoration: Decoration{
			AccentFrom: "#ff7875", AccentTo: "#ffc53d",
			LogoBadge: "🏮", AvatarBadge: "🌕",
			BannerTextKey: "theme.lantern.banner",
			ParticleEmoji: "🏮", ParticleCount: 10,
		},
	},
	{
		Slug: "dragon-boat", Name: "端午节", Category: "cn-festival",
		Windows: []Window{{6, 3, 6, 9}}, // 公历大致覆盖,精确要查阴历
		Decoration: Decoration{
			AccentFrom: "#52c41a", AccentTo: "#faad14",
			LogoBadge: "🐉", AvatarBadge: "🍃",
			BannerTextKey: "theme.dragonBoat.banner",
			ParticleEmoji: "🍃", ParticleCount: 6,
		},
	},
	{
		Slug: "mid-autumn", Name: "中秋节", Category: "cn-festival",
		Windows: []Window{{9, 13, 9, 18}}, // 公历范围,农历 8.15 大致落在 9 月中
		Decoration: Decoration{
			AccentFrom: "#faad14", AccentTo: "#b37feb",
			LogoBadge: "🌕", AvatarBadge: "🐰",
			BannerTextKey: "theme.midAutumn.banner",
			ParticleEmoji: "🌙", ParticleCount: 6,
		},
	},
	{
		Slug: "national-day", Name: "国庆节", Category: "cn-festival",
		Windows: []Window{{10, 1, 10, 7}},
		Decoration: Decoration{
			AccentFrom: "#f5222d", AccentTo: "#ffd666",
			LogoBadge: "🇨🇳", AvatarBadge: "⭐",
			BannerTextKey: "theme.nationalDay.banner",
			ParticleEmoji: "⭐", ParticleCount: 10,
		},
	},
	{
		Slug: "halloween", Name: "万圣节", Category: "intl-festival",
		Windows: []Window{{10, 25, 11, 2}},
		Decoration: Decoration{
			AccentFrom: "#faad14", AccentTo: "#722ed1",
			LogoBadge: "🎃", AvatarBadge: "👻",
			BannerTextKey: "theme.halloween.banner",
			ParticleEmoji: "🦇", ParticleCount: 8,
		},
	},
	{
		Slug: "christmas", Name: "圣诞新年", Category: "intl-festival",
		Windows: []Window{{12, 20, 12, 31}, {1, 1, 1, 2}},
		Decoration: Decoration{
			AccentFrom: "#ff4d4f", AccentTo: "#52c41a",
			LogoBadge: "🎄", AvatarBadge: "🎅",
			BannerTextKey: "theme.christmas.banner",
			ParticleEmoji: "❄️", ParticleCount: 12,
		},
	},
	{
		Slug: "valentine", Name: "情人节 · 520", Category: "intl-festival",
		Windows: []Window{{2, 13, 2, 15}, {5, 19, 5, 21}, {8, 6, 8, 8}}, // 2.14 / 5.20 / 七夕
		Decoration: Decoration{
			AccentFrom: "#ff85c0", AccentTo: "#ff4d4f",
			LogoBadge: "💝", AvatarBadge: "❤️",
			BannerTextKey: "theme.valentine.banner",
			ParticleEmoji: "💗", ParticleCount: 8,
		},
	},
	{
		Slug: "womens-day", Name: "女神节", Category: "intl-festival",
		Windows: []Window{{3, 7, 3, 8}},
		Decoration: Decoration{
			AccentFrom: "#eb2f96", AccentTo: "#ff85c0",
			LogoBadge: "🌷", AvatarBadge: "🌹",
			BannerTextKey: "theme.womensDay.banner",
			ParticleEmoji: "🌸", ParticleCount: 8,
		},
	},
	{
		Slug: "childrens-day", Name: "儿童节", Category: "intl-festival",
		Windows: []Window{{6, 1, 6, 1}},
		Decoration: Decoration{
			AccentFrom: "#69c0ff", AccentTo: "#ffd666",
			LogoBadge: "🎈", AvatarBadge: "🧸",
			BannerTextKey: "theme.childrensDay.banner",
			ParticleEmoji: "🎈", ParticleCount: 10,
		},
	},
	{
		Slug: "arbor-day", Name: "植树节", Category: "commemorative",
		Windows: []Window{{3, 10, 3, 13}},
		Decoration: Decoration{
			AccentFrom: "#73d13d", AccentTo: "#237804",
			LogoBadge: "🌲", AvatarBadge: "🌱",
			BannerTextKey: "theme.arborDay.banner",
			ParticleEmoji: "🍃", ParticleCount: 8,
		},
	},
	{
		Slug: "earth-day", Name: "世界地球日", Category: "commemorative",
		Windows: []Window{{4, 20, 4, 23}},
		Decoration: Decoration{
			AccentFrom: "#1677ff", AccentTo: "#52c41a",
			LogoBadge: "🌍", AvatarBadge: "🌿",
			BannerTextKey: "theme.earthDay.banner",
			ParticleEmoji: "🌿", ParticleCount: 8,
		},
	},
	{
		Slug: "community-birthday", Name: "社区生日", Category: "commemorative",
		// 占位:社区正式生日请替换为实际值。这里用 5 月初作为示例,3 天庆祝。
		Windows: []Window{{5, 1, 5, 3}},
		Decoration: Decoration{
			AccentFrom: "#eb2f96", AccentTo: "#faad14",
			LogoBadge: "🎉", AvatarBadge: "🎂",
			BannerTextKey: "theme.communityBirthday.banner",
			ParticleEmoji: "🎊", ParticleCount: 12,
		},
	},
}

// ActiveAt 返回在 t 时刻所有活跃的主题
func ActiveAt(t time.Time) []*Theme {
	var out []*Theme
	for i := range Registry {
		if Registry[i].Active(t) {
			out = append(out, &Registry[i])
		}
	}
	return out
}

// ByDate 以 (month, day) 方式列出 365 天内所有主题窗口,
// 给前端展示「全年主题时间表」。
func Calendar() []map[string]any {
	out := make([]map[string]any, 0, len(Registry))
	for _, th := range Registry {
		windows := make([]map[string]int, 0, len(th.Windows))
		for _, w := range th.Windows {
			windows = append(windows, map[string]int{
				"startMonth": w.StartMonth,
				"startDay":   w.StartDay,
				"endMonth":   w.EndMonth,
				"endDay":     w.EndDay,
			})
		}
		out = append(out, map[string]any{
			"slug":       th.Slug,
			"name":       th.Name,
			"category":   th.Category,
			"windows":    windows,
			"decoration": th.Decoration,
		})
	}
	return out
}
