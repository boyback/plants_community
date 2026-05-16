import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { serializeCategory } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const slug = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const c = await prisma.board.findUnique({
    where: { slug },
    include: { _count: { select: { posts: true, genera: true } } },
  });
  if (!c) return fail(404, '板块不存在');
  return serializeCategory(c);
});
