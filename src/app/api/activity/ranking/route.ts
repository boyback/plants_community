import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { serializeUser } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const ym = url.searchParams.get('ym') ?? monthKey();
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 100);

  const rows = await prisma.monthlyActivity.findMany({
    where: { yearMonth: ym },
    orderBy: { score: 'desc' },
    take: limit,
    include: {
      user: {
        include: {
          _count: { select: { posts: true, followers: true, following: true } },
          badges: { include: { badge: true } },
        },
      },
    },
  });

  return {
    yearMonth: ym,
    items: rows.map((r, i) => ({
      rank: i + 1,
      user: serializeUser(r.user),
      score: r.score,
    })),
  };
});
