/**
 * 拍卖业务逻辑(状态推进 / 结束 / 生成胜出订单)
 *
 * 由于 Demo 没有定时任务,我们采用 lazy 推进策略:
 *   - 任意 GET / POST 涉及拍卖的请求,先调 advanceAuctionState() 把过期的拍卖关掉
 *   - 关闭时一次性确定 winner、生成订单、保证金抵扣 / 退还
 */

import { prisma } from './db';
import { Prisma, AuctionStatus, AuctionResult, DepositStatus, OrderSource, OrderStatus } from '@prisma/client';

/**
 * 把已经到期(>= endAt)且仍 live 的拍卖一次性收尾。
 * 同时:
 *   - 待开始 → 进行中
 *   - 已结束的 won 订单超过 24h 未付款 → defaulted(没收保证金)
 */
export async function advanceAuctionState(auctionId?: string) {
  const now = new Date();

  // 1) 待开始 → 进行中
  await prisma.auction.updateMany({
    where: {
      ...(auctionId ? { id: auctionId } : {}),
      status: AuctionStatus.scheduled,
      startAt: { lte: now },
    },
    data: { status: AuctionStatus.live },
  });

  // 2) 进行中 → 已结束(决出胜者 / 流拍)
  const expired = await prisma.auction.findMany({
    where: {
      ...(auctionId ? { id: auctionId } : {}),
      status: AuctionStatus.live,
      endAt: { lte: now },
    },
    select: { id: true },
  });
  for (const { id } of expired) {
    try {
      await finalizeAuction(id);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[auction] finalize ${id} failed:`, e);
    }
  }

  // 3) 胜者 24h 未付款 → defaulted + 罚没保证金
  await enforceDefaultedAuctions(auctionId);
}

const DEFAULT_PAYMENT_DEADLINE_HOURS = 24;

/** 扫描所有「已胜出但订单仍 pending_payment」且超过 24h 的拍卖,标记违约 */
async function enforceDefaultedAuctions(auctionId?: string) {
  const cutoff = new Date(Date.now() - DEFAULT_PAYMENT_DEADLINE_HOURS * 3600_000);
  const candidates = await prisma.auction.findMany({
    where: {
      ...(auctionId ? { id: auctionId } : {}),
      status: AuctionStatus.finished,
      result: AuctionResult.won,
      actualEndAt: { lte: cutoff },
    },
    select: { id: true, winnerId: true, winningOrderId: true, title: true, sellerId: true, depositAmount: true },
  });
  if (candidates.length === 0) return;

  for (const a of candidates) {
    try {
      await defaultOneAuction(a);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[auction] enforce default ${a.id} failed:`, e);
    }
  }
}

async function defaultOneAuction(a: {
  id: string;
  winnerId: string | null;
  winningOrderId: string | null;
  title: string;
  sellerId: string;
  depositAmount: number;
}) {
  if (!a.winningOrderId) return;
  const order = await prisma.order.findUnique({
    where: { id: a.winningOrderId },
    select: { id: true, status: true },
  });
  // 已支付 / 已取消 / 已退款 / 已发货 → 不需要违约处理
  if (!order || order.status !== 'pending_payment') return;

  await prisma.$transaction(async (tx) => {
    // 拍卖标记为违约
    await tx.auction.update({
      where: { id: a.id },
      data: { result: AuctionResult.defaulted },
    });
    // 订单作废(按 winningOrderId)
    await tx.order.update({
      where: { id: a.winningOrderId! },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        refundReason: '胜出者 24 小时内未付款',
      },
    });
    // 把对应参与者保证金标记为 forfeited(没收)
    if (a.winnerId) {
      await tx.auctionParticipant.updateMany({
        where: { auctionId: a.id, userId: a.winnerId, depositStatus: DepositStatus.applied },
        data: { depositStatus: DepositStatus.forfeited },
      });
    }
    // 通知胜者 + 卖家
    if (a.winnerId) {
      await tx.notification.create({
        data: {
          recipientId: a.winnerId,
          type: 'system',
          text: `❗ 你拍下的「${a.title}」未在 24 小时内完成付款,订单已取消,保证金 ¥${(a.depositAmount / 100).toFixed(2)} 已被没收`,
          link: `/auction/${a.id}`,
        },
      });
    }
    await tx.notification.create({
      data: {
        recipientId: a.sellerId,
        type: 'system',
        text: `⚠️ 你的拍卖品「${a.title}」胜出者未在 24 小时内付款,订单已取消`,
        link: `/auction/${a.id}`,
      },
    });
  });
}

