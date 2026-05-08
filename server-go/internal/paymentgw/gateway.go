// Package paymentgw 是支付网关的抽象层。
//
// 对应 TS 侧的 src/lib/payment/gateway.ts。
//
// 当前实现:
//   - MockGateway(默认):生成 mock:// 假二维码
//   - AlipayGateway:支付宝沙箱框架(真实签名/调用通过构造时传入 Client 实现完成)
//
// 切换策略:
//   - 读环境变量 PAYMENT_GATEWAY:`mock` / `alipay`
//   - 具体支付宝 SDK 集成没放进来(避免非必要依赖);
//     预留一个 AlipayClient interface,使用方自行实现或接 3rd 方 SDK。
package paymentgw

import (
	"errors"
	"fmt"
	"os"
	"time"
)

// Input 是创建支付单时需要提供给网关的信息。
type Input struct {
	PayNo         string
	UserID        string
	Amount        int // 分
	Channel       string // alipay / wechat / points
	Subject       string
	ExpireMinutes int
	Meta          map[string]string
}

// Result 是网关创建支付单后返回的信息。
type Result struct {
	Qrcode      string
	RawResponse any
}

// Status 是统一的支付状态返回。
type Status string

const (
	StatusUnknown  Status = ""
	StatusPending  Status = "pending"
	StatusPaid     Status = "paid"
	StatusExpired  Status = "expired"
	StatusCanceled Status = "cancelled"
)

// Gateway 是支付网关抽象。所有实现应该:
//
//   - CreatePayment:调第三方 SDK 预下单,返回可渲染给前端的 qrcode
//   - QueryStatus:主动查询。Mock 返回 StatusUnknown
//   - VerifyWebhook:校验通道回调的签名,成功返回对应的 payNo
type Gateway interface {
	CreatePayment(in *Input) (*Result, error)
	QueryStatus(payNo string) (Status, error)
	VerifyWebhook(rawBody string, headers map[string]string) (string, error)
}

// -----------------------------------------------
//  Mock 网关(默认)
// -----------------------------------------------

type mockGateway struct{}

func (mockGateway) CreatePayment(in *Input) (*Result, error) {
	return &Result{
		Qrcode: fmt.Sprintf("mock://%s/pay/%s/%d", in.Channel, in.PayNo, in.Amount),
	}, nil
}

func (mockGateway) QueryStatus(string) (Status, error) {
	return StatusUnknown, nil
}

func (mockGateway) VerifyWebhook(string, map[string]string) (string, error) {
	return "", errors.New("mock gateway 不支持 webhook 验签")
}

// MockGateway 是默认实例,Demo 里业务串联通过 /api/payments/:payNo/confirm 触发。
var MockGateway Gateway = mockGateway{}

// -----------------------------------------------
//  Alipay 网关(框架)
// -----------------------------------------------

// AlipayClient 抽象真实的支付宝 SDK 调用。
// 实际接入时,写一个用 alipay-sdk-go 或自己组装 RSA2 签名 HTTP 客户端的实现。
type AlipayClient interface {
	// Execute 对应支付宝 SDK 的 Execute 方法,传 API 方法名 + bizContent + notifyURL
	Execute(method string, bizContent map[string]any, notifyURL string) (map[string]any, error)
	// CheckNotifySign 验签 webhook 参数
	CheckNotifySign(params map[string]string) bool
}

type alipayGateway struct {
	Client    AlipayClient
	NotifyURL string
}

func NewAlipayGateway(c AlipayClient, notifyURL string) Gateway {
	return &alipayGateway{Client: c, NotifyURL: notifyURL}
}

func (g *alipayGateway) CreatePayment(in *Input) (*Result, error) {
	biz := map[string]any{
		"out_trade_no":    in.PayNo,
		"total_amount":    fmt.Sprintf("%.2f", float64(in.Amount)/100),
		"subject":         in.Subject,
		"timeout_express": fmt.Sprintf("%dm", in.ExpireMinutes),
	}
	if len(in.Meta) > 0 {
		biz["passback_params"] = metaToPassback(in.Meta)
	}
	resp, err := g.Client.Execute("alipay.trade.precreate", biz, g.NotifyURL)
	if err != nil {
		return nil, err
	}
	qr, _ := resp["qr_code"].(string)
	if qr == "" {
		return nil, fmt.Errorf("支付宝预下单未返回 qr_code: %v", resp)
	}
	return &Result{Qrcode: qr, RawResponse: resp}, nil
}

