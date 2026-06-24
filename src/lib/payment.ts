/**
 * 支付业务层。
 *
 * 当前实现:接入 src/lib/payment/gateway.ts 的 PaymentGateway 抽象。
 * 支付宝 PC 支付返回 pagePayUrl 直接跳转,微信支付返回 qrcode 渲染二维码。
 */

import { prisma } from './db';
import {
  PaymentBizType,
  PaymentChannel,
  PaymentStatus,
  OrderStatus,
} from '@prisma/client';
import { emitEvent } from './events';
import { pickGateway } from './payment/gateway';
import { expirePendingOrder } from './order-expiry';

const PAY_EXPIRE_MINUTES = 15;
const _paymentPagePayUrls = new Map<string, { url: string; expireAt: number }>();

function randomNo(prefix: string) {
  return (
    prefix +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 7).toUpperCase()
  );
}

/** 所有 createXxxPayment 共用的逻辑:调 gateway 拿 qrcode/pagePayUrl + 写 Payment 行 */
async function createWithGateway(params: {
  bizType: PaymentBizType;
  bizId: string;
  userId: string;
  amount: number;
  channel: PaymentChannel;
  subject: string;
  meta: Record<string, string>;
  payNoPrefix?: string;
}) {
  // 取消旧的 pending 单
  await prisma.payment.updateMany({
    where: {
      bizType: params.bizType,
      bizId: params.bizId,
      status: PaymentStatus.pending,
    },
    data: { status: PaymentStatus.cancelled },
  });

  const payNo = randomNo(params.payNoPrefix ?? 'PY');
  const expireAt = new Date(Date.now() + PAY_EXPIRE_MINUTES * 60_000);

  // 按 channel 选网关
  const gateway = pickGateway(params.channel as 'alipay' | 'wechat' | 'points');

  const res = await gateway.createPayment({
    payNo,
    userId: params.userId,
    amount: params.amount,
    channel: params.channel as 'alipay' | 'wechat' | 'points',
    subject: params.subject,
    expireMinutes: PAY_EXPIRE_MINUTES,
    meta: params.meta,
  });
  const qrcode = res.qrcode ?? '';
  const pagePayUrl = res.pagePayUrl;

  const payment = await prisma.payment.create({
    data: {
      payNo,
      bizType: params.bizType,
      bizId: params.bizId,
      userId: params.userId,
      channel: params.channel,
      amount: params.amount,
      qrcode,
      status: PaymentStatus.pending,
      expireAt,
    },
  });
  if (pagePayUrl) {
    _paymentPagePayUrls.set(payNo, { url: pagePayUrl, expireAt: expireAt.getTime() });
  }
  return payment;
}

export function getPaymentPagePayUrl(payNo: string): string | undefined {
  const cached = _paymentPagePayUrls.get(payNo);
  if (!cached) return undefined;
  if (cached.expireAt < Date.now()) {
    _paymentPagePayUrls.delete(payNo);
    return undefined;
  }
  return cached.url;
}

/**
 * 创建商品订单的支付单
 */
export async function createOrderPayment(params: {
  orderId: string;
  channel: PaymentChannel;
}) {
  const order = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!order) throw new Error('订单不存在');
  if (await expirePendingOrder(order.id)) throw new Error('订单已超时关闭');
  const freshOrder = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!freshOrder || freshOrder.status !== 'pending_payment') throw new Error('订单状态不允许支付');

  return createWithGateway({
    bizType: PaymentBizType.order,
    bizId: freshOrder.id,
    userId: freshOrder.buyerId,
    amount: freshOrder.totalPrice,
    channel: params.channel,
    subject: `订单 ${freshOrder.orderNo}`,
    meta: { bizType: 'order', orderId: freshOrder.id },
  });
}

/** 创建拍卖保证金的支付单 */
export async function createDepositPayment(params: {
  participantId: string;
  channel: PaymentChannel;
}) {
  const part = await prisma.auctionParticipant.findUnique({
    where: { id: params.participantId },
  });
  if (!part) throw new Error('参与者不存在');
  if (part.depositStatus !== 'pending') throw new Error('保证金状态不允许重新支付');

  const payment = await createWithGateway({
    bizType: PaymentBizType.deposit,
    bizId: part.id,
    userId: part.userId,
    amount: part.depositAmount,
    channel: params.channel,
    subject: `拍卖保证金 ${part.id}`,
    meta: { bizType: 'deposit', participantId: part.id },
    payNoPrefix: 'DEP',
  });
  await prisma.auctionParticipant.update({
    where: { id: part.id },
    data: { depositPaymentId: payment.id },
  });
  return payment;
}

