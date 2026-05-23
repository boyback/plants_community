import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeOrder } from '@/lib/serializers';
import { productInclude } from '@/lib/market-include';

export const dynamic = 'force-dynamic';

const include = {
  product: { include: productInclude() },
  listing: { select: { id: true, title: true, cover: true, tradeMode: true } },
  listingItem: { select: { id: true, listingId: true, title: true, cover: true, price: true } },
  auction: { select: { id: true, title: true, cover: true } },
  buyer:  { include: { _count: { select: { posts: true, followers: true, following: true } }, badges: { include: { badge: true } } } },
  seller: { include: { _count: { select: { posts: true, followers: true, following: true } }, badges: { include: { badge: true } } } },
};

export const GET = handler(async (req) => {
  const me = await requireUser();
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const order = await prisma.order.findUnique({ where: { id }, include });
  if (!order) return fail(404, '订单不存在');
  if (order.buyerId !== me.id && order.sellerId !== me.id) {
    return fail(403, '无权查看该订单');
  }
  return serializeOrder(order);
});
