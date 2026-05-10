/**
 * GET /api/home/sidebar-market
 *
 * 给左侧 Sidebar 「商品推荐 + 拍卖会」紧凑列表用。
 * 各 4 条。
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
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
      },
    }),
    prisma.auction.findMany({
      where: { status: 'live' },
      orderBy: { endAt: 'asc' },
      take: 4,
      select: {
        id: true,
        title: true,
        cover: true,
        startPrice: true,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        cover: p.cover,
        price: p.price,
      })),
      auctions: auctions.map((a) => ({
        id: a.id,
        title: a.title,
        cover: a.cover,
        startPrice: a.startPrice,
      })),
    },
  });
}
