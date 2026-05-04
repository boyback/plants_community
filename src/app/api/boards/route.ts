import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { serializeBoard } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const list = await prisma.board.findMany({
    orderBy: { orderIdx: 'asc' },
    include: { _count: { select: { posts: true } } },
  });
  return list.map(serializeBoard);
});
