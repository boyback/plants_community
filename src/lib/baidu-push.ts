/**
 * 百度普通收录 API 推送
 *
 * 接口文档:https://ziyuan.baidu.com/college/courseinfo?id=267&page=2
 *
 * 调用示例:
 *   POST http://data.zz.baidu.com/urls?site=plantcommunity.cn&token=XXX
 *   Body: 一行一个 URL 的 plain text
 *   Headers: Content-Type: text/plain
 *
 * 响应示例(成功):
 *   { "remain": 4999, "success": 1 }
 *
 * 响应示例(失败):
 *   { "error": 401, "message": "token is not valid" }
 *
 * 限制:
 *   - 站点级别每天 3000 条配额(资质提升后可达 100w+)
 *   - 单次最多 2000 条 URL(我们用单 URL 推,不会触发)
 *   - URL 必须是已存在的可访问页面
 *
 * 用法:
 *   import { pushUrlToBaidu } from '@/lib/baidu-push';
 *   await pushUrlToBaidu(`https://plantcommunity.cn/post/${id}`);
 *   // 失败不抛,只 log
 */

const SITE_HOST = 'plantcommunity.cn'; // 注意:不带 https:// 前缀

export interface BaiduPushResult {
  ok: boolean;
  remain?: number; // 剩余配额
  success?: number; // 成功推送数
  notSameSite?: string[]; // 非站内 URL
  notValid?: string[]; // 不合法 URL
  error?: string;
}

/** 是否启用 — 只看 token 是否配置 */
function getToken(): string | null {
  return (process.env.BAIDU_PUSH_TOKEN || '').trim() || null;
}

export function isBaiduPushEnabled(): boolean {
  return getToken() !== null;
}

/**
 * 推送单条 URL 到百度。失败不抛异常,只返回结果。
 * 调用方应该 fire-and-forget,不阻塞主链路:
 *   void pushUrlToBaidu(url).catch(() => {});
 */
export async function pushUrlToBaidu(url: string): Promise<BaiduPushResult> {
  return pushUrlsToBaidu([url]);
}

/**
 * 批量推送(单次 ≤ 2000 条)
 */
export async function pushUrlsToBaidu(urls: string[]): Promise<BaiduPushResult> {
  const token = getToken();
  if (!token) return { ok: false, error: 'BAIDU_PUSH_TOKEN 未配置' };
  if (urls.length === 0) return { ok: true, success: 0 };
  if (urls.length > 2000) {
    return { ok: false, error: '单次最多 2000 条 URL' };
  }

  // 校验 URL 都属于本站(百度对非站内 URL 会拒)
  const filtered = urls.filter((u) => {
    try {
      const host = new URL(u).hostname;
      return host === SITE_HOST || host === `www.${SITE_HOST}`;
    } catch {
      return false;
    }
  });
  if (filtered.length === 0) {
    return { ok: false, error: 'URL 都不是站内' };
  }

  const apiUrl = `http://data.zz.baidu.com/urls?site=${SITE_HOST}&token=${token}`;
  const body = filtered.join('\n');

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
      // 给一个超时,避免推送阻塞太久
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as {
      remain?: number;
      success?: number;
      not_same_site?: string[];
      not_valid?: string[];
      error?: number;
      message?: string;
    };
    if (data.error) {
      return {
        ok: false,
        error: `[${data.error}] ${data.message || '推送失败'}`,
      };
    }
    return {
      ok: true,
      remain: data.remain,
      success: data.success,
      notSameSite: data.not_same_site,
      notValid: data.not_valid,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * fire-and-forget 推送 + 自动 log
 * 应用代码用这个,不 await 也不 catch
 */
export function firePushToBaidu(url: string): void {
  if (!isBaiduPushEnabled()) return;
  pushUrlToBaidu(url)
    .then((r) => {
      if (r.ok) {
        // eslint-disable-next-line no-console
        console.log(
          `[baidu-push] ✓ ${url} (success=${r.success}, remain=${r.remain})`,
        );
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[baidu-push] ✗ ${url}: ${r.error}`);
      }
    })
    .catch(() => null);
}
