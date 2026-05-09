/**
 * 轻量 i18n 配置。
 *
 * 为什么不用 next-intl?
 *   - next-intl 的标准做法要求把所有页面放进 [locale] 动态路由段,
 *     会与现有 layout.tsx 深度绑定的 getCurrentUser / prisma 调用冲突,
 *     短期内改造成本过大。
 *   - Demo 阶段我们采用:Context + cookie + fetch JSON 的轻量方案,
 *     兼容现有所有路由,日后需要 SSR 翻译再升级到 next-intl。
 *
 * 约定:
 *   - 5 个 locale:zh-CN / zh-TW / en / ja / ko
 *   - 每个 locale 下按 namespace 拆文件:common / nav / auth / settings / post
 *   - 翻译文件是 JSON,扁平 key(a.b.c 路径用嵌套对象)
 *   - 未命中 key 时回退到 zh-CN,依然未命中则显示 key 本身(便于开发定位)
 */

export const locales = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh-CN';

export const localeNames: Record<Locale, string> = {
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
};

export const localeFlags: Record<Locale, string> = {
  'zh-CN': '🇨🇳',
  'zh-TW': '🇨🇳',
  en: '🇺🇸',
  ja: '🇯🇵',
  ko: '🇰🇷',
};

/** 所有已拆分的 namespace(文件名,不含后缀) */
export const namespaces = [
  'common',
  'nav',
  'auth',
  'settings',
  'post',
  'theme',
  'cookie',
  'editor',
  'market',
  'auction',
  'detail',
  'orders',
  'vip',
  'board',
  'user',
  'tasks',
  'checkout',
  'messages',
  'points',
  'addresses',
  'plants',
  'home',
  'levels',
  'about',
] as const;
export type Namespace = (typeof namespaces)[number];

export const COOKIE_LOCALE = 'rouyou_locale';

/** 从 Accept-Language / cookie 字符串里协商出最合适的 locale
 *
 * 关键规则:
 *   - Accept-Language 按优先级解析(用「第一段」判定,不因后面的 `en;q=0.8` 误命中)
 *   - 能精确到区域(zh-CN / zh-TW)就用区域;不精确到区域回退到语系默认
 *   - 完全没命中回退到 defaultLocale
 */
export function negotiateLocale(input: string | null | undefined): Locale {
  if (!input) return defaultLocale;

  // 先尝试精确匹配一个 locale 值本身(例如 cookie 里的 "zh-TW")
  const direct = locales.find((l) => l === input);
  if (direct) return direct;

  // 解析 Accept-Language 样式 / cookie:按 `,` 分段,只看第一段
  // 例如:  ko-KR,ko;q=0.9,en;q=0.8  →  第一段 ko-KR
  const firstTag = input.split(',')[0]?.trim().split(';')[0]?.trim().toLowerCase() ?? '';

  // 再次精确匹配
  for (const l of locales) {
    if (firstTag === l.toLowerCase()) return l;
  }

  // 语系匹配:
  if (firstTag.startsWith('zh')) {
    if (firstTag.includes('tw') || firstTag.includes('hk') || firstTag.includes('hant')) return 'zh-TW';
    return 'zh-CN';
  }
  if (firstTag.startsWith('ja')) return 'ja';
  if (firstTag.startsWith('ko')) return 'ko';
  if (firstTag.startsWith('en')) return 'en';
  return defaultLocale;
}
