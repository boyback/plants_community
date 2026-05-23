import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeOrder } from '@/lib/serializers';
import { productInclude } from '@/lib/market-include';

export const dynamic = 'force-dynamic';

const userIncludeForOrder = {
  include: {
    _count: { select: { posts: true, followers: true, following: true } },
    badges: { include: { badge: true } },
  },
};

export const GET = handler(async (req) => {
  const me = await requireUser();
  const url = new URL(req.url);
  const role = url.searchParams.get('role') ?? 'buyer'; // buyer | seller
  const status = url.searchParams.get('status') ?? undefined;

  const where: Record<string, unknown> = role === 'seller'
    ? { sellerId: me.id }
    : { buyerId: me.id };
  if (status) where.status = status;

  const list = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      product: { include: productInclude() },
      listing: { select: { id: true, title: true, cover: true, tradeMode: true } },
      listingItem: { select: { id: true, listingId: true, title: true, cover: true, price: true } },
      auction: { select: { id: true, title: true, cover: true } },
      buyer: userIncludeForOrder,
      seller: userIncludeForOrder,
    },
  });
  return list.map(serializeOrder);
});
