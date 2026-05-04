import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '5'), 20);
  const me = await getCurrentUser();

  const list = await prisma.user.findMany({
    where: me ? { id: { not: me.id } } : undefined,
    take: limit,
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });
  return list.map(serializeUser);
});
