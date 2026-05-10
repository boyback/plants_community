/**
 * GET /api/home/sidebar-market?only=auctions|products|all&shuffle=1
 *
 * 给左侧 Sidebar 「商品推荐 + 拍卖会」用。
 * - only=all (默认):返回 { products[], auctions[] }
 * - only=auctions :仅 { auctions[] }
 * - only=products :仅 { products[] }
 * - shuffle=1     :在前 30 条里随机抽 4(否则按默认排序取前 4)
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const only = url.searchParams.get('only') || 'all';
  const shuffle = url.searchParams.get('shuffle') === '1';

  const wantP = only === 'all' || only === 'products';
  const wantA = only === 'all' || only === 'auctions';

  const [productsAll, auctionsAll] = await Promise.all([
    wantP
      ? prisma.product.findMany({
          where: { status: 'on_sale' },
          orderBy: [{ createdAt: 'desc' }],
          take: shuffle ? 30 : 4,
          select: { id: true, title: true, cover: true, price: true },
        })
      : Promise.resolve([]),
    wantA
      ? prisma.auction.findMany({
          where: { status: 'live' },
          orderBy: { endAt: 'asc' },
          take: shuffle ? 30 : 4,
          select: { id: true, title: true, cover: true, startPrice: true },
        })
      : Promise.resolve([]),
  ]);

  const products = shuffle
    ? [...productsAll].sort(() => Math.random() - 0.5).slice(0, 4)
    : productsAll;
  const auctions = shuffle
    ? [...auctionsAll].sort(() => Math.random() - 0.5).slice(0, 4)
    : auctionsAll;

  const data: { products?: typeof products; auctions?: typeof auctions } = {};
  if (wantP) data.products = products;
  if (wantA) data.auctions = auctions;

  return NextResponse.json({ ok: true, data });
}
