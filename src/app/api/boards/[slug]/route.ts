import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { serializeBoard } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const slug = url.pathname.split('/').pop()!;

  const board = await prisma.board.findUnique({
    where: { slug },
    include: { _count: { select: { posts: true } } },
  });
  if (!board) return fail(404, '板块不存在');

  return serializeBoard(board);
});
