package themes

import (
	"testing"
	"time"
)

func TestRegistryStructure(t *testing.T) {
	if len(Registry) < 13 {
		t.Fatalf("expected at least 13 themes, got %d", len(Registry))
	}
	seen := map[string]bool{}
	for _, th := range Registry {
		if th.Slug == "" {
			t.Errorf("empty slug in theme %q", th.Name)
		}
		if seen[th.Slug] {
			t.Errorf("duplicate slug %q", th.Slug)
		}
		seen[th.Slug] = true
		if len(th.Windows) == 0 {
			t.Errorf("theme %q has no window", th.Slug)
		}
		if th.Decoration.LogoBadge == "" {
			t.Errorf("theme %q missing logoBadge", th.Slug)
		}
	}
}

func TestActiveAt(t *testing.T) {
	cases := []struct {
		label     string
		date      time.Time
		wantSlug  string
		wantNotIn string
	}{
		{"圣诞节", time.Date(2026, 12, 25, 10, 0, 0, 0, time.UTC), "christmas", "halloween"},
		{"跨年 1.1", time.Date(2027, 1, 1, 3, 0, 0, 0, time.UTC), "christmas", "halloween"},
		{"万圣节", time.Date(2026, 10, 31, 10, 0, 0, 0, time.UTC), "halloween", "christmas"},
		// 2026 端午 = 公历 6-19;2026 中秋 = 公历 9-25
		{"端午节", time.Date(2026, 6, 19, 10, 0, 0, 0, time.UTC), "dragon-boat", "halloween"},
		{"中秋节", time.Date(2026, 9, 25, 10, 0, 0, 0, time.UTC), "mid-autumn", "halloween"},
		{"国庆节", time.Date(2026, 10, 3, 10, 0, 0, 0, time.UTC), "national-day", "christmas"},
		{"植树节", time.Date(2026, 3, 12, 10, 0, 0, 0, time.UTC), "arbor-day", "christmas"},
	}
	for _, c := range cases {
		t.Run(c.label, func(t *testing.T) {
			got := ActiveAt(c.date)
			found := false
			notFound := true
			for _, th := range got {
				if th.Slug == c.wantSlug {
					found = true
				}
				if th.Slug == c.wantNotIn {
					notFound = false
				}
			}
			if !found {
				t.Errorf("expected %q active on %v, got %v", c.wantSlug, c.date, slugs(got))
			}
			if !notFound {
				t.Errorf("%q should NOT be active on %v", c.wantNotIn, c.date)
			}
		})
	}
}

func TestInactive(t *testing.T) {
	// 5 月 7 日既非社区生日(示例是 5.1-5.3)也非任何其他节日
	d := time.Date(2026, 5, 7, 10, 0, 0, 0, time.UTC)
	got := ActiveAt(d)
	for _, th := range got {
		if th.Slug == "halloween" || th.Slug == "christmas" {
			t.Errorf("%q should not be active on 5/7, got %v", th.Slug, d)
		}
	}
}

func TestInWindowCrossYear(t *testing.T) {
	w := Window{StartMonth: 12, StartDay: 20, EndMonth: 1, EndDay: 2}
	cases := []struct {
		m, d int
		want bool
	}{
		{12, 19, false},
		{12, 20, true},
		{12, 31, true},
		{1, 1, true},
		{1, 2, true},
		{1, 3, false},
	}
	for _, c := range cases {
		if got := inWindow(c.m, c.d, w); got != c.want {
			t.Errorf("inWindow(%d-%d) = %v, want %v", c.m, c.d, got, c.want)
		}
	}
}

func slugs(ts []*Theme) []string {
	out := make([]string, 0, len(ts))
	for _, t := range ts {
		out = append(out, t.Slug)
	}
	return out
}
