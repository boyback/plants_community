/**
 * GET /api/auth/handle-available?handle=xxx
 *
 * 注册页 debounce 调用,实时检查账号是否可用。
 * 返回 { ok: true/false, reason?: string }
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateHandleFormat, normalizeHandle } from '@/lib/handle';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get('handle') || '';

  const formatErr = validateHandleFormat(raw);
  if (formatErr) {
    return NextResponse.json({ ok: false, reason: formatErr });
  }

  const handle = normalizeHandle(raw);
  const exist = await prisma.user.findUnique({
    where: { handle },
    select: { id: true },
  });

  if (exist) {
    return NextResponse.json({ ok: false, reason: '该账号已被占用' });
  }
  return NextResponse.json({ ok: true });
}
