import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './auth';

/** 统一 JSON 响应 */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, message: string, detail?: unknown) {
  return NextResponse.json(
    { ok: false, error: { message, detail } },
    { status }
  );
}

export function failWithCode(status: number, code: string, message: string, detail?: unknown) {
  return NextResponse.json(
    { ok: false, code, error: { message, detail } },
    { status }
  );
}

/**
 * 统一 API 错误处理。Route Handler 里这样用:
 *   export const POST = handler(async (req) => { ... })
 */
export function handler<T>(fn: (req: Request) => Promise<T | NextResponse>) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      const r = await fn(req);
      if (r instanceof NextResponse) return r;
      return ok(r);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      if (e instanceof ZodError) {
        console.log(e);
        return fail(400, '参数错误', e.issues);
      }
      // eslint-disable-next-line no-console
      console.error('[API ERROR]', e);
      const msg = e instanceof Error ? e.message : String(e);
      return fail(500, msg);
    }
  };
}

/** 解析数组字段(数据库里存的 JSON 字符串) */
export function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function stringifyJson(v: unknown): string {
  return JSON.stringify(v ?? []);
}
