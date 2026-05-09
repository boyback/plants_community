/**
 * PATCH  /api/admin/banners/:id   编辑 / 启停 / 改顺序
 * DELETE /api/admin/banners/:id   删除
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  title: z.string().min(1).max(120).optional(),
  subtitle: z.string().min(1).max(500).optional(),
  image: z.string().url().optional(),
  link: z.string().min(1).max(500).optional(),
  tint: z.string().min(1).max(120).optional(),
  orderIdx: z.number().int().optional(),
  enabled: z.boolean().optional(),
  durationMs: z.number().int().min(0).max(60_000).optional(),
});

function pickId(req: Request) {
  return new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
}

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const body = Body.parse(await req.json());
  const exists = await prisma.banner.findUnique({ where: { id } });
  if (!exists) return fail(404, 'Banner 不存在');
  await prisma.banner.update({ where: { id }, data: body });
  await logAdmin({
    actorId: me.id,
    action: 'banner.update',
    targetType: 'banner',
    targetId: id,
    meta: body,
  });
  return { ok: true };
});

export const DELETE = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const exists = await prisma.banner.findUnique({ where: { id } });
  if (!exists) return fail(404, 'Banner 不存在');
  await prisma.banner.delete({ where: { id } });
  await logAdmin({
    actorId: me.id,
    action: 'banner.delete',
    targetType: 'banner',
    targetId: id,
  });
  return { ok: true };
});