/** 创建拍卖订单尾款的支付单 */
export async function createAuctionBalancePayment(params: {
  orderId: string;
  channel: PaymentChannel;
}) {
  const order = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.source !== 'auction') throw new Error('该订单不是拍卖订单');
  if (await expirePendingOrder(order.id)) throw new Error('订单已超时关闭');
  const freshOrder = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!freshOrder || freshOrder.status !== 'pending_payment') throw new Error('订单状态不允许支付');

  const balance = freshOrder.totalPrice - freshOrder.depositPaid;
  if (balance <= 0) throw new Error('订单余额已结清');

  return createWithGateway({
    bizType: PaymentBizType.auction_balance,
    bizId: freshOrder.id,
    userId: freshOrder.buyerId,
    amount: balance,
    channel: params.channel,
    subject: `拍卖尾款 ${freshOrder.orderNo}`,
    meta: { bizType: 'auction_balance', orderId: freshOrder.id },
    payNoPrefix: 'AB',
  });
}

/**
 * 进程内的 query 节流缓存:payNo → lastQueryMs
 * 防止前端高频轮询导致支付宝侧限流。
 */
const _lastQueryAt = new Map<string, number>();
const QUERY_MIN_INTERVAL_MS = 1500;
/** 扫码中标记:payNo → 最近一次被远端标记 scanning 的时间戳(2s 内视为仍在扫) */
const _scanningUntil = new Map<string, number>();
const SCANNING_STICKY_MS = 2000;

/**
 * 查询支付单状态(自动处理超时)。
 *
 * 当 payment 仍是 pending 时,主动向真实网关(pickGateway())
 * 查询 `alipay.trade.query`,如果远端已 paid 就自动 confirm 入账,
 * 从而替代 webhook,在没有公网回调的场景里保持行为一致。
 *
 * 同一 payNo 2 秒内的重复请求会跳过远端查询,直接返回本地状态。
 */
export async function queryPayment(payNo: string) {
  const p = await prisma.payment.findUnique({ where: { payNo } });
  if (!p) return null;
  // 过期处理
  if (p.status === PaymentStatus.pending && p.expireAt.getTime() < Date.now()) {
    await prisma.payment.update({
      where: { id: p.id },
      data: { status: PaymentStatus.expired },
    });
    if (p.bizType === PaymentBizType.order || p.bizType === PaymentBizType.auction_balance) {
      await expirePendingOrder(p.bizId);
    }
    return { ...p, status: PaymentStatus.expired };
  }

  // 远端主动轮询(只在 pending + 真实通道时做,且有节流)
  const lastAt = _lastQueryAt.get(p.payNo) ?? 0;
  const canQueryRemote =
    p.status === PaymentStatus.pending &&
    (p.channel === 'alipay' || p.channel === 'wechat') &&
    Date.now() - lastAt >= QUERY_MIN_INTERVAL_MS;

  if (canQueryRemote) {
    _lastQueryAt.set(p.payNo, Date.now());
    try {
      const gateway = pickGateway(p.channel as 'alipay' | 'wechat' | 'points');
      const remote = await gateway.queryStatus(p.payNo);
      if (remote === 'paid') {
        _scanningUntil.delete(p.payNo);
        // 触发本地入账;confirm 内部幂等
        try {
          await confirmPayment(p.payNo);
        } catch (err) {
          console.warn('[payment] auto-confirm after queryStatus paid failed:', err);
        }
        const fresh = await prisma.payment.findUnique({ where: { payNo } });
        if (fresh) return fresh;
      } else if (remote === 'cancelled' || remote === 'expired') {
        _scanningUntil.delete(p.payNo);
        await prisma.payment.update({
          where: { id: p.id },
          data: { status: remote === 'cancelled' ? PaymentStatus.cancelled : PaymentStatus.expired },
        });
        if (p.bizType === PaymentBizType.order || p.bizType === PaymentBizType.auction_balance) {
          await expirePendingOrder(p.bizId);
        }
        return { ...p, status: remote === 'cancelled' ? PaymentStatus.cancelled : PaymentStatus.expired };
      } else if (remote === 'scanning') {
        _scanningUntil.set(p.payNo, Date.now() + SCANNING_STICKY_MS);
      }
      // remote === 'pending' | null → 保留本地 pending
    } catch (err) {
      // 远端查询失败不影响本地响应
      console.warn('[payment] gateway.queryStatus failed:', err);
    }
  }

  return p;
}

/**
 * 判断某个 payNo 是否最近被标记为「扫码中」(近 10s 内)。
 * 用于 API 层在 serialize 响应时附加瞬时 scanning 字段。
 */
