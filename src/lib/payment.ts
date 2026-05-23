/**
 * 支付业务层。
 *
 * 当前实现:接入 src/lib/payment/gateway.ts 的 PaymentGateway 抽象,
 * 按 PAYMENT_GATEWAY 环境变量自动选择 mock / alipay。
 *
 * 切换真实支付通道步骤:
 *   1. 安装 SDK:  npm install alipay-sdk
 *   2. 环境变量:  PAYMENT_GATEWAY=alipay 、ALIPAY_APP_ID / _PRIVATE_KEY_PEM /
 *                 _PUBLIC_KEY_PEM / _GATEWAY / _NOTIFY_URL / _RETURN_URL
 *   3. 前端 checkout 无需改动(qrcode 字段从 mock:// 变成真实 URL)
 *   4. webhook 入口: POST /api/payments/alipay/webhook (由 gateway 的 verifyWebhook 校验)
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

const PAY_EXPIRE_MINUTES = 15;

function randomNo(prefix: string) {
  return (
    prefix +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 7).toUpperCase()
  );
}

/** 所有 createXxxPayment 共用的逻辑:调 gateway 拿 qrcode + 写 Payment 行 */
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

  let qrcode = '';
  try {
    const res = await gateway.createPayment({
      payNo,
      userId: params.userId,
      amount: params.amount,
      channel: params.channel as 'alipay' | 'wechat' | 'points',
      subject: params.subject,
      expireMinutes: PAY_EXPIRE_MINUTES,
      meta: params.meta,
    });
    qrcode = res.qrcode;
  } catch (err) {
    // gateway 失败 — 记录错误但保留 mock qrcode,让 Demo 不至于完全卡住
    console.warn('[payment] gateway.createPayment failed, fallback to mock qrcode:', err);
    qrcode = `mock://${params.channel}/pay/${payNo}/${params.amount}`;
  }

  return prisma.payment.create({
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
  if (order.status !== 'pending_payment') throw new Error('订单状态不允许支付');

  return createWithGateway({
    bizType: PaymentBizType.order,
    bizId: order.id,
    userId: order.buyerId,
    amount: order.totalPrice,
    channel: params.channel,
    subject: `订单 ${order.orderNo}`,
    meta: { bizType: 'order', orderId: order.id },
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

  return createWithGateway({
    bizType: PaymentBizType.deposit,
    bizId: part.id,
    userId: part.userId,
    amount: part.depositAmount,
    channel: params.channel,
    subject: `拍卖保证金 ${part.id}`,
    meta: { bizType: 'deposit', participantId: part.id },
    payNoPrefix: 'DEP',
  });
}

/** 创建拍卖订单尾款的支付单 */
export async function createAuctionBalancePayment(params: {
  orderId: string;
  channel: PaymentChannel;
}) {
  const order = await prisma.order.findUnique({ where: { id: params.orderId } });
  if (!order) throw new Error('订单不存在');
  if (order.source !== 'auction') throw new Error('该订单不是拍卖订单');
  if (order.status !== 'pending_payment') throw new Error('订单状态不允许支付');

  const balance = order.totalPrice - order.depositPaid;
  if (balance <= 0) throw new Error('订单余额已结清');

  return createWithGateway({
    bizType: PaymentBizType.auction_balance,
    bizId: order.id,
    userId: order.buyerId,
    amount: balance,
    channel: params.channel,
    subject: `拍卖尾款 ${order.orderNo}`,
    meta: { bizType: 'auction_balance', orderId: order.id },
    payNoPrefix: 'AB',
  });
}

/** 创建大会员订阅的支付单 */
export async function createVipPayment(params: {
  vipOrderId: string;
  channel: PaymentChannel;
}) {
  const order = await prisma.vipOrder.findUnique({ where: { id: params.vipOrderId } });
  if (!order) throw new Error('订单不存在');
  if (order.status !== 'pending_payment') throw new Error('订单状态不允许支付');

  return createWithGateway({
    bizType: PaymentBizType.vip,
    bizId: order.id,
    userId: order.userId,
    amount: order.amount,
    channel: params.channel,
    subject: `大会员 ${order.plan}`,
    meta: { bizType: 'vip', vipOrderId: order.id },
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
 * Demo 专用:模拟支付成功(实际是 webhook 触发)
 * 返回业务后续状态。
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
  } else if (payment.bizType === PaymentBizType.vip) {
    await onVipOrderPaid(payment.bizId);
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
    const item = await prisma.marketListingItem.update({
      where: { id: order.listingItemId },
      data: {
        stock: { decrement: order.quantity },
        soldCount: { increment: order.quantity },
      },
    });

    if (item.stock <= 0) {
      await prisma.marketListingItem.update({
        where: { id: item.id },
        data: { status: 'sold_out' },
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
        data: { status: 'sold_out' },
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

  // 触发购买事件:加 EXP/积分(返利)
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

async function onVipOrderPaid(vipOrderId: string) {
  const vo = await prisma.vipOrder.findUnique({ where: { id: vipOrderId } });
  if (!vo) return;

  await prisma.vipOrder.update({
    where: { id: vipOrderId },
    data: { status: OrderStatus.completed, paidAt: new Date() },
  });

  await applyVipMembership(vo.userId, vo.plan, vo.durationDays);
}

/**
 * 应用会员权益(延长到期时间或终身)。
 * 也供积分兑换月卡复用。
 */
export async function applyVipMembership(
  userId: string,
  plan: 'monthly' | 'quarterly' | 'yearly' | 'lifetime' | 'monthly_points',
  durationDays: number
) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return;

  if (plan === 'lifetime') {
    await prisma.user.update({
      where: { id: userId },
      data: {
        vipLifetime: true,
        vipFirstAt: u.vipFirstAt ?? new Date(),
      },
    });
  } else {
    const baseTs = Math.max(Date.now(), u.vipExpireAt?.getTime() ?? 0);
    const newExpire = new Date(baseTs + durationDays * 86400_000);
    await prisma.user.update({
      where: { id: userId },
      data: {
        vipExpireAt: newExpire,
        vipFirstAt: u.vipFirstAt ?? new Date(),
      },
    });
  }

  await prisma.notification.create({
    data: {
      recipientId: userId,
      type: 'system',
      text: '🎉 大会员开通成功!发帖、出售已无限制,享受 VIP 全部专属权益',
      link: '/vip',
    },
  });

  await emitEvent({ kind: 'vip_open', userId, days: durationDays });
}
