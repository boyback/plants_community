/**
 * 客户端统一请求工具。
 * 服务端响应统一格式:{ ok: true, data } | { ok: false, error }
 */

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    ...init,
  });

  const isJSON = res.headers.get('content-type')?.includes('application/json');
  const payload = isJSON ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const msg = payload?.error?.message ?? `${res.status} ${res.statusText}`;
    throw new ApiError(res.status, msg, payload?.error?.detail);
  }
  if (payload && typeof payload === 'object' && 'ok' in payload) {
    if (payload.ok === false) {
      throw new ApiError(400, payload.error?.message ?? '请求失败');
    }
    return payload.data as T;
  }
  return payload as T;
}

export const api = {
  get: <T>(url: string, init?: RequestInit) => request<T>('GET', url, undefined, init),
  post: <T>(url: string, body?: unknown, init?: RequestInit) => request<T>('POST', url, body, init),
  put: <T>(url: string, body?: unknown, init?: RequestInit) => request<T>('PUT', url, body, init),
  delete: <T>(url: string, init?: RequestInit) => request<T>('DELETE', url, undefined, init),
};
