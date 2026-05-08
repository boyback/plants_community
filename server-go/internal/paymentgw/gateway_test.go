package paymentgw

import (
	"strings"
	"testing"
)

func TestMockCreatePayment(t *testing.T) {
	in := &Input{
		PayNo: "PY123", UserID: "u1", Amount: 19900,
		Channel: "alipay", Subject: "test", ExpireMinutes: 15,
	}
	r, err := MockGateway.CreatePayment(in)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(r.Qrcode, "mock://alipay/pay/PY123/") {
		t.Errorf("unexpected qrcode: %s", r.Qrcode)
	}
}

func TestMockWebhookRefused(t *testing.T) {
	if _, err := MockGateway.VerifyWebhook("body", nil); err == nil {
		t.Error("mock 应拒绝 webhook 验签")
	}
}

type fakeAlipayClient struct {
	lastMethod string
	lastBiz    map[string]any
	exec       map[string]any
	signOK     bool
}

func (f *fakeAlipayClient) Execute(method string, biz map[string]any, _ string) (map[string]any, error) {
	f.lastMethod = method
	f.lastBiz = biz
	return f.exec, nil
}
func (f *fakeAlipayClient) CheckNotifySign(map[string]string) bool { return f.signOK }

func TestAlipayCreate(t *testing.T) {
	c := &fakeAlipayClient{exec: map[string]any{"qr_code": "https://qr.alipay.com/xxx"}}
	g := NewAlipayGateway(c, "https://cb")
	r, err := g.CreatePayment(&Input{
		PayNo: "PY456", Amount: 19900, Channel: "alipay",
		Subject: "test", ExpireMinutes: 15,
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.Qrcode != "https://qr.alipay.com/xxx" {
		t.Errorf("qrcode 错: %s", r.Qrcode)
	}
	if c.lastMethod != "alipay.trade.precreate" {
		t.Errorf("method 错: %s", c.lastMethod)
	}
	if c.lastBiz["out_trade_no"] != "PY456" {
		t.Error("out_trade_no 不对")
	}
	if c.lastBiz["total_amount"] != "199.00" {
		t.Errorf("金额格式化错: %v", c.lastBiz["total_amount"])
	}
}

func TestAlipayWebhookVerify(t *testing.T) {
	cOK := &fakeAlipayClient{signOK: true}
	g := NewAlipayGateway(cOK, "")
	payNo, err := g.VerifyWebhook("out_trade_no=PY789&trade_status=TRADE_SUCCESS", nil)
	if err != nil {
		t.Fatal(err)
	}
	if payNo != "PY789" {
		t.Errorf("payNo 错: %s", payNo)
	}

	cBad := &fakeAlipayClient{signOK: false}
	gBad := NewAlipayGateway(cBad, "")
	if _, err := gBad.VerifyWebhook("out_trade_no=PY789", nil); err == nil {
		t.Error("sign 失败应报错")
	}
}

func TestAlipayQueryStatus(t *testing.T) {
	cases := map[string]Status{
		"TRADE_SUCCESS":  StatusPaid,
		"TRADE_FINISHED": StatusPaid,
		"TRADE_CLOSED":   StatusCanceled,
		"WAIT_BUYER_PAY": StatusPending,
		"UNKNOWN":        StatusUnknown,
	}
	for tradeStatus, want := range cases {
		c := &fakeAlipayClient{exec: map[string]any{"trade_status": tradeStatus}}
		g := NewAlipayGateway(c, "")
		got, err := g.QueryStatus("PY1")
		if err != nil {
			t.Fatal(err)
		}
		if got != want {
			t.Errorf("%s -> %s, want %s", tradeStatus, got, want)
		}
	}
}

func TestPickFallback(t *testing.T) {
	// 设 alipay 但没 client,应退回 Mock
	t.Setenv("PAYMENT_GATEWAY", "alipay")
	g := Pick(nil, "")
	if g != MockGateway {
		t.Error("没 client 时应回退到 Mock")
	}

	t.Setenv("PAYMENT_GATEWAY", "")
	if Pick(nil, "") != MockGateway {
		t.Error("默认应是 Mock")
	}
}