/** 拍卖结束:决出胜出者、生成订单、处理保证金 */
async function finalizeAuction(auctionId: string) {
  await prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          orderBy: [{ amount: 'desc' }, { createdAt: 'asc' }],
          take: 1,
        },
      },
    });
    if (!auction || auction.status !== 'live') return;

    const now = new Date();
    const winningBid = auction.bids[0];
    const reached = !auction.reservePrice || (winningBid && winningBid.amount >= auction.reservePrice);

    if (!winningBid || !reached) {
      // 流拍
      await tx.auction.update({
        where: { id: auctionId },
        data: {
          status: AuctionStatus.finished,
          result: AuctionResult.no_bidder,
          actualEndAt: now,
        },
      });
      // 全部参与者保证金原路退回
      await refundAllDeposits(tx, auctionId);
      return;
    }

    const winnerId = winningBid.bidderId;

    // 生成胜出订单(尾款 = 中标价 - 已付保证金;但订单总金额 = 中标价,保证金记到 depositPaid)
    const orderNo = genOrderNo('AUC');
    const order = await tx.order.create({
      data: {
        orderNo,
        source: OrderSource.auction,
        auctionId: auction.id,
        productId: null,
        buyerId: winnerId,
        sellerId: auction.sellerId,
        quantity: 1,
        unitPrice: winningBid.amount,
        totalPrice: winningBid.amount,
        depositPaid: auction.depositAmount,    // 直接抵扣
        pointsBackTotal: 0,
        status: OrderStatus.pending_payment,
      },
    });

    await tx.auction.update({
      where: { id: auctionId },
      data: {
        status: AuctionStatus.finished,
        result: AuctionResult.won,
        winnerId,
        winningOrderId: order.id,
        actualEndAt: now,
        currentPrice: winningBid.amount,
      },
    });

    // 把胜出者的保证金标记为 applied(抵扣到这个订单)
    await tx.auctionParticipant.updateMany({
      where: { auctionId, userId: winnerId, depositStatus: DepositStatus.held },
      data: { depositStatus: DepositStatus.applied },
    });

    // 其他参与者的保证金原路退回
    await refundOtherParticipants(tx, auctionId, winnerId);

    // 通知胜出者
    await tx.notification.create({
      data: {
        recipientId: winnerId,
        type: 'system',
        text: `🎉 恭喜你以 ¥${(winningBid.amount / 100).toFixed(2)} 的价格拍下了「${auction.title}」,请在 24 小时内支付尾款 ¥${((winningBid.amount - auction.depositAmount) / 100).toFixed(2)}`,
        link: `/orders`,
      },
    });
    // 通知卖家
    await tx.notification.create({
      data: {
        recipientId: auction.sellerId,
        type: 'system',
        text: `🔨 你的拍卖品「${auction.title}」已成交,等待买家付款`,
        link: `/auction/${auction.id}`,
      },
    });
  });
}

/** 流拍时:全员退保证金 */
async function refundAllDeposits(tx: Prisma.TransactionClient, auctionId: string) {
  const ps = await tx.auctionParticipant.findMany({
    where: { auctionId, depositStatus: DepositStatus.held },
  });
  for (const p of ps) {
    await refundOneParticipant(tx, p.id, p.userId, p.depositAmount);
  }
}

/** 胜出后:除胜者外退保证金 */
async function refundOtherParticipants(
  tx: Prisma.TransactionClient,
  auctionId: string,
  winnerId: string
) {
  const ps = await tx.auctionParticipant.findMany({
    where: {
      auctionId,
      depositStatus: DepositStatus.held,
      userId: { not: winnerId },
    },
  });
  for (const p of ps) {
    await refundOneParticipant(tx, p.id, p.userId, p.depositAmount);
  }
}

async function refundOneParticipant(
  tx: Prisma.TransactionClient,
  participantId: string,
  userId: string,
  amount: number
) {
  await tx.auctionParticipant.update({
    where: { id: participantId },
    data: { depositStatus: DepositStatus.refunded },
  });
  // 保证金以积分形式退回(简化)。真实生产应通过原支付渠道退款。
  // 这里根据保证金支付时的渠道决定:Demo 中无论现金渠道,都按比例转积分
  // (1 元 = 100 积分),并发通知。
  const pts = Math.max(1, Math.floor(amount / 100) * 100);
  const u = await tx.user.update({
    where: { id: userId },
    data: { pointsBalance: { increment: pts } },
    select: { pointsBalance: true },
  });
  await tx.pointsLedger.create({
    data: {
      userId,
      type: 'admin',
      delta: pts,
      balance: u.pointsBalance,
      refType: 'auction_deposit_refund',
      refId: participantId,
      remark: `拍卖保证金退还(¥${(amount / 100).toFixed(2)})`,
    },
  });
  await tx.notification.create({
    data: {
      recipientId: userId,
      type: 'system',
      text: `💰 你的拍卖保证金 ¥${(amount / 100).toFixed(2)} 已退回(等值 ${pts} 积分)`,
    },
  });
}

export function genOrderNo(prefix = 'RY') {
  const now = new Date();
  const ymd =
    now.getFullYear().toString().slice(2) +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  return (
    prefix +
    ymd +
    Date.now().toString(36).slice(-5).toUpperCase() +
    Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  );
}
