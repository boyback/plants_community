/**
 * PATCH  /api/admin/announcements/:id   编辑
 * DELETE /api/admin/announcements/:id   删除
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const PatchBody = z.object({
  title: z.string().min(1).max(120).optional(),
  content: z.string().min(1).max(5000).optional(),
  level: z.enum(['info', 'warning', 'important']).optional(),
  enabled: z.boolean().optional(),
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
});

function pickId(req: Request) {
  return new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
}

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const body = PatchBody.parse(await req.json());
  const exists = await prisma.announcement.findUnique({ where: { id } });
  if (!exists) return fail(404, '公告不存在');
  const data: Record<string, unknown> = { ...body };
  if (body.startAt !== undefined) data.startAt = body.startAt ? new Date(body.startAt) : null;
  if (body.endAt !== undefined) data.endAt = body.endAt ? new Date(body.endAt) : null;
  await prisma.announcement.update({ where: { id }, data });
  await logAdmin({
    actorId: me.id,
    action: 'announcement.update',
    targetType: 'announcement',
    targetId: id,
    meta: body,
  });
  return { ok: true };
});

export const DELETE = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const exists = await prisma.announcement.findUnique({ where: { id } });
  if (!exists) return fail(404, '公告不存在');
  await prisma.announcement.delete({ where: { id } });
  await logAdmin({
    actorId: me.id,
    action: 'announcement.delete',
    targetType: 'announcement',
    targetId: id,
  });
  return { ok: true };
});
