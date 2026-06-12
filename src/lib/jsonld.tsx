/**
 * JSON-LD 结构化数据辅助
 *
 * 输出符合 schema.org 的 JSON-LD,用于搜索引擎(Google/百度/必应)富媒体结果。
 *
 * 文档:https://schema.org/  ·  https://developers.google.com/search/docs/appearance/structured-data
 *
 * 用法(Server Component):
 *   import { jsonLdScript, websiteJsonLd } from '@/lib/jsonld';
 *   export default function Page() {
 *     return (
 *       <>
 *         {jsonLdScript(websiteJsonLd())}
 *         <main>...</main>
 *       </>
 *     );
 *   }
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://plantcommunity.cn";
const SITE_NAME = '肉友社';
const SITE_NAME_EN = 'PlantCommunity';
const SITE_LOGO = `${SITE_URL}/default-avatar.svg`; // 临时;后续可换 brand-logo.png

// ============================================================
// 把 JSON-LD 对象渲染成 <script> 标签(给 server component 用)
// ============================================================

/**
 * 渲染一个或多个 JSON-LD 节点为 <script type="application/ld+json">
 *
 * 注意:
 *   - 用 dangerouslySetInnerHTML 而不是 JSON.stringify(...)`{json}`,因为
 *     必须避免 < / > & 等字符被错误转义破坏脚本闭合
 *   - 多个 JSON-LD 可以共用一个 @graph 数组,搜索引擎都识别
 */
export function jsonLdScript(data: object | object[]): JSX.Element {
  const arr = Array.isArray(data) ? data : [data];
  // 防止 </script> 注入(把所有 < 转义)
  const json = JSON.stringify(arr.length === 1 ? arr[0] : arr).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }} />);


}

// ============================================================
// 各类节点构造器
// ============================================================

/**
 * WebSite + 站内搜索框(SearchAction)
 *   让 Google 在搜索结果直接给出搜索框,搜索词直达 /search?q=xxx
 */
export function websiteJsonLd() {
  return {
    '@context': "https://schema.org",
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: SITE_NAME_EN,
    description: "中文多肉社区:养护交流、品种百科、摄影分享、二手交易",
    inLanguage: "zh-CN",
    publisher: {
      '@id': `${SITE_URL}/#org`
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`
      },
      "query-input": 'required name=search_term_string'
    }
  };
}

/** Organization 节点(全站共享,首页带一个就够) */
export function organizationJsonLd() {
  return {
    '@context': "https://schema.org",
    '@type': 'Organization',
    '@id': `${SITE_URL}/#org`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO,
    sameAs: []
  };
}

/**
 * 品种页 — 既是 Article(可读内容)又是 Thing(植物条目)
 * 用 @graph 数组同时表达
 */
export function speciesJsonLd(input: {
  name: string; // 中文名
  latinName?: string; // 拉丁名
  family?: string; // 科属
  description?: string;
  cover?: string; // 封面图绝对 URL
  url: string; // 页面 URL(带 https://...)
  difficulty?: number; // 1-5
}) {
  const articleId = `${input.url}#article`;
  const thingId = `${input.url}#species`;
  return [
  {
    '@context': "https://schema.org",
    '@type': 'Article',
    '@id': articleId,
    mainEntityOfPage: { '@id': input.url },
    headline: `${input.name}养护图鉴${input.latinName ? `(${input.latinName})` : ''}`,
    description: input.description?.slice(0, 200) ?? `${input.name}的多肉植物养护指南。`,
    image: input.cover ? [input.cover] : undefined,
    inLanguage: "zh-CN",
    author: { '@id': `${SITE_URL}/#org` },
    publisher: { '@id': `${SITE_URL}/#org` },
    about: { '@id': thingId }
  },
  {
    '@context': "https://schema.org",
    '@type': 'Thing',
    '@id': thingId,
    name: input.name,
    alternateName: input.latinName,
    description: input.description?.slice(0, 200),
    // 自定义 additionalType 帮助搜索引擎理解是植物
    additionalType: "https://schema.org/Plant",
    // 把科属信息放到 disambiguatingDescription 里
    disambiguatingDescription: input.family
  }];

}

/**
 * 帖子页 — DiscussionForumPosting(社区帖子)
 * 比 BlogPosting 更精准描述「论坛/社区帖子」
 */
export function postJsonLd(input: {
  title: string;
  excerpt?: string;
  cover?: string;
  url: string;
  authorName: string;
  authorUrl: string;
  publishedAt: string; // ISO 8601
  updatedAt?: string;
  views?: number;
  likes?: number;
  comments?: number;
}) {
  return {
    '@context': "https://schema.org",
    '@type': 'DiscussionForumPosting',
    '@id': `${input.url}#post`,
    mainEntityOfPage: { '@id': input.url },
    headline: input.title,
    description: input.excerpt?.slice(0, 200),
    image: input.cover ? [input.cover] : undefined,
    inLanguage: "zh-CN",
    datePublished: input.publishedAt,
    dateModified: input.updatedAt ?? input.publishedAt,
    author: {
      '@type': 'Person',
      name: input.authorName,
      url: input.authorUrl
    },
    publisher: { '@id': `${SITE_URL}/#org` },
    // 互动统计 — 让搜索结果显示「N 看 · N 赞 · N 评论」
    interactionStatistic: [
    input.views !== undefined && {
      '@type': 'InteractionCounter',
      interactionType: "https://schema.org/ViewAction",
      userInteractionCount: input.views
    },
    input.likes !== undefined && {
      '@type': 'InteractionCounter',
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: input.likes
    },
    input.comments !== undefined && {
      '@type': 'InteractionCounter',
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: input.comments
    }].
    filter(Boolean)
  };
}

/**
 * 面包屑导航 — 让搜索结果直接显示路径
 *   home > 板块 > 品种 > 帖子
 */
export function breadcrumbJsonLd(items: {name: string;url: string;}[]) {
  return {
    '@context': "https://schema.org",
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url
    }))
  };
}