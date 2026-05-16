/**
 * PATCH /api/admin/boards/:type/:id
 *   type = board | genus | species
 *   body: { enabled?: boolean, orderIdx?: number }
 * DELETE /api/admin/boards/:type/:id
 *   type = board | genus | species
 *   删除板块/属/品种（级联删除子项）
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  enabled: z.boolean().optional(),
  orderIdx: z.number().int().optional(),
  slug: z.string().optional(),
  name: z.string().optional(),
  latinName: z.string().nullable().optional(),
  kind: z.string().optional(),
  description: z.string().optional(),
  cover: z.string().optional(),
  icons: z.string().optional(),
});

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const id = parts.pop()!;
  const type = parts.pop()!;
  const body = Body.parse(await req.json());

  if (!['board'].includes(type)) return fail(400, 'type 无效(目前只 board 支持更新)');

  const data: Record<string, unknown> = {};
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled;
  if (typeof body.orderIdx === 'number') data.orderIdx = body.orderIdx;
  if (body.slug) data.slug = body.slug;
  if (body.name) data.name = body.name;
  if (body.latinName !== undefined) data.latinName = body.latinName;
  if (body.kind) data.kind = body.kind;
  if (body.description !== undefined) data.description = body.description;
  if (body.cover !== undefined) data.cover = body.cover;
  if (body.icons) data.icons = body.icons;
  if (Object.keys(data).length === 0) return fail(400, '没有变更');

  const exists = await prisma.board.findUnique({ where: { id } });
  if (!exists) return fail(404, 'board 不存在');
  await prisma.board.update({ where: { id }, data });

  await logAdmin({
    actorId: me.id,
    action: `board.${type}.update`,
    targetType: type,
    targetId: id,
    meta: data,
  });
  return { ok: true };
});

export const DELETE = handler(async (req) => {
  const me = await requireAdmin();
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const id = parts.pop()!;
  const type = parts.pop()!;

  if (type === 'board') {
    const exists = await prisma.board.findUnique({
      where: { id },
      include: {
        _count: { select: { genera: true, posts: true } },
        genera: {
          include: { _count: { select: { posts: true } } },
        },
      },
    });
    if (!exists) return fail(404, 'Board 不存在');

    // 检查所有属下是否有帖子
    const totalPostsInGenera = exists.genera.reduce((sum, g) => sum + g._count.posts, 0);
    if (totalPostsInGenera > 0) {
      return fail(400, `该板块下的属中还有 ${totalPostsInGenera} 个帖子，请先转移或删除帖子`);
    }

    // 级联删除：先删除所有属（及其下的品种），再删除板块
    await prisma.board.delete({ where: { id } });

    await logAdmin({
      actorId: me.id,
      action: 'board.delete',
      targetType: 'board',
      targetId: id,
      meta: { slug: exists.slug, name: exists.name, generaCount: exists._count.genera },
    });
    return { ok: true };
  } else if (type === 'genus') {
    const exists = await prisma.genus.findUnique({
      where: { id },
      include: { _count: { select: { species: true, posts: true } } },
    });
    if (!exists) return fail(404, 'Genus 不存在');

    if (exists._count.species > 0 || exists._count.posts > 0) {
      return fail(400, '该属下还有品种或帖子，无法删除');
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
  } else if (type === 'species') {
    const exists = await prisma.species.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } } },
    });
    if (!exists) return fail(404, 'Species 不存在');

    if (exists._count.posts > 0) {
      return fail(400, '该品种下还有帖子，无法删除');
    }

    await prisma.species.delete({ where: { id } });

    await logAdmin({
      actorId: me.id,
      action: 'species.delete',
      targetType: 'species',
      targetId: id,
      meta: { slug: exists.slug, name: exists.name },
    });
    return { ok: true };
  }

  return fail(400, 'type 无效');
});
