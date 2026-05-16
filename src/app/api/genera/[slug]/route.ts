import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { serializeGenus, serializeSpecies, serializeCategory } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const slug = url.pathname.split('/').filter(Boolean).pop()!;
  const categorySlug = url.searchParams.get('category') ?? undefined;

  const g = await prisma.genus.findFirst({
    where: {
      slug,
      ...(categorySlug ? { board: { slug: categorySlug } } : {}),
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
    category: serializeCategory(g.board),
    species: g.species.map((s) =>
      serializeSpecies({ ...s, genus: { ...g, category: g.board } })
    ),
  };
});