func (g *alipayGateway) QueryStatus(payNo string) (Status, error) {
	resp, err := g.Client.Execute("alipay.trade.query", map[string]any{
		"out_trade_no": payNo,
	}, "")
	if err != nil {
		return StatusUnknown, err
	}
	status, _ := resp["trade_status"].(string)
	switch status {
	case "TRADE_SUCCESS", "TRADE_FINISHED":
		return StatusPaid, nil
	case "TRADE_CLOSED":
		return StatusCanceled, nil
	case "WAIT_BUYER_PAY":
		return StatusPending, nil
	}
	return StatusUnknown, nil
}

func (g *alipayGateway) VerifyWebhook(rawBody string, _ map[string]string) (string, error) {
	// 支付宝 webhook 是 form-urlencoded,由使用方 parse 成 map 传进来
	// 这里为了统一接口,假设 rawBody 已经解析成 params 参见 ParseFormBody
	params, err := ParseFormBody(rawBody)
	if err != nil {
		return "", err
	}
	if !g.Client.CheckNotifySign(params) {
		return "", errors.New("签名校验失败")
	}
	payNo := params["out_trade_no"]
	if payNo == "" {
		return "", errors.New("缺少 out_trade_no")
	}
	return payNo, nil
}

// -----------------------------------------------
//  工具
// -----------------------------------------------

// ParseFormBody 把 application/x-www-form-urlencoded 的字符串解析成 map
func ParseFormBody(body string) (map[string]string, error) {
	out := map[string]string{}
	if body == "" {
		return out, nil
	}
	for _, pair := range split(body, "&") {
		kv := split(pair, "=")
		if len(kv) != 2 {
			continue
		}
		k, _ := urlQueryDecode(kv[0])
		v, _ := urlQueryDecode(kv[1])
		out[k] = v
	}
	return out, nil
}

// metaToPassback 把 meta map 拼成 passback_params
func metaToPassback(m map[string]string) string {
	parts := make([]string, 0, len(m))
	for k, v := range m {
		parts = append(parts, urlQueryEncode(k)+"="+urlQueryEncode(v))
	}
	return urlQueryEncode(join(parts, "&")) // 两层编码,支付宝原样回传
}

// -----------------------------------------------
//  工厂
// -----------------------------------------------

// Pick 按环境变量返回网关。
// 若 PAYMENT_GATEWAY=alipay 但没提供 client,退回 Mock 并在日志里提醒。
func Pick(alipayClient AlipayClient, notifyURL string) Gateway {
	switch os.Getenv("PAYMENT_GATEWAY") {
	case "alipay":
		if alipayClient == nil {
			fmt.Fprintln(os.Stderr, "[paymentgw] PAYMENT_GATEWAY=alipay 但未提供 AlipayClient,退回 Mock")
			return MockGateway
		}
		return NewAlipayGateway(alipayClient, notifyURL)
	default:
		return MockGateway
	}
}

// -----------------------------------------------
//  简单 URL 编解码(避免 import net/url 只为 2 行)
// -----------------------------------------------

func urlQueryEncode(s string) string {
	var b []byte
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') ||
			c == '-' || c == '_' || c == '.' || c == '~' {
			b = append(b, c)
		} else {
			b = append(b, '%')
			b = append(b, hex[c>>4], hex[c&0x0f])
		}
	}
	return string(b)
}

func urlQueryDecode(s string) (string, error) {
	var b []byte
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c == '+' {
			b = append(b, ' ')
		} else if c == '%' {
			if i+2 >= len(s) {
				return "", errors.New("invalid percent encoding")
			}
			h := fromHex(s[i+1])<<4 | fromHex(s[i+2])
			b = append(b, h)
			i += 2
		} else {
			b = append(b, c)
		}
	}
	return string(b), nil
}

func split(s, sep string) []string {
	var out []string
	i := 0
	for j := 0; j <= len(s)-len(sep); j++ {
		if s[j:j+len(sep)] == sep {
			out = append(out, s[i:j])
			i = j + len(sep)
			j += len(sep) - 1
		}
	}
	out = append(out, s[i:])
	return out
}
func join(parts []string, sep string) string {
	if len(parts) == 0 {
		return ""
	}
	out := parts[0]
	for i := 1; i < len(parts); i++ {
		out += sep + parts[i]
	}
	return out
}

var hex = "0123456789ABCDEF"

func fromHex(c byte) byte {
	switch {
	case c >= '0' && c <= '9':
		return c - '0'
	case c >= 'a' && c <= 'f':
		return c - 'a' + 10
	case c >= 'A' && c <= 'F':
		return c - 'A' + 10
	}
	return 0
}

// _ 让变量被使用，避免 lint 警告
var _ = time.Now
