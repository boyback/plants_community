package feed

import (
	"math"
	"testing"
	"time"
)

var BaseNow = time.Date(2026, 5, 8, 0, 0, 0, 0, time.UTC)

func TestComputeHotScore_Positive(t *testing.T) {
	s := ComputeHotScore(HotInputs{
		Likes:     10,
		CreatedAt: BaseNow.Add(-time.Hour),
	}, BaseNow)
	if s <= 0 {
		t.Fatalf("expected > 0, got %v", s)
	}
}

func TestComputeHotScore_MoreInteractionsHigher(t *testing.T) {
	a := ComputeHotScore(HotInputs{Likes: 1, CreatedAt: BaseNow.Add(-time.Hour)}, BaseNow)
	b := ComputeHotScore(HotInputs{Likes: 100, CreatedAt: BaseNow.Add(-time.Hour)}, BaseNow)
	if !(b > a) {
		t.Fatalf("100 likes should > 1 like, got a=%v b=%v", a, b)
	}
}

func TestComputeHotScore_OlderLower(t *testing.T) {
	r := ComputeHotScore(HotInputs{Likes: 50, CreatedAt: BaseNow.Add(-time.Hour)}, BaseNow)
	o := ComputeHotScore(HotInputs{Likes: 50, CreatedAt: BaseNow.Add(-30 * 24 * time.Hour)}, BaseNow)
	if !(r > o*5) {
		t.Fatalf("recent should be far higher: r=%v o=%v", r, o)
	}
}

func TestComputeHotScore_24hBoost(t *testing.T) {
	w := ComputeHotScore(HotInputs{Likes: 10, CreatedAt: BaseNow.Add(-23 * time.Hour)}, BaseNow)
	p := ComputeHotScore(HotInputs{Likes: 10, CreatedAt: BaseNow.Add(-25 * time.Hour)}, BaseNow)
	if !(w > p*1.2) {
		t.Fatalf("within 24h boost broken: %v vs %v", w, p)
	}
}

func TestComputeHotScore_VipAndCover(t *testing.T) {
	created := BaseNow.Add(-time.Hour)
	base := ComputeHotScore(HotInputs{Likes: 10, CreatedAt: created}, BaseNow)
	vip := ComputeHotScore(HotInputs{Likes: 10, CreatedAt: created, AuthorVip: true}, BaseNow)
	cov := ComputeHotScore(HotInputs{Likes: 10, CreatedAt: created, HasCover: true}, BaseNow)
	if vip <= base || cov <= base {
		t.Fatalf("modifier broken")
	}
	if math.Abs(vip/base-1.1) > 0.001 {
		t.Fatalf("vip should boost 1.1x, got %v", vip/base)
	}
	if math.Abs(cov/base-1.05) > 0.001 {
		t.Fatalf("cover should boost 1.05x, got %v", cov/base)
	}
}

func TestSoftmax(t *testing.T) {
	out := Softmax(map[string]int{"a": 1, "b": 1, "c": 1})
	if math.Abs(out["a"]-1.0/3) > 0.0001 {
		t.Fatalf("uniform softmax fail: %v", out)
	}
	sum := 0.0
	for _, v := range out {
		sum += v
	}
	if math.Abs(sum-1) > 0.0001 {
		t.Fatalf("softmax sum != 1: %v", sum)
	}
}
