/**
 * GET /api/species/:id/raters?limit=10
 *
 * 返回最近 N 个打分用户(按 createdAt desc),含头像 + 分数,
 * 用于品种页展示「打分者头像墙」。
 */

import { handler, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const speciesId = url.pathname.split('/').filter(Boolean)[2];
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));

  const sp = await prisma.species.findUnique({
    where: { id: speciesId },
    select: { id: true, ratingSum: true, ratingCount: true, difficulty: true },
  });
  if (!sp) return fail(404, '品种不存在');

  const me = await getCurrentUser();

  const [items, myRating] = await Promise.all([
    prisma.speciesRating.findMany({
      where: { speciesId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatar: true, equipPendantId: true, level: true } },
      },
    }),
    me
      ? prisma.speciesRating.findUnique({
          where: { userId_speciesId: { userId: me.id, speciesId } },
          select: { score: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    avg: sp.ratingCount > 0 ? sp.ratingSum / sp.ratingCount : sp.difficulty,
    ratingCount: sp.ratingCount,
    myScore: myRating?.score ?? null,
    items: items.map((r) => ({
      id: r.id,
      score: r.score,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
    })),
  };
});
