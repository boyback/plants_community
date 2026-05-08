import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { serializeCategory } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') ?? undefined;

  const list = await prisma.category.findMany({
    where: {
      enabled: true,
      ...(kind ? { kind: kind as 'family' | 'discussion' | 'market' } : {}),
    },
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { posts: true, genera: true } } },
  });
  return list.map(serializeCategory);
});
