import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { serializeCategory } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

/**
 * 兼容接口:返回 Category 列表(格式上是 Board)。
 * 旧代码继续调 /api/boards 可以无缝工作。
 * 支持查询参数:
 * - kind: 按板块类型过滤 (如 'family')
 * - withGenera: 是否包含属列表 (1 或 true)
 */
export const GET = handler(async (req) => {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  const withGenera = searchParams.get('withGenera') === '1' || searchParams.get('withGenera') === 'true';

  const list = await prisma.board.findMany({
    where: {
      enabled: true,
      ...(kind && { kind }),
    },
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { posts: true, genera: true } },
      ...(withGenera && {
        genera: {
          orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
          include: {
            _count: { select: { posts: true, species: true } },
          },
        },
      }),
    },
  });
  return list.map(serializeCategory);
});
