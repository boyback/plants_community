/**
 * GET /api/genera?limit=12&sort=hot|name
 *
 * 全站属列表(用于 Sidebar)。
 * 默认 hot:按帖子数倒序;name:按名字字母序。
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 12)));
  const sort = url.searchParams.get('sort') || 'hot';

  const list = await prisma.genus.findMany({
    take: limit,
    orderBy:
      sort === 'name'
        ? [{ name: 'asc' }]
        : [{ posts: { _count: 'desc' } }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      latinName: true,
      _count: { select: { posts: true } },
      category: {
        select: { slug: true, name: true, icon: true },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    data: list.map((g) => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      latinName: g.latinName,
      posts: g._count.posts,
      categorySlug: g.category.slug,
      categoryName: g.category.name,
      categoryIcon: g.category.icon,
    })),
  });
}
