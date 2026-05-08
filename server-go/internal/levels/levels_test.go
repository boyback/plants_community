package levels

import "testing"

func TestLevelByExp(t *testing.T) {
	cases := []struct {
		exp  int
		want int
	}{
		{0, 1},
		{49, 1},
		{50, 2},
		{149, 2},
		{150, 3},
		{349, 3},
		{350, 4},
		{699, 4},
		{700, 5},
		{1199, 5},
		{1200, 6},
		{1999, 6},
		{2000, 7},
		{3499, 7},
		{3500, 8},
		{5999, 8},
		{6000, 9},
		{9999, 9},
		{10000, 10},
		{99999, 10},
	}
	for _, c := range cases {
		if got := LevelByExp(c.exp); got != c.want {
			t.Errorf("LevelByExp(%d) = %d, want %d", c.exp, got, c.want)
		}
	}
}

func TestHasPermission(t *testing.T) {
	// Lv.3 不能发图,Lv.4 可以;VIP 无视等级
	cases := []struct {
		level  int
		isVip  bool
		perm   Permission
		want   bool
		reason string
	}{
		{3, false, PermPostImage, false, "Lv.3 不能发图"},
		{4, false, PermPostImage, true, "Lv.4 可以发图"},
		{2, true, PermPostImage, true, "VIP 可以跳级"},
		{1, false, PermComment, true, "新手就能评论"},
		{1, false, PermPostRich, false, "Lv.1 不能发富文本"},
		{3, false, PermPostRich, true, "Lv.3 能发富文本"},
		{7, false, PermMarketSell, false, "Lv.7 不能卖"},
		{8, false, PermMarketSell, true, "Lv.8 能卖"},
		{1, true, PermMarketSell, true, "VIP 能卖"},
		{10, false, PermBadgeChoose, true, "满级能选徽章"},
		{9, false, PermBadgeChoose, false, "Lv.9 不能选徽章"},
	}
	for _, c := range cases {
		got := Has(c.level, c.isVip, c.perm)
		if got != c.want {
			t.Errorf("Has(%d, vip=%v, %v) = %v, want %v // %s",
				c.level, c.isVip, c.perm, got, c.want, c.reason)
		}
	}
}

func TestExpProgress(t *testing.T) {
	// Lv.5 exp 阈值 700,Lv.6 = 1200;exp=1000 应在 Lv.5 里,percent = (1000-700)/(1200-700)= 60
	info := ExpProgress(1000)
	if info.Level != 5 {
		t.Errorf("level = %d, want 5", info.Level)
	}
	if info.Percent != 60 {
		t.Errorf("percent = %d, want 60", info.Percent)
	}
	if info.PointsToNext != 200 {
		t.Errorf("pointsToNext = %d, want 200", info.PointsToNext)
	}
	if info.IsMax {
		t.Error("IsMax should be false")
	}

	// 满级
	info = ExpProgress(100000)
	if !info.IsMax {
		t.Error("IsMax should be true for 100000 exp")
	}
}

func TestPermForPostType(t *testing.T) {
	if PermForPostType("rich") != PermPostRich {
		t.Error("rich -> PermPostRich")
	}
	if PermForPostType("help") != PermPostRich {
		t.Error("help should fall back to PermPostRich")
	}
	if PermForPostType("unknown") != "" {
		t.Error("unknown should be empty")
	}
}

func TestIsVipActive(t *testing.T) {
	if !IsVipActive(true, 0, 1000) {
		t.Error("lifetime VIP should be active")
	}
	if !IsVipActive(false, 2000, 1000) {
		t.Error("expireAt 2000 > now 1000 should be active")
	}
	if IsVipActive(false, 500, 1000) {
		t.Error("expired VIP should be inactive")
	}
}
