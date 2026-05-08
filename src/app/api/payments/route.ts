import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import {
  createOrderPayment,
  createVipPayment,
  createDepositPayment,
  createAuctionBalancePayment,
} from '@/lib/payment';
import { prisma } from '@/lib/db';
import { serializePayment } from '@/lib/serializers';
import { PaymentChannel } from '@prisma/client';

export const dynamic = 'force-dynamic';

const Body = z.object({
  bizType: z.enum(['order', 'vip', 'deposit', 'auction_balance']),
  bizId: z.string(),
  channel: z.enum(['wechat', 'alipay']),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());
  const channel = body.channel as PaymentChannel;

  if (body.bizType === 'order') {
    const o = await prisma.order.findUnique({ where: { id: body.bizId } });
    if (!o) return fail(404, '订单不存在');
    if (o.buyerId !== me.id) return fail(403, '无权支付该订单');
    if (o.source !== 'product') return fail(400, '该订单需走对应的支付通道');
    const p = await createOrderPayment({ orderId: body.bizId, channel });
    return serializePayment(p);
  }

  if (body.bizType === 'auction_balance') {
    const o = await prisma.order.findUnique({ where: { id: body.bizId } });
    if (!o) return fail(404, '订单不存在');
    if (o.buyerId !== me.id) return fail(403, '无权支付该订单');
    if (o.source !== 'auction') return fail(400, '该订单不是拍卖订单');
    const p = await createAuctionBalancePayment({ orderId: body.bizId, channel });
    return serializePayment(p);
  }

  if (body.bizType === 'vip') {
    const vo = await prisma.vipOrder.findUnique({ where: { id: body.bizId } });
    if (!vo) return fail(404, '订单不存在');
    if (vo.userId !== me.id) return fail(403, '无权支付该订单');
    const p = await createVipPayment({ vipOrderId: body.bizId, channel });
    return serializePayment(p);
  }

  if (body.bizType === 'deposit') {
    const part = await prisma.auctionParticipant.findUnique({ where: { id: body.bizId } });
    if (!part) return fail(404, '参与记录不存在');
    if (part.userId !== me.id) return fail(403, '无权操作');
    const p = await createDepositPayment({ participantId: body.bizId, channel });
    return serializePayment(p);
  }

  return fail(400, '未知业务类型');
});
