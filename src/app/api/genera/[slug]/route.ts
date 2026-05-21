import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { serializeGenus, serializeSpecies, serializeCategory } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const slug = url.pathname.split('/').filter(Boolean).pop()!;
  // 兼容两种参数名:?board=xxx(发帖页 / 移帖 / 市场卖家页都用这个)
  // 与早期写法 ?category=xxx;两者等价,优先 board。
  const boardSlug =
    url.searchParams.get('board') ?? url.searchParams.get('category') ?? undefined;

  const g = await prisma.genus.findFirst({
    where: {
      slug,
      ...(boardSlug ? { board: { slug: boardSlug } } : {}),
    },
    include: {
      board: { include: { _count: { select: { posts: true, genera: true } } } },
      _count: { select: { posts: true, species: true } },
      species: {
        orderBy: [{ name: 'asc' }],
        include: { _count: { select: { posts: true } } },
      },
    },
  });
  if (!g) return fail(404, '属不存在');

  return {
    genus: serializeGenus(g),
    latinName: g.latinName ?? null,
    category: g.board ? serializeCategory(g.board) : null,
    species: g.species.map((s) =>
      serializeSpecies({ ...s, genus: { ...g, board: g.board } })
    ),
  };
});
