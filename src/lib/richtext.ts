/**
 * 富文本统一工具
 *
 * 数据流向:
 *   前端编辑器(TipTap)
 *      └──> ProseMirror JSON --(POST 到 API)--> sanitizeJson()
 *                                            └─> generateHTML(JSON) --> sanitizeHtml()
 *                                                                  └─> 写入 contentJson + content + contentText
 *   前端渲染:
 *      读 contentJson 用 <RichTextView json>(权威)
 *      读不到时回退到 content (HTML) 二次 sanitize 后展示
 *
 * sanitize 白名单参考社区论坛的常见标签集,刻意排除:
 *   - 任意 script / iframe / form / object / embed / style
 *   - 任意 on* 事件属性
 *   - data: URL(图片除外)/ javascript: URL
 */

import sanitizeHtmlLib from 'sanitize-html';
import { generateHTML, generateJSON } from '@tiptap/html/server';
import { convert } from 'html-to-text';
import { getServerExtensions } from './tiptap-extensions';

// =============== 白名单 ===============

/** 允许出现在富文本里的标签集合 */
export const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'b',
  'i',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'a',
  'img',
  'hr',
  'span',
  'div',
  'mark',
];

/** 允许在标签上的属性集合 */
export const ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'title',
  'class',
  'target',
  'rel',
  'width',
  'height',
  'style',
  'data-type',
  'data-value',
];

/** 允许 src/href 协议 */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', '/'];

function isUrlSafe(url: string | null | undefined): boolean {
  if (!url) return false;
  // 站内相对路径
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('?')) return true;
  try {
    const u = new URL(url);
    return ALLOWED_PROTOCOLS.includes(u.protocol);
  } catch {
    return false;
  }
}

// =============== sanitize ===============

/** 服务端清洗 HTML(基于 sanitize-html 库) */
export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height', 'class', 'style'],
      mark: ['class', 'data-type'],
      span: ['class', 'style', 'data-type', 'data-value'],
      p: ['class', 'style', 'data-text-align'],
      h1: ['class', 'style'],
      h2: ['class', 'style'],
      h3: ['class', 'style'],
      div: ['class', 'style', 'data-type', 'data-value'],
      // 通用属性
      '*': ['class', 'style', 'data-type', 'data-value'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    // 自动给链接补 rel/target
    transformTags: {
      a: (tagName, attribs) => {
        if (!attribs.href || !isUrlSafe(attribs.href)) {
          // 没有合法 href 时,把 a 转成 span(保留文本)
          return { tagName: 'span', attribs: {} };
        }
        return {
          tagName,
          attribs: {
            href: attribs.href,
            ...(attribs.title ? { title: attribs.title } : {}),
            rel: 'noopener noreferrer nofollow',
            target: '_blank',
          },
        };
      },
      img: (tagName, attribs) => {
        if (!attribs.src || !isUrlSafe(attribs.src)) {
          return { tagName: 'span', attribs: {}, text: '' };
        }
        // 保留 class 和 style
        const preserved: Record<string, string> = { src: attribs.src };
        if (attribs.alt) preserved.alt = attribs.alt;
        if (attribs.title) preserved.title = attribs.title;
        if (attribs.class) preserved.class = attribs.class;
        if (attribs.style) preserved.style = attribs.style;
        return { tagName, attribs: preserved };
      },
      // 保留 heading/paragraph 的 style 属性
      h1: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, class: attribs.class || '', style: attribs.style || '' },
      }),
      h2: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, class: attribs.class || '', style: attribs.style || '' },
      }),
      h3: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, class: attribs.class || '', style: attribs.style || '' },
      }),
      p: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, class: attribs.class || '', style: attribs.style || '' },
      }),
    },
  });
}

// =============== JSON ↔ HTML ===============

/**
 * 校验并接受 ProseMirror JSON。
 * 失败抛错,成功返回标准化对象。
 */
export function validateProseMirrorJson(json: unknown): { ok: true; doc: unknown } | { ok: false; reason: string } {
  if (json == null) return { ok: false, reason: 'JSON 为空' };
  if (typeof json !== 'object') return { ok: false, reason: 'JSON 必须是对象' };
  const obj = json as Record<string, unknown>;
  if (obj.type !== 'doc') return { ok: false, reason: '根节点 type 必须为 doc' };
  if (!Array.isArray(obj.content)) return { ok: false, reason: 'doc.content 必须是数组' };
  return { ok: true, doc: obj };
}

/** ProseMirror JSON → HTML(再 sanitize) */
export function htmlFromJson(json: unknown): string {
  try {
    const html = generateHTML(json as never, getServerExtensions());
    return sanitizeHtml(html);
  } catch {
    return '';
  }
}

/** HTML → ProseMirror JSON(供 seed / 旧数据迁移用) */
export function jsonFromHtml(html: string): unknown {
  try {
    return generateJSON(html, getServerExtensions());
  } catch {
    return null;
  }
}

/** ProseMirror JSON → 纯文本(用于摘要 / 通知 / 搜索) */
export function plainFromJson(json: unknown, max = 500): string {
  const html = htmlFromJson(json);
  const text = convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  });
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > max ? compact.slice(0, max) + '…' : compact;
}

/** HTML → 纯文本 */
export function plainFromHtml(html: string, max = 500): string {
  const text = convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  });
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > max ? compact.slice(0, max) + '…' : compact;
}

// =============== 一次性处理函数 ===============

export interface RichTextStored {
  json: string;     // ProseMirror JSON 字符串
  html: string;     // sanitized HTML
  text: string;     // 纯文本摘要
}

/**
 * 业务侧统一入口:接收任意富文本输入
 * - 优先用 jsonInput(权威)
 * - 否则用 htmlInput
 * - 否则用 textInput(纯文本回退)
 *
 * 返回三套数据,可直接写入数据库三个列。
 */
export function processRichInput(input: {
  json?: unknown;
  html?: string;
  text?: string;
  textMaxLen?: number;
}): RichTextStored {
  const max = input.textMaxLen ?? 500;
  // 1. 优先 JSON
  if (input.json !== undefined && input.json !== null) {
    const v = validateProseMirrorJson(input.json);
    if (v.ok) {
      const html = htmlFromJson(input.json);
      const text = plainFromJson(input.json, max);
      return {
        json: JSON.stringify(input.json),
        html,
        text,
      };
    }
  }
  // 2. HTML 兜底
  if (input.html) {
    const html = sanitizeHtml(input.html);
    return {
      json: '',
      html,
      text: plainFromHtml(html, max),
    };
  }
  // 3. 纯文本兜底:把换行变成 <br>
  if (input.text) {
    const escaped = escapeHtml(input.text).replace(/\n/g, '<br>');
    const html = sanitizeHtml(`<p>${escaped}</p>`);
    return {
      json: '',
      html,
      text: input.text.slice(0, max),
    };
  }
  return { json: '', html: '', text: '' };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
