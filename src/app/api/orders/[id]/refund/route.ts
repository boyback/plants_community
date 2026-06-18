import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

const Body = z.object({ reason: z.string().min(1).max(500) });

export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const body = Body.parse(await req.json());
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return fail(404, '订单不存在');
  if (order.buyerId !== me.id) return fail(403, '只有买家能申请退款');

  if (
    !['pending_ship', 'pending_receipt', 'pending_review'].includes(order.status)
  ) {
    return fail(400, '当前状态不允许退款');
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: {
        status: 'refunded',
        refundReason: body.reason,
        refundedAt: new Date(),
      },
    });
    // 回滚库存(仅普通商品订单)
    if (order.source === 'product' && order.productId) {
      await tx.product.update({
        where: { id: order.productId },
        data: { stock: { increment: order.quantity } },
      });
    }
    // 回收返利钻石(若已发放)
    if (order.pointsBackTotal > 0) {
      const u = await tx.user.update({
        where: { id: order.buyerId },
        data: { pointsBalance: { decrement: order.pointsBackTotal } },
        select: { pointsBalance: true },
      });
      await tx.pointsLedger.create({
        data: {
          userId: order.buyerId,
          type: 'refund',
          delta: -order.pointsBackTotal,
          balance: u.pointsBalance,
          refType: 'order',
          refId: order.id,
          remark: '订单退款回收返利',
        },
      });
    }
  });

  return { ok: true };
});
