import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { advanceAuctionState } from '@/lib/auction';
import { PaymentChannel } from '@prisma/client';
import { createDepositPayment, getPaymentPagePayUrl } from '@/lib/payment';
import { serializePayment } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

const Body = z.object({
  channel: z.enum(['wechat', 'alipay', 'points']),
});

function pickId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 2]; // /api/auctions/[id]/join
}

/**
 * 参与拍卖:
 *   1. 创建/更新 AuctionParticipant(pending → 等待付款)
 *   2. 创建保证金支付单(走现金渠道) 或 直接扣钻石(channel=points)
 *   3. 返回 payment(让前端跳到二维码页)或 直接成功(钻石支付)
 */
export const POST = handler(async (req) => {
  const me = await requireUser();
  const auctionId = pickId(req);
  const body = Body.parse(await req.json());

  await advanceAuctionState(auctionId);

  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction) return fail(404, '拍卖不存在');
  if (auction.sellerId === me.id) return fail(400, '不能参与自己发起的拍卖');
  if (auction.status !== 'live') return fail(400, '拍卖未在进行中');

  // 已经持有保证金,无需再付
  const existing = await prisma.auctionParticipant.findUnique({
    where: { auctionId_userId: { auctionId, userId: me.id } },
  });
  if (existing && existing.depositStatus === 'held') {
    return { alreadyParticipated: true };
  }

  const depositAmount = auction.depositAmount;

  // ===== 钻石支付 =====
  if (body.channel === 'points') {
    const pointsCost = Math.ceil(depositAmount / 100) * 100; // 1 元 = 100 钻石(简化)
    if (me.pointsBalance < pointsCost) {
      return fail(400, `钻石不足,需 ${pointsCost} 当前 ${me.pointsBalance}`);
    }
    await prisma.$transaction(async (tx) => {
      // 扣钻石
      const u = await tx.user.update({
        where: { id: me.id },
        data: { pointsBalance: { decrement: pointsCost } },
        select: { pointsBalance: true },
      });
      await tx.pointsLedger.create({
        data: {
          userId: me.id,
          type: 'admin',
          delta: -pointsCost,
          balance: u.pointsBalance,
          refType: 'auction_deposit',
          refId: auctionId,
          remark: `拍卖保证金(¥${(depositAmount / 100).toFixed(2)})`,
        },
      });
      // 创建/更新参与者
      await tx.auctionParticipant.upsert({
        where: { auctionId_userId: { auctionId, userId: me.id } },
        update: { depositStatus: 'held', depositAmount },
        create: {
          auctionId,
          userId: me.id,
          depositStatus: 'held',
          depositAmount,
        },
      });
    });
    return { joined: true, channel: 'points' };
  }

  // ===== 现金渠道:创建参与者(pending) + Payment =====
  const participant = await prisma.auctionParticipant.upsert({
    where: { auctionId_userId: { auctionId, userId: me.id } },
    update: { depositStatus: 'pending', depositAmount },
    create: {
      auctionId,
      userId: me.id,
      depositStatus: 'pending',
      depositAmount,
    },
  });

  const channel = body.channel as PaymentChannel;
  const payment = await createDepositPayment({ participantId: participant.id, channel });

  return {
    joined: false,
    payment: {
      ...serializePayment(payment),
      pagePayUrl: getPaymentPagePayUrl(payment.payNo),
    },
  };
});
