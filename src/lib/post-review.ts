/**
 * 帖子审核检测:
 *   - 任何字段(cover/images/videoUrl/content HTML 中的 img/src)出现"非本站域名"的 URL
 *     即视为含外链 → 自动送审
 *   - 本站域名:相对路径(/uploads/...) 或 *.plantcommunity.cn 等(可配)
 */

const EXTERNAL_HOST_WHITELIST: string[] = [
  // 自家上传:相对路径,无 host
  // 注:这里列出 *允许的外站*,留空表示任何外链都送审
];

/**
 * 是否为外链
 *  - 相对路径(/...) → 本站
 *  - 同源 host → 本站
 *  - 白名单 host → 不算外链
 *  - 其他 → 外链
 */
export function isExternalUrl(
  rawUrl: string,
  selfHost?: string
): boolean {
  if (!rawUrl) return false;
  const u = rawUrl.trim();
  if (!u) return false;
  if (u.startsWith('/')) return false; // 相对路径
  if (u.startsWith('data:') || u.startsWith('blob:')) return false;
  let host: string;
  try {
    host = new URL(u).host;
  } catch {
    return false; // 解析失败先放过
  }
  if (selfHost && host === selfHost) return false;
  if (EXTERNAL_HOST_WHITELIST.includes(host)) return false;
  return true;
}

/** 抽出 HTML 中所有 <img src=...> 与 <video src=...> 的 url */
export function extractMediaUrls(html: string | null | undefined): string[] {
  if (!html) return [];
  const urls: string[] = [];
  const re = /<(img|video|source)[^>]*\bsrc=(?:"([^"]+)"|'([^']+)')/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    urls.push(m[2] || m[3] || '');
  }
  return urls.filter(Boolean);
}

/**
 * 综合判定:任意字段含外链 → 需审
 */
export function postNeedsReview(
  post: {
    cover?: string | null;
    images?: string[] | null;
    videoUrl?: string | null;
    content?: string | null;
  },
  selfHost?: string
): boolean {
  const candidates: string[] = [];
  if (post.cover) candidates.push(post.cover);
  if (post.images) candidates.push(...post.images);
  if (post.videoUrl) candidates.push(post.videoUrl);
  candidates.push(...extractMediaUrls(post.content ?? ''));
  return candidates.some((u) => isExternalUrl(u, selfHost));
}
