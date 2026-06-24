import { OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from './db';

export const ORDER_PAYMENT_EXPIRE_MINUTES = 15;
export const ORDER_PAYMENT_EXPIRE_MS = ORDER_PAYMENT_EXPIRE_MINUTES * 60_000;

export function isOrderPaymentExpired(order: { status: OrderStatus; createdAt: Date }) {
  return order.status === OrderStatus.pending_payment &&
    order.createdAt.getTime() + ORDER_PAYMENT_EXPIRE_MS <= Date.now();
}

export async function expirePendingOrders(where: { buyerId?: string; sellerId?: string } = {}) {
  const cutoff = new Date(Date.now() - ORDER_PAYMENT_EXPIRE_MS);
  const orders = await prisma.order.findMany({
    where: {
      ...where,
      status: OrderStatus.pending_payment,
      createdAt: { lte: cutoff },
    },
    select: { id: true },
    take: 100,
  });
  if (!orders.length) return 0;

  const ids = orders.map((order) => order.id);
  await prisma.$transaction([
    prisma.order.updateMany({
      where: { id: { in: ids }, status: OrderStatus.pending_payment },
      data: { status: OrderStatus.cancelled, cancelledAt: new Date() },
    }),
    prisma.payment.updateMany({
      where: {
        bizType: { in: ['order', 'auction_balance'] },
        bizId: { in: ids },
        status: PaymentStatus.pending,
      },
      data: { status: PaymentStatus.expired },
    }),
  ]);
  return ids.length;
}

export async function expirePendingOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, createdAt: true },
  });
  if (!order || !isOrderPaymentExpired(order)) return false;

  await prisma.$transaction([
    prisma.order.updateMany({
      where: { id: order.id, status: OrderStatus.pending_payment },
      data: { status: OrderStatus.cancelled, cancelledAt: new Date() },
    }),
    prisma.payment.updateMany({
      where: {
        bizType: { in: ['order', 'auction_balance'] },
        bizId: order.id,
        status: PaymentStatus.pending,
      },
      data: { status: PaymentStatus.expired },
    }),
  ]);
  return true;
}
