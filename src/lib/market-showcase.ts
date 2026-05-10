/**
 * MarketShowcase 数据抓取(server-only)
 */
import { prisma } from './db';

export async function loadMarketShowcase() {
  const [products, auctions] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'on_sale' },
      orderBy: [{ createdAt: 'desc' }],
      take: 4,
      select: {
        id: true,
        title: true,
        cover: true,
        price: true,
        originalPrice: true,
      },
    }),
    prisma.auction.findMany({
      where: { status: 'live' },
      orderBy: { endAt: 'asc' },
      take: 2,
      select: {
        id: true,
        title: true,
        cover: true,
        startPrice: true,
        endAt: true,
      },
    }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      cover: p.cover,
      price: p.price,
      originalPrice: p.originalPrice,
    })),
    auctions: auctions.map((a) => ({
      id: a.id,
      title: a.title,
      cover: a.cover,
      startPrice: a.startPrice,
      endAt: a.endAt.toISOString(),
    })),
  };
}
