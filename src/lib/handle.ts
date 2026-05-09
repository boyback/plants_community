/**
 * 用户「账号」(handle) — 类似微信号
 *
 * 规则(微信号同款):
 *   - 6-20 位
 *   - 必须以字母开头
 *   - 后面只能用 字母 / 数字 / 下划线 / 减号
 *   - 不区分大小写存储(强制 toLowerCase 比较)
 */

export const HANDLE_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{5,19}$/;

const RESERVED = new Set([
  // 路由保留
  'admin',
  'api',
  'login',
  'logout',
  'register',
  'settings',
  'home',
  'help',
  'about',
  'support',
  'official',
  'system',
  'undefined',
  'null',
  'root',
  'service',
  // 业务保留
  'plantcommunity',
  'rouyou',
  'rouyoushe',
]);

export function validateHandleFormat(handle: string): string | null {
  if (!handle) return '账号必填';
  if (handle.length < 6) return '账号至少 6 位';
  if (handle.length > 20) return '账号最多 20 位';
  if (!HANDLE_REGEX.test(handle)) return '账号必须以字母开头,只能包含字母、数字、下划线和减号';
  if (RESERVED.has(handle.toLowerCase())) return '该账号为系统保留,请换一个';
  return null;
}

/** 规范化:统一小写后存 / 比较 */
export function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase();
}
