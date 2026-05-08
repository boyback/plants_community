package themes

import (
	"testing"
	"time"
)

func TestLunarSpringFestival(t *testing.T) {
	// 2026 春节 = 公历 2.17,窗口 2.15 (padBefore=2) - 2.22 (padAfter=5)
	cases := []struct {
		date time.Time
		want bool
		note string
	}{
		{time.Date(2026, 2, 14, 10, 0, 0, 0, time.UTC), false, "2.14 还不到"},
		{time.Date(2026, 2, 15, 10, 0, 0, 0, time.UTC), true, "2.15 开始"},
		{time.Date(2026, 2, 17, 10, 0, 0, 0, time.UTC), true, "2.17 春节正日"},
		{time.Date(2026, 2, 22, 10, 0, 0, 0, time.UTC), true, "2.22 还在窗口"},
		{time.Date(2026, 2, 23, 10, 0, 0, 0, time.UTC), false, "2.23 窗口外"},
	}
	th := findTheme("spring-festival")
	if th == nil {
		t.Fatal("spring-festival not in registry")
	}
	for _, c := range cases {
		got := th.Active(c.date)
		if got != c.want {
			t.Errorf("%s: Active(%v) = %v, want %v", c.note, c.date.Format("2006-01-02"), got, c.want)
		}
	}
}

func TestLunarDragonBoat2027(t *testing.T) {
	// 2027 端午 = 公历 6.9,窗口 6.8 (padBefore=1) - 6.11 (padAfter=2)
	th := findTheme("dragon-boat")
	if th == nil {
		t.Fatal("dragon-boat not in registry")
	}
	cases := []struct {
		date time.Time
		want bool
	}{
		{time.Date(2027, 6, 7, 0, 0, 0, 0, time.UTC), false},
		{time.Date(2027, 6, 8, 0, 0, 0, 0, time.UTC), true},
		{time.Date(2027, 6, 9, 0, 0, 0, 0, time.UTC), true},
		{time.Date(2027, 6, 11, 0, 0, 0, 0, time.UTC), true},
		{time.Date(2027, 6, 12, 0, 0, 0, 0, time.UTC), false},
	}
	for _, c := range cases {
		got := th.Active(c.date)
		if got != c.want {
			t.Errorf("2027 dragon-boat Active(%s) = %v, want %v",
				c.date.Format("2006-01-02"), got, c.want)
		}
	}
}

func TestLunarMidAutumnMultiYear(t *testing.T) {
	// 2025 中秋 10.6;2026 中秋 9.25;2028 中秋 10.3
	th := findTheme("mid-autumn")
	cases := []struct {
		date time.Time
		want bool
	}{
		{time.Date(2025, 10, 5, 0, 0, 0, 0, time.UTC), true},
		{time.Date(2025, 10, 6, 0, 0, 0, 0, time.UTC), true},
		{time.Date(2025, 10, 8, 0, 0, 0, 0, time.UTC), true},
		{time.Date(2025, 10, 9, 0, 0, 0, 0, time.UTC), false},
		{time.Date(2026, 9, 24, 0, 0, 0, 0, time.UTC), true},
		{time.Date(2026, 9, 27, 0, 0, 0, 0, time.UTC), true},
		{time.Date(2028, 10, 2, 0, 0, 0, 0, time.UTC), true},
	}
	for _, c := range cases {
		got := th.Active(c.date)
		if got != c.want {
			t.Errorf("mid-autumn Active(%s) = %v, want %v",
				c.date.Format("2006-01-02"), got, c.want)
		}
	}
}

func TestLunarFallbackMissingYear(t *testing.T) {
	// 2050 年超出查表范围,应回退到公历窗口 6.3-6.9
	th := findTheme("dragon-boat")
	d1 := time.Date(2050, 6, 5, 0, 0, 0, 0, time.UTC)
	if !th.Active(d1) {
		t.Errorf("fallback: 2050-06-05 should be active (falls back to 6.3-6.9)")
	}
	d2 := time.Date(2050, 6, 20, 0, 0, 0, 0, time.UTC)
	if th.Active(d2) {
		t.Errorf("fallback: 2050-06-20 should NOT be active")
	}
}

func findTheme(slug string) *Theme {
	for i := range Registry {
		if Registry[i].Slug == slug {
			return &Registry[i]
		}
	}
	return nil
}
