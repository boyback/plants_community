import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function pickId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const ym = monthKey();

  const reward = await prisma.activityReward.findUnique({ where: { id } });
  if (!reward) return fail(404, '奖励不存在');

  // 是否达到门槛
  const ma = await prisma.monthlyActivity.findUnique({
    where: { userId_yearMonth: { userId: me.id, yearMonth: ym } },
  });
  const score = ma?.score ?? 0;
  if (score < reward.threshold) {
    return fail(400, `活跃度不足,需要 ${reward.threshold},当前 ${score}`);
  }

  // 是否已领过
  const exist = await prisma.activityRewardClaim.findUnique({
    where: {
      userId_rewardId_yearMonth: {
        userId: me.id,
        rewardId: reward.id,
        yearMonth: ym,
      },
    },
  });
  if (exist) return fail(400, '本月已领过该奖励');

  await prisma.$transaction(async (tx) => {
    await tx.activityRewardClaim.create({
      data: {
        userId: me.id,
        rewardId: reward.id,
        yearMonth: ym,
      },
    });

    if (reward.rewardPoints > 0) {
      const u = await tx.user.update({
        where: { id: me.id },
        data: { pointsBalance: { increment: reward.rewardPoints } },
        select: { pointsBalance: true },
      });
      await tx.pointsLedger.create({
        data: {
          userId: me.id,
          type: 'activity_reward',
          delta: reward.rewardPoints,
          balance: u.pointsBalance,
          refType: 'activity_reward',
          refId: reward.id,
          remark: `活跃度奖励:${reward.title}`,
        },
      });
    }

    if (reward.rewardSkinId) {
      // 已拥有就跳过,否则发放
      const owned = await tx.userSkin.findUnique({
        where: { userId_skinId: { userId: me.id, skinId: reward.rewardSkinId } },
      });
      if (!owned) {
        await tx.userSkin.create({
          data: {
            userId: me.id,
            skinId: reward.rewardSkinId,
            obtainedFrom: 'reward',
          },
        });
      }
    }
  });

  return { ok: true, rewardPoints: reward.rewardPoints, rewardSkinId: reward.rewardSkinId };
});
