/**
 * 服务端功能开关 — 用环境变量控制是否启用某些「依赖最新 schema」的过滤,
 * 避免在 schema 还没同步的环境下查询整张爆掉。
 *
 * 使用方式:
 *   if (REVIEW_FILTER_ENABLED) where.reviewStatus = 'published';
 *
 * 启用方法(部署完 schema 后):
 *   .env / docker-compose:REVIEW_FILTER_ENABLED=1
 *   重启 next 即可
 */

function readBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

/** 是否启用 Post.reviewStatus 过滤(默认关 — 等服务器跑 init-db 同步 schema) */
export const REVIEW_FILTER_ENABLED = readBool('REVIEW_FILTER_ENABLED', false);

/**
 * 微信登录是否启用。
 * 双门:必须 凭证齐 + 全局开关(WECHAT_LOGIN_ENABLED)都打开。
 * 当前微信开放平台资质未下来,默认 OFF。
 */
const WECHAT_LOGIN_GLOBAL = readBool('WECHAT_LOGIN_ENABLED', false);

export const WECHAT_LOGIN_WEB_ENABLED =
  WECHAT_LOGIN_GLOBAL &&
  !!(process.env.WECHAT_LOGIN_APP_ID && process.env.WECHAT_LOGIN_APP_SECRET);
export const WECHAT_LOGIN_MP_ENABLED =
  WECHAT_LOGIN_GLOBAL &&
  !!(process.env.WECHAT_MP_APP_ID && process.env.WECHAT_MP_APP_SECRET);
export const WECHAT_LOGIN_ANY_ENABLED =
  WECHAT_LOGIN_WEB_ENABLED || WECHAT_LOGIN_MP_ENABLED;
