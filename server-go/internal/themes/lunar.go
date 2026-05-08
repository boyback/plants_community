package themes

// 与 src/lib/lunar.ts 对齐的查表。
// 覆盖 2025-2035 的春节、元宵、端午、中秋、七夕。
// 年份超出则 fallback 到声明的公历窗口。

import "time"

type lunarEvent struct {
	slug      string
	dates     map[int][2]int // year -> [month, day]
	padBefore int
	padAfter  int
}

var lunarEvents = []lunarEvent{
	{
		slug: "spring-festival",
		dates: map[int][2]int{
			2025: {1, 29}, 2026: {2, 17}, 2027: {2, 6}, 2028: {1, 26},
			2029: {2, 13}, 2030: {2, 3}, 2031: {1, 23}, 2032: {2, 11},
			2033: {1, 31}, 2034: {2, 19}, 2035: {2, 8},
		},
		padBefore: 2, padAfter: 5,
	},
	{
		slug: "lantern",
		dates: map[int][2]int{
			2025: {2, 12}, 2026: {3, 3}, 2027: {2, 20}, 2028: {2, 9},
			2029: {2, 27}, 2030: {2, 17}, 2031: {2, 6}, 2032: {2, 25},
			2033: {2, 14}, 2034: {3, 5}, 2035: {2, 22},
		},
		padBefore: 0, padAfter: 1,
	},
	{
		slug: "dragon-boat",
		dates: map[int][2]int{
			2025: {5, 31}, 2026: {6, 19}, 2027: {6, 9}, 2028: {5, 28},
			2029: {6, 16}, 2030: {6, 5}, 2031: {6, 24}, 2032: {6, 12},
			2033: {6, 1}, 2034: {6, 20}, 2035: {6, 10},
		},
		padBefore: 1, padAfter: 2,
	},
	{
		slug: "mid-autumn",
		dates: map[int][2]int{
			2025: {10, 6}, 2026: {9, 25}, 2027: {9, 15}, 2028: {10, 3},
			2029: {9, 22}, 2030: {9, 12}, 2031: {10, 1}, 2032: {9, 19},
			2033: {9, 8}, 2034: {9, 27}, 2035: {9, 17},
		},
		padBefore: 1, padAfter: 2,
	},
}

var lunarSlugs = func() map[string]*lunarEvent {
	m := map[string]*lunarEvent{}
	for i := range lunarEvents {
		m[lunarEvents[i].slug] = &lunarEvents[i]
	}
	return m
}()

// inLunarWindow 返回某日期是否处在农历节日的活跃窗口里(按年查表)
func inLunarWindow(ev *lunarEvent, t time.Time) bool {
	// 检查相邻 3 年(处理年末跨年)
	year := t.Year()
	for _, y := range []int{year - 1, year, year + 1} {
		pair, ok := ev.dates[y]
		if !ok {
			continue
		}
		center := time.Date(y, time.Month(pair[0]), pair[1], 0, 0, 0, 0, time.UTC)
		start := center.AddDate(0, 0, -ev.padBefore)
		end := center.AddDate(0, 0, ev.padAfter+1)
		// 归一化到 date-only 做包含比较
		d := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		if (d.Equal(start) || d.After(start)) && d.Before(end) {
			return true
		}
	}
	return false
}

// isLunarSlug 是否是农历节日 slug
func isLunarSlug(slug string) (*lunarEvent, bool) {
	ev, ok := lunarSlugs[slug]
	return ev, ok
}
