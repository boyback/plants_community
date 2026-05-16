/**
 * GET  /api/admin/genera?boardId=...    列出某 Category 下的所有 Genus
 * POST /api/admin/genera                   新建 Genus
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  boardId: z.string().min(1),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  latinName: z.string().max(120).nullable().optional(),
  description: z.string().max(500),
  cover: z.string().url().nullable().optional(),
  orderIdx: z.number().int().default(0),
});

export const GET = handler(async (req) => {
  await requireAdmin();
  const boardId = new URL(req.url).searchParams.get('boardId');
  const where = boardId ? { boardId } : {};
  const items = await prisma.genus.findMany({
    where,
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: {
      board: { select: { id: true, name: true, slug: true } },
      _count: { select: { species: true, posts: true } },
    },
  });
  return items;
});

export const POST = handler(async (req) => {
  const me = await requireAdmin();
  const body = Body.parse(await req.json());

  // 检查 boardId 存在
  const cat = await prisma.board.findUnique({ where: { id: body.boardId } });
  if (!cat) return fail(404, 'Category 不存在');

  // 同 category 内 slug 唯一(Genus 没建 unique,但业务要)
  const dup = await prisma.genus.findFirst({
    where: { boardId: body.boardId, slug: body.slug },
  });
  if (dup) return fail(400, `slug "${body.slug}" 在该科下已存在`);

  const row = await prisma.genus.create({ data: body });
  await logAdmin({
    actorId: me.id,
    action: 'genus.create',
    targetType: 'genus',
    targetId: row.id,
    meta: { slug: row.slug, name: row.name, boardId: row.boardId },
  });
  return row;
});
