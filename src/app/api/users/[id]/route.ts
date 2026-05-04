import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { serializeUser } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });
  if (!u) return fail(404, '用户不存在');
  return serializeUser(u);
});
