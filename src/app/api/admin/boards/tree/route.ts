/**
 * GET /api/admin/boards/tree
 *
 * 一次拉完 Category → Genus → Species 三级树。
 * 用于 /admin/boards/tree 全树预览页(可拖拽)。
 *
 * 响应结构:
 *   [{ id, slug, name, icon, orderIdx, kind, postsCount,
 *      genera: [{ id, slug, name, latinName, orderIdx, postsCount,
 *                 species: [{ id, slug, name, latinName, cover, orderIdx, postsCount }] }] }]
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  await requireAdmin();

  const boards = await prisma.board.findMany({
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { posts: true } },
      genera: {
        orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { posts: true } },
          species: {
            orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
            select: {
              id: true,
              slug: true,
              name: true,
              latinName: true,
              cover: true,
              orderIdx: true,
              _count: { select: { posts: true } },
            },
          },
        },
      },
    },
  });

  const tree = boards.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    latinName: c.latinName,
    icons: c.icons,
    cover: c.cover,
    kind: c.kind,
    enabled: c.enabled,
    orderIdx: c.orderIdx,
    postsCount: c._count.posts,
    genera: c.genera.map((g) => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      latinName: g.latinName,
      cover: g.cover,
      orderIdx: g.orderIdx,
      postsCount: g._count.posts,
      species: g.species.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        latinName: s.latinName,
        cover: s.cover,
        orderIdx: s.orderIdx,
        postsCount: s._count.posts,
      })),
    })),
  }));

  return NextResponse.json({ ok: true, data: tree });
}
