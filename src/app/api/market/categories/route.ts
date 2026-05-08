import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const groups = await prisma.product.groupBy({
    by: ['category'],
    where: { status: 'on_sale' },
    _count: true,
  });
  return groups
    .map((g) => ({ name: g.category, count: g._count }))
    .sort((a, b) => b.count - a.count);
});
