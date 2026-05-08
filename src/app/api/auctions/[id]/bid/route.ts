import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { advanceAuctionState } from '@/lib/auction';

export const dynamic = 'force-dynamic';

const Body = z.object({
  amount: z.number().int().min(100),
  buyNow: z.boolean().optional(),
});

function pickId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const auctionId = pickId(req);

  await advanceAuctionState(auctionId);

  const body = Body.parse(await req.json());

  // 校验:必须有 held 的保证金
  const part = await prisma.auctionParticipant.findUnique({
    where: { auctionId_userId: { auctionId, userId: me.id } },
  });
  if (!part || part.depositStatus !== 'held') {
    return fail(403, '请先支付保证金后再出价');
  }

  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction) return fail(404, '拍卖不存在');
  if (auction.status !== 'live') return fail(400, '拍卖未在进行中');
  if (auction.sellerId === me.id) return fail(400, '不能给自己的拍卖出价');

  // 自动按一口价
  if (body.buyNow) {
    if (!auction.buyNowPrice) return fail(400, '该场拍卖未设置一口价');
    body.amount = auction.buyNowPrice;
  }

  const minRequired = auction.currentPrice === auction.startPrice && auction.bidCount === 0
    ? auction.startPrice
    : auction.currentPrice + auction.minIncrement;
  if (body.amount < minRequired) {
    return fail(400, `出价至少为 ¥${(minRequired / 100).toFixed(2)}`);
  }
  if (auction.buyNowPrice && body.amount > auction.buyNowPrice) {
    return fail(400, '出价不能超过一口价');
  }

  // 防狙击:剩余时间小于 antiSnipeMinutes 时,延长 endAt
  const now = new Date();
  const remainMs = auction.endAt.getTime() - now.getTime();
  const antiSnipeMs = auction.antiSnipeMinutes * 60 * 1000;
  const newEndAt =
    remainMs > 0 && remainMs < antiSnipeMs
      ? new Date(now.getTime() + antiSnipeMs)
      : auction.endAt;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.auction.findUnique({ where: { id: auctionId } });
    if (!updated || updated.status !== 'live') {
      throw new Error('拍卖已结束');
    }
    // 重新校验当前价(防止并发)
    const minRequiredNow =
      updated.currentPrice === updated.startPrice && updated.bidCount === 0
        ? updated.startPrice
        : updated.currentPrice + updated.minIncrement;
    if (body.amount < minRequiredNow) {
      throw new Error(`出价至少为 ¥${(minRequiredNow / 100).toFixed(2)}`);
    }

    const bid = await tx.bid.create({
      data: {
        auctionId,
        bidderId: me.id,
        amount: body.amount,
      },
    });
    const updated2 = await tx.auction.update({
      where: { id: auctionId },
      data: {
        currentPrice: body.amount,
        bidCount: { increment: 1 },
        endAt: newEndAt,
      },
    });

    // 通知前一位领先者(若有)被超过
    const prev = await tx.bid.findFirst({
      where: {
        auctionId,
        id: { not: bid.id },
        bidderId: { not: me.id },
      },
      orderBy: { amount: 'desc' },
    });
    if (prev) {
      await tx.notification.create({
        data: {
          recipientId: prev.bidderId,
          type: 'system',
          text: `🪙 你在「${updated2.title}」上的出价被超过了,当前价 ¥${(body.amount / 100).toFixed(2)}`,
          link: `/auction/${auctionId}`,
        },
      });
    }

    return { bid, auction: updated2 };
  });

  return {
    bidId: result.bid.id,
    currentPrice: result.auction.currentPrice,
    bidCount: result.auction.bidCount,
    endAt: result.auction.endAt.toISOString(),
    extended: newEndAt.getTime() !== auction.endAt.getTime(),
  };
});
