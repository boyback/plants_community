import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { serializeCategory } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

/**
 * 兼容接口:返回 Category 列表(格式上是 Board)。
 * 旧代码继续调 /api/boards 可以无缝工作。
 */
export const GET = handler(async () => {
  const list = await prisma.category.findMany({
    where: { enabled: true },
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { posts: true, genera: true } } },
  });
  return list.map(serializeCategory);
});
