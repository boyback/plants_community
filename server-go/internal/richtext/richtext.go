// Package richtext mirrors Next.js 的 src/lib/richtext.ts:
//
// 三级字段存储模型(和数据库字段对齐):
//   content      = sanitized HTML(渲染缓存)
//   contentJson  = ProseMirror JSON 字符串(权威源)
//   contentText  = 纯文本摘要(通知/搜索/列表)
//
// 策略:
//   优先级 JSON > HTML > Text
//   * 有 JSON   → ProseMirror JSON 字符串原样存一份,
//                 同步渲染成 HTML 再 sanitize,纯文本从 JSON 节点提取
//   * 只有 HTML → sanitize 后存 HTML;JSON 为空;纯文本 strip tags
//   * 只有 Text → escape + <br> 包 <p>,sanitize;JSON 为空;纯文本 = 原文
//
// 和 TS 实现的差异点:
//   - Next.js 用 @tiptap/html generateHTML 把 JSON 渲染成 HTML。
//     Go 这边为了避免引入重依赖,我自己实现一个极简 PM-JSON → HTML 渲染器,
//     足以覆盖 TipTap StarterKit 的所有节点/标记(p/heading/list/blockquote/code/br/hr + bold/italic/underline/strike/code/link)。
//     渲染出的 HTML 同样过 sanitize。
//
// 完成后:无论前端传 json 还是 html,数据库 3 个字段都会同步填好。
package richtext

