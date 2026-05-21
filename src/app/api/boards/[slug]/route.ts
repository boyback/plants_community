import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { serializeCategory } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const slug = url.pathname.split('/').filter(Boolean).pop()!;
  // 默认返回 genera 列表(发帖页 / 移帖弹窗 / 市场卖家页都依赖这个字段);
  // 可通过 ?withGenera=0 显式关闭以减小响应体。
  const withGenera = url.searchParams.get('withGenera') !== '0';

  const c = await prisma.board.findUnique({
    where: { slug },
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
  if (!c) return fail(404, '板块不存在');
  return serializeCategory(c);
});
