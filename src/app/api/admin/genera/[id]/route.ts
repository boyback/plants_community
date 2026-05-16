import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  boardId: z.string().optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().min(1).max(80).optional(),
  latinName: z.string().max(120).nullable().optional(),
  description: z.string().max(500).optional(),
  cover: z.string().url().nullable().optional(),
  orderIdx: z.number().int().optional(),
});

function pickId(req: Request) {
  return new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
}

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const body = Body.parse(await req.json());
  const exists = await prisma.genus.findUnique({ where: { id } });
  if (!exists) return fail(404, 'Genus 不存在');

  // slug 同 category 内唯一
  if (body.slug && body.slug !== exists.slug) {
    const targetCatId = body.boardId ?? exists.boardId;
    const dup = await prisma.genus.findFirst({
      where: { boardId: targetCatId, slug: body.slug, id: { not: id } },
    });
    if (dup) return fail(400, `slug "${body.slug}" 在该科下已存在`);
  }

  await prisma.genus.update({ where: { id }, data: body });
  await logAdmin({
    actorId: me.id,
    action: 'genus.update',
    targetType: 'genus',
    targetId: id,
    meta: body,
  });
  return { ok: true };
});

export const DELETE = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const exists = await prisma.genus.findUnique({
    where: { id },
    include: { _count: { select: { species: true, posts: true } } },
  });
  if (!exists) return fail(404, 'Genus 不存在');
  if (exists._count.species > 0) {
    return fail(400, `该 Genus 下还有 ${exists._count.species} 个品种,请先删除它们`);
  }
  if (exists._count.posts > 0) {
    return fail(400, `该 Genus 下还有 ${exists._count.posts} 个帖子`);
  }
  await prisma.genus.delete({ where: { id } });
  await logAdmin({
    actorId: me.id,
    action: 'genus.delete',
    targetType: 'genus',
    targetId: id,
    meta: { slug: exists.slug, name: exists.name },
  });
  return { ok: true };
});
