import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { serializeSpeciesFull } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const slug = url.pathname.split('/').filter(Boolean).pop()!;
  const genusSlug = url.searchParams.get('genus') ?? undefined;

  const s = await prisma.species.findFirst({
    where: {
      slug,
      ...(genusSlug ? { genus: { slug: genusSlug } } : {}),
    },
    include: {
      genus: { include: { category: true } },
      _count: { select: { posts: true } },
    },
  });
  if (!s) return fail(404, '品种不存在');
  return serializeSpeciesFull(s);
});