export function isScanning(payNo: string): boolean {
  const until = _scanningUntil.get(payNo);
  if (!until) return false;
  if (until < Date.now()) {
    _scanningUntil.delete(payNo);
    return false;
  }
  return true;
}

/**
 * 确认支付成功并推进业务状态。
 * 由支付网关 webhook 或主动查单确认触发。
 */
export async function confirmPayment(payNo: string) {
  const payment = await prisma.payment.findUnique({ where: { payNo } });
  if (!payment) throw new Error('支付单不存在');
  if (payment.status === PaymentStatus.paid) {
    return { alreadyPaid: true };
  }
  if (payment.status !== PaymentStatus.pending) {
    throw new Error('支付单状态不允许确认');
  }
  if (payment.expireAt.getTime() < Date.now()) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.expired },
    });
    throw new Error('支付单已过期');
  }

  // 标记 paid + 串联业务
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: PaymentStatus.paid, paidAt: new Date() },
  });

  if (payment.bizType === PaymentBizType.order) {
    await onOrderPaid(payment.bizId);
  } else if (payment.bizType === PaymentBizType.deposit) {
    await onDepositPaid(payment.bizId);
  } else if (payment.bizType === PaymentBizType.auction_balance) {
    await onOrderPaid(payment.bizId);
  }

  return { alreadyPaid: false };
}

/** 保证金支付完成:把参与者标记为 held,可以正常出价 */
async function onDepositPaid(participantId: string) {
  const p = await prisma.auctionParticipant.findUnique({
    where: { id: participantId },
  });
  if (!p) return;
  if (p.depositStatus !== 'pending') return;

  await prisma.auctionParticipant.update({
    where: { id: participantId },
    data: { depositStatus: 'held' },
  });

  await prisma.notification.create({
    data: {
      recipientId: p.userId,
      type: 'system',
      text: '🔨 保证金已到账,你现在可以参与出价啦',
      link: `/auction/${p.auctionId}`,
    },
  });
}

async function onOrderPaid(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  // 状态推进:待付款 → 待发货
  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.pending_ship },
  });

  // 普通商品订单才扣库存
  if (order.source === 'product' && order.productId) {
    await prisma.product.update({
      where: { id: order.productId },
      data: { stock: { decrement: order.quantity } },
    });
    const p = await prisma.product.findUnique({ where: { id: order.productId } });
    if (p && p.source === 'c2c' && p.stock <= 0) {
      await prisma.product.update({
        where: { id: p.id },
        data: { status: 'sold_out' },
      });
    }
  }

  if (order.source === 'product' && order.listingItemId) {
    const updateResult = await prisma.marketListingItem.updateMany({
      where: {
        id: order.listingItemId,
        status: 'on_sale',
        stock: { gte: order.quantity },
      },
      data: {
        stock: { decrement: order.quantity },
        soldCount: { increment: order.quantity },
      },
    });
    if (updateResult.count === 0) {
      throw new Error('商品库存不足或已不可购买');
    }

    const item = await prisma.marketListingItem.findUnique({
      where: { id: order.listingItemId },
      select: { id: true, listingId: true, stock: true },
    });
    if (!item) return;

    if (item.stock <= 0) {
      await prisma.marketListingItem.update({
        where: { id: item.id },
        data: { status: 'trading' },
      });
    }

    const activeCount = await prisma.marketListingItem.count({
      where: {
        listingId: item.listingId,
        status: 'on_sale',
        stock: { gt: 0 },
      },
    });

    if (activeCount === 0) {
      await prisma.marketListing.update({
        where: { id: item.listingId },
        data: { status: 'trading' },
      });
    }
  }

  // 拍卖订单:把 Auction.result 标记为 paid
  if (order.source === 'auction' && order.auctionId) {
    await prisma.auction.update({
      where: { id: order.auctionId },
      data: { result: 'paid' },
    });
  }

  // 触发购买事件:加 EXP/钻石(返利)
  await emitEvent({
    kind: 'purchase_paid',
    userId: order.buyerId,
    orderId: order.id,
    amountCent: order.totalPrice,
    pointsBack: order.pointsBackTotal,
  });

  // 通知卖家
  if (order.sellerId) {
    await prisma.notification.create({
      data: {
        recipientId: order.sellerId,
        type: 'system',
        text: `🛒 你的${order.source === 'auction' ? '拍卖品' : '商品'}已被购买并支付完成,请尽快发货`,
        link: '/orders?role=seller',
      },
    });
  }
  // 通知买家
  await prisma.notification.create({
    data: {
      recipientId: order.buyerId,
      type: 'system',
      text: `✅ 订单已支付成功,等待卖家发货`,
      link: '/orders',
    },
  });
}
