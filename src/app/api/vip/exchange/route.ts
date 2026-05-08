import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { applyVipMembership } from '@/lib/payment';
import { VIP_PLANS } from '@/lib/vip-plans';

export const dynamic = 'force-dynamic';

/** 积分兑换月卡 */
export const POST = handler(async () => {
  const me = await requireUser();
  const plan = VIP_PLANS.find((p) => p.key === 'monthly_points');
  if (!plan) return fail(500, '套餐配置缺失');
  if (me.pointsBalance < plan.pointsCost) {
    return fail(400, `积分不足,需要 ${plan.pointsCost},当前 ${me.pointsBalance}`);
  }

  await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: me.id },
      data: { pointsBalance: { decrement: plan.pointsCost } },
      select: { pointsBalance: true },
    });
    await tx.pointsLedger.create({
      data: {
        userId: me.id,
        type: 'exchange_vip',
        delta: -plan.pointsCost,
        balance: u.pointsBalance,
        refType: 'vip',
        refId: 'monthly_points',
        remark: '积分兑换大会员月卡',
      },
    });
    // 记录一笔 vipOrder(已完成),便于日后审计
    await tx.vipOrder.create({
      data: {
        orderNo: 'VIPP' + Date.now().toString(36).toUpperCase(),
        userId: me.id,
        plan: 'monthly_points',
        amount: 0,
        pointsCost: plan.pointsCost,
        durationDays: plan.durationDays,
        status: 'completed',
        paidAt: new Date(),
      },
    });
  });

  await applyVipMembership(me.id, 'monthly_points', plan.durationDays);
  return { ok: true };
});
