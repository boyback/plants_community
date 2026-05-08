import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const GET = handler(async () => {
  const me = await getCurrentUser();
  const ym = monthKey();

  const rewards = await prisma.activityReward.findMany({
    orderBy: { threshold: 'asc' },
  });

  // 当月已领
  const claimed = me
    ? new Set(
        (
          await prisma.activityRewardClaim.findMany({
            where: { userId: me.id, yearMonth: ym },
            select: { rewardId: true },
          })
        ).map((x) => x.rewardId)
      )
    : new Set<string>();

  // 解析关联的奖励皮肤
  const skinIds = rewards.map((r) => r.rewardSkinId).filter(Boolean) as string[];
  const skins = skinIds.length
    ? await prisma.skinItem.findMany({ where: { id: { in: skinIds } } })
    : [];
  const skinMap = new Map(skins.map((s) => [s.id, s]));

  // 当前活跃度
  let myScore = 0;
  if (me) {
    const ma = await prisma.monthlyActivity.findUnique({
      where: { userId_yearMonth: { userId: me.id, yearMonth: ym } },
    });
    myScore = ma?.score ?? 0;
  }

  return {
    myScore,
    items: rewards.map((r) => ({
      id: r.id,
      threshold: r.threshold,
      title: r.title,
      description: r.description,
      rewardPoints: r.rewardPoints,
      rewardSkin: r.rewardSkinId ? skinMap.get(r.rewardSkinId) ?? null : null,
      claimedThisMonth: claimed.has(r.id),
      reached: myScore >= r.threshold,
    })),
  };
});
