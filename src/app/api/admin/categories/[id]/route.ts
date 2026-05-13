/**
 * PATCH  /api/admin/categories/:id   编辑
 * DELETE /api/admin/categories/:id   删除(级联删 Genus 和 Species,危险!)
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().min(1).max(80).optional(),
  latinName: z.string().max(120).nullable().optional(),
  kind: z.enum(['family', 'discussion', 'market']).optional(),
  description: z.string().max(500).optional(),
  cover: z.string().url().optional(),
  icon: z.string().max(500).optional(),
  members: z.number().int().min(0).optional(),
  orderIdx: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

function pickId(req: Request) {
  return new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
}

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const body = Body.parse(await req.json());

  const exists = await prisma.category.findUnique({ where: { id } });
  if (!exists) return fail(404, 'Category 不存在');

  // slug 唯一校验
  if (body.slug && body.slug !== exists.slug) {
    const dup = await prisma.category.findUnique({ where: { slug: body.slug } });
    if (dup) return fail(400, `slug "${body.slug}" 已存在`);
  }

  await prisma.category.update({ where: { id }, data: body });
  await logAdmin({
    actorId: me.id,
    action: 'category.update',
    targetType: 'category',
    targetId: id,
    meta: body,
  });
  return { ok: true };
});

export const DELETE = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const exists = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { genera: true, posts: true } } },
  });
  if (!exists) return fail(404, 'Category 不存在');
  // 安全:有子 Genus / Posts 时拒绝;管理员要先清空
  if (exists._count.genera > 0) {
    return fail(400, `该 Category 下还有 ${exists._count.genera} 个属,请先删除它们`);
  }
  if (exists._count.posts > 0) {
    return fail(400, `该 Category 下还有 ${exists._count.posts} 个帖子,请先转移或删除帖子`);
  }
  await prisma.category.delete({ where: { id } });
  await logAdmin({
    actorId: me.id,
    action: 'category.delete',
    targetType: 'category',
    targetId: id,
    meta: { slug: exists.slug, name: exists.name },
  });
  return { ok: true };
});
