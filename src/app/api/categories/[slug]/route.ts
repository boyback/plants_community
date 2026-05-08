import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { serializeCategory, serializeGenus } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const slug = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const c = await prisma.category.findUnique({
    where: { slug },
    include: {
      _count: { select: { posts: true, genera: true } },
      genera: {
        orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { posts: true, species: true } } },
      },
    },
  });
  if (!c) return fail(404, '板块不存在');
  return {
    category: serializeCategory(c),
    latinName: c.latinName ?? null,
    kind: c.kind,
    genera: c.genera.map((g) =>
      serializeGenus({ ...g, category: c })
    ),
  };
});
