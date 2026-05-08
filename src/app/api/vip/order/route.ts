import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { VIP_PLANS } from '@/lib/vip-plans';

export const dynamic = 'force-dynamic';

const Body = z.object({
  plan: z.enum(['monthly', 'quarterly', 'yearly', 'lifetime']),
});

function genOrderNo() {
  const now = new Date();
  const ymd = now.getFullYear().toString().slice(2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  return 'VIP' + ymd + Date.now().toString(36).slice(-5).toUpperCase();
}

/** 创建会员订单(现金支付),拿到 vipOrderId 后再去 /api/payments 拉起支付 */
export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());

  const plan = VIP_PLANS.find((p) => p.key === body.plan);
  if (!plan || plan.pointsCost > 0) return fail(400, '请选择现金套餐');

  const order = await prisma.vipOrder.create({
    data: {
      orderNo: genOrderNo(),
      userId: me.id,
      plan: plan.key as 'monthly' | 'quarterly' | 'yearly' | 'lifetime',
      amount: plan.amount,
      pointsCost: 0,
      durationDays: plan.durationDays,
      status: 'pending_payment',
    },
  });
  return { orderId: order.id, orderNo: order.orderNo, amount: order.amount };
});
