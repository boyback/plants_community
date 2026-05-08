package richtext

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSanitizeBasic(t *testing.T) {
	cases := []struct {
		name     string
		in       string
		mustHave []string
		mustNot  []string
	}{
		{
			"剥离 script",
			`<p>hi</p><script>alert(1)</script>`,
			[]string{"<p>hi</p>"},
			[]string{"<script", "alert(1)"},
		},
		{
			"剥离 iframe",
			`hello<iframe src="https://evil.com"></iframe>world`,
			[]string{"hello", "world"},
			[]string{"<iframe"},
		},
		{
			"javascript: href",
			`<a href="javascript:alert(1)">click</a>`,
			[]string{"click"},
			[]string{"javascript:"},
		},
		{
			"onerror 属性剥离",
			`<img src="https://ok.com/a.jpg" alt="a" onerror="alert(1)">`,
			[]string{`src="https://ok.com/a.jpg"`, `alt="a"`},
			[]string{"onerror"},
		},
		{
			"正常 http 图片保留",
			`<img src="https://pic.example.com/a.jpg" alt="pic">`,
			[]string{`src="https://pic.example.com/a.jpg"`},
			[]string{},
		},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := SanitizeHTML(c.in)
			for _, s := range c.mustHave {
				if !strings.Contains(got, s) {
					t.Errorf("missing %q in %q", s, got)
				}
			}
			for _, s := range c.mustNot {
				if strings.Contains(got, s) {
					t.Errorf("should not contain %q in %q", s, got)
				}
			}
		})
	}
}

func TestPlainFromHTML(t *testing.T) {
	html := `<h2>Hello</h2><p>World <strong>bold</strong></p>`
	s := PlainFromHTML(html, 0)
	if !strings.Contains(s, "Hello") || !strings.Contains(s, "World bold") {
		t.Errorf("plain got %q", s)
	}
}

func TestProcessJSON(t *testing.T) {
	raw := `{
	  "type":"doc",
	  "content":[
	    {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"标题"}]},
	    {"type":"paragraph","content":[
	      {"type":"text","text":"正文"},
	      {"type":"text","marks":[{"type":"bold"}],"text":"加粗"}
	    ]}
	  ]
	}`
	var v any
	_ = json.Unmarshal([]byte(raw), &v)
	s := Process(Input{JSON: v})
	if s.HTML == "" {
		t.Error("HTML should not be empty")
	}
	if !strings.Contains(s.HTML, "<h2>标题</h2>") {
		t.Errorf("missing h2 in %q", s.HTML)
	}
	if !strings.Contains(s.HTML, "<strong>加粗</strong>") {
		t.Errorf("missing strong in %q", s.HTML)
	}
	if s.JSON == "" {
		t.Error("JSON should be filled")
	}
	if !strings.Contains(s.Text, "标题") || !strings.Contains(s.Text, "加粗") {
		t.Errorf("text got %q", s.Text)
	}
}

func TestProcessHTMLOnly(t *testing.T) {
	s := Process(Input{HTML: `<p>hi</p><script>alert(1)</script>`})
	if !strings.Contains(s.HTML, "<p>hi</p>") {
		t.Errorf("missing <p>hi</p> in %q", s.HTML)
	}
	if strings.Contains(s.HTML, "<script") {
		t.Errorf("script not stripped: %q", s.HTML)
	}
	if s.JSON != "" {
		t.Error("JSON should be empty when only HTML given")
	}
}

func TestProcessTextOnly(t *testing.T) {
	s := Process(Input{Text: "line1\nline2"})
	if !strings.Contains(s.HTML, "<p>") {
		t.Errorf("should wrap in <p>, got %q", s.HTML)
	}
	if !strings.Contains(s.HTML, "<br>") {
		t.Errorf("\\n should become <br>, got %q", s.HTML)
	}
}

func TestMarksEscape(t *testing.T) {
	// <script> in text node should be escaped, not passed through
	raw := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"<script>alert(1)</script>"}]}]}`
	var v any
	_ = json.Unmarshal([]byte(raw), &v)
	s := Process(Input{JSON: v})
	if strings.Contains(s.HTML, "<script>") {
		t.Errorf("text content must be escaped, got %q", s.HTML)
	}
	if !strings.Contains(s.HTML, "&lt;script&gt;") {
		t.Errorf("should have escaped script tag, got %q", s.HTML)
	}
}