import (
	"encoding/json"
	"fmt"
	"html"
	"regexp"
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

// ===================== Sanitize =====================

var policy = func() *bluemonday.Policy {
	p := bluemonday.UGCPolicy()
	// 白名单标签
	p.AllowElements("p", "br", "strong", "em", "u", "s", "b", "i",
		"h1", "h2", "h3", "h4",
		"ul", "ol", "li",
		"blockquote", "pre", "code",
		"a", "img", "hr", "span", "div")
	p.AllowAttrs("class").Globally()
	// 链接
	p.AllowAttrs("href", "title").OnElements("a")
	p.AllowURLSchemes("http", "https", "mailto")
	p.RequireNoFollowOnLinks(true)
	p.RequireNoReferrerOnLinks(true)
	p.AddTargetBlankToFullyQualifiedLinks(true)
	// 图片:src 限制 http/https 开头
	p.AllowAttrs("alt", "title", "width", "height").OnElements("img")
	p.AllowAttrs("src").Matching(regexp.MustCompile(`^https?://`)).OnElements("img")
	return p
}()

// SanitizeHTML 清洗 HTML,仅保留白名单标签/属性,无效 URL 自动剥离。
func SanitizeHTML(h string) string {
	return policy.Sanitize(h)
}

// ===================== Plain Text =====================

// PlainFromHTML 把 HTML 转成纯文本:去掉所有标签,保留空白。
func PlainFromHTML(h string, maxLen int) string {
	// 简单实现:把块级结束改换行,然后去标签
	cleaned := strings.NewReplacer(
		"</p>", "\n", "</div>", "\n", "</li>", "\n",
		"</h1>", "\n", "</h2>", "\n", "</h3>", "\n", "</h4>", "\n",
		"<br>", "\n", "<br/>", "\n", "<br />", "\n",
	).Replace(h)
	// strip tags
	var b strings.Builder
	inTag := false
	for i := 0; i < len(cleaned); i++ {
		c := cleaned[i]
		if c == '<' {
			inTag = true
			continue
		}
		if c == '>' {
			inTag = false
			continue
		}
		if !inTag {
			b.WriteByte(c)
		}
	}
	s := html.UnescapeString(b.String())
	// 压缩连续空白
	s = strings.Join(strings.Fields(s), " ")
	if maxLen > 0 && len(s) > maxLen {
		s = s[:maxLen] + "…"
	}
	return s
}

// ===================== ProseMirror JSON → HTML(极简) =====================

// 支持 TipTap StarterKit 的所有节点 + Image + Underline + Link。
// 解析方式:直接处理通用 map[string]any。

type pmNode map[string]any

func toNode(v any) pmNode {
	switch mm := v.(type) {
	case map[string]any:
		return mm
	case pmNode:
		return mm
	}
	return nil
}

// HTMLFromJSON 把 ProseMirror JSON 渲染为未 sanitize 的 HTML;调用方应再过 SanitizeHTML。
// 传入 raw map(encoding/json Unmarshal 的结果)。
func HTMLFromJSON(doc any) string {
	n := toNode(doc)
	if n == nil {
		return ""
	}
	var b strings.Builder
	renderNode(&b, n)
	return b.String()
}

func renderNode(b *strings.Builder, n pmNode) {
	t, _ := n["type"].(string)
	switch t {
	case "doc":
		renderChildren(b, n)
	case "paragraph":
		if hasChildren(n) {
			b.WriteString("<p>")
			renderChildren(b, n)
			b.WriteString("</p>")
		} else {
			b.WriteString("<p></p>")
		}
	case "heading":
		lvl := 1
		if attrs, ok := n["attrs"].(map[string]any); ok {
			if v, ok := attrs["level"].(float64); ok {
				lvl = int(v)
			}
		}
		if lvl < 1 || lvl > 6 {
			lvl = 3
		}
		fmt.Fprintf(b, "<h%d>", lvl)
		renderChildren(b, n)
		fmt.Fprintf(b, "</h%d>", lvl)
	case "bulletList":
		b.WriteString("<ul>")
		renderChildren(b, n)
		b.WriteString("</ul>")
	case "orderedList":
		b.WriteString("<ol>")
		renderChildren(b, n)
		b.WriteString("</ol>")
	case "listItem":
		b.WriteString("<li>")
		renderChildren(b, n)
		b.WriteString("</li>")
	case "blockquote":
		b.WriteString("<blockquote>")
		renderChildren(b, n)
		b.WriteString("</blockquote>")
	case "codeBlock":
		b.WriteString("<pre><code>")
		renderChildren(b, n)
		b.WriteString("</code></pre>")
	case "horizontalRule":
		b.WriteString("<hr>")
	case "hardBreak":
		b.WriteString("<br>")
	case "image":
		attrs, _ := n["attrs"].(map[string]any)
		src, _ := attrs["src"].(string)
		alt, _ := attrs["alt"].(string)
		if src != "" {
			fmt.Fprintf(b, `<img src="%s" alt="%s">`,
				html.EscapeString(src), html.EscapeString(alt))
		}
	case "text":
		text, _ := n["text"].(string)
		s := html.EscapeString(text)
		// 处理 marks
		marks, _ := n["marks"].([]any)
		// 输出顺序:link 最外层,其它 marks 依序嵌套
		open, close := marksToTags(marks)
		b.WriteString(open)
		b.WriteString(s)
		b.WriteString(close)
	default:
		// 未知节点:忽略
	}
}

func hasChildren(n pmNode) bool {
	c, _ := n["content"].([]any)
	return len(c) > 0
}

func renderChildren(b *strings.Builder, n pmNode) {
	c, _ := n["content"].([]any)
	for _, ch := range c {
		if m := toNode(ch); m != nil {
			renderNode(b, m)
		}
	}
}

func marksToTags(marks []any) (open string, closeT string) {
	var o, cc []string
	for _, m := range marks {
		mm := toNode(m)
		if mm == nil {
			continue
		}
		t, _ := mm["type"].(string)
		switch t {
		case "bold":
			o = append(o, "<strong>")
			cc = append([]string{"</strong>"}, cc...)
		case "italic":
			o = append(o, "<em>")
			cc = append([]string{"</em>"}, cc...)
		case "underline":
			o = append(o, "<u>")
			cc = append([]string{"</u>"}, cc...)
		case "strike":
			o = append(o, "<s>")
			cc = append([]string{"</s>"}, cc...)
		case "code":
			o = append(o, "<code>")
			cc = append([]string{"</code>"}, cc...)
		case "link":
			attrs, _ := mm["attrs"].(map[string]any)
			href, _ := attrs["href"].(string)
			if href == "" {
				continue
			}
			o = append(o, fmt.Sprintf(`<a href="%s" rel="noopener noreferrer nofollow" target="_blank">`, html.EscapeString(href)))
			cc = append([]string{"</a>"}, cc...)
		}
	}
	return strings.Join(o, ""), strings.Join(cc, "")
}

// ===================== 统一入口:processRichInput =====================

type Stored struct {
	HTML string
	JSON string // 原始 ProseMirror JSON 字符串(未渲染)
	Text string
}

type Input struct {
	// JSON 权威源:传 map[string]any(encoding/json 直接解出来)或原始字符串
	JSON       any
	HTML       string
	Text       string
	TextMaxLen int
}

// Process 是和 TS processRichInput 1:1 对齐的入口。
// 返回:要写入数据库三栏的字符串。
func Process(in Input) Stored {
	max := in.TextMaxLen
	if max == 0 {
		max = 500
	}

	// 1. 优先用 JSON
	if in.JSON != nil {
		if m := toNode(in.JSON); m != nil {
			t, _ := m["type"].(string)
			if t == "doc" {
				raw, _ := json.Marshal(m)
				htmlUnsan := HTMLFromJSON(m)
				htmlSafe := SanitizeHTML(htmlUnsan)
				return Stored{
					HTML: htmlSafe,
					JSON: string(raw),
					Text: PlainFromHTML(htmlSafe, max),
				}
			}
		}
	}

	// 2. HTML 兜底
	if in.HTML != "" {
		htmlSafe := SanitizeHTML(in.HTML)
		return Stored{
			HTML: htmlSafe,
			JSON: "",
			Text: PlainFromHTML(htmlSafe, max),
		}
	}

	// 3. 纯文本兜底:escape + <br> 包 <p>
	if in.Text != "" {
		escaped := html.EscapeString(in.Text)
		escaped = strings.ReplaceAll(escaped, "\n", "<br>")
		htmlSafe := SanitizeHTML("<p>" + escaped + "</p>")
		t := in.Text
		if max > 0 && len(t) > max {
			t = t[:max]
		}
		return Stored{HTML: htmlSafe, JSON: "", Text: t}
	}

	return Stored{}
}
