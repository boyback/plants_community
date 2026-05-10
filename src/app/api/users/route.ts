import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '5'), 20);
  const random = url.searchParams.get('random') === '1';
  const me = await getCurrentUser();

  if (random) {
    // 随机抽取 N 倍数后客户端洗牌(简单可靠,小型用户量足够)
    const pool = await prisma.user.findMany({
      where: me ? { id: { not: me.id } } : undefined,
      take: Math.max(limit * 5, 30),
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    });
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, limit);
    return shuffled.map(serializeUser);
  }

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
