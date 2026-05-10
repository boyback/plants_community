/**
 * GET /api/market/listings
 *
 * 混合返回 一口价商品 + 拍卖,统一的过滤器:
 *   - q: 关键词(全文 contains)
 *   - family: 科 slug(科板块层级)
 *   - genus:  属 slug
 *   - species: 品种 slug
 *   - other: 其他类目(tools / pot / soil / fertilizer / kit)
 *   - priceMin / priceMax: 单位 分
 *   - type: all | product | auction (交易类型)
 *   - sort: latest | oldest | price_asc | price_desc
 *
 * 返回:
 *   { items: ListingItem[] } — type='product' 或 'auction'
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { ProductStatus, AuctionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface ListingItem {
  type: 'product' | 'auction';
  id: string;
  title: string;
  cover: string;
  price: number; // 商品 = price; 拍卖 = startPrice
  originalPrice?: number | null;
  createdAt: string;
  endAt?: string; // 拍卖才有
  url: string; // 详情页 URL
  shipFrom?: string | null; // 发货地
  seller?: {
    id: string;
    name: string;
    avatar: string;
  } | null;
}

const OTHER_KEYWORDS: Record<string, string[]> = {
  tools: ['工具', '剪刀', '镊子', '喷壶'],
  pot: ['盆', '盆器', '陶盆', '塑料盆'],
  soil: ['土', '颗粒', '泥炭', '配土'],
  fertilizer: ['肥料', '肥', '缓释'],
  kit: ['套装', '入门', '礼盒'],
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const family = url.searchParams.get('family')?.trim() || '';
  const genus = url.searchParams.get('genus')?.trim() || '';
  const species = url.searchParams.get('species')?.trim() || '';
  const other = url.searchParams.get('other')?.trim() || '';
  const priceMin = Number(url.searchParams.get('priceMin') || 0);
  const priceMax = Number(url.searchParams.get('priceMax') || 0);
  const type = url.searchParams.get('type') || 'all';
  const sort = url.searchParams.get('sort') || 'latest';
  const limit = Math.min(60, Math.max(10, Number(url.searchParams.get('limit') || 30)));

  // —— where 公共部分(产品 / 拍卖)——
  // q + family/genus/species + other 都用 LIKE 匹配 title/description/tags
  // (后续 product/auction 加 FK 后改正式连接)
  const orFilters: Record<string, unknown>[] = [];
  if (q) {
    orFilters.push({ title: { contains: q } });
    orFilters.push({ tags: { contains: q } });
  }

  const taxonNeedles: string[] = [];
  if (species) taxonNeedles.push(species);
  if (genus) taxonNeedles.push(genus);
  if (family) taxonNeedles.push(family);

  // 把 family/genus/species 的 slug 也展开成中文名(用 db 一次查) — 增加匹配率
  let taxonNames: string[] = [];
  if (family || genus || species) {
    const [fams, gens, sps] = await Promise.all([
      family ? prisma.category.findMany({ where: { slug: family }, select: { name: true } }) : [],
      genus ? prisma.genus.findMany({ where: { slug: genus }, select: { name: true } }) : [],
      species ? prisma.species.findMany({ where: { slug: species }, select: { name: true, latinName: true } }) : [],
    ]);
    taxonNames = [
      ...fams.map((x) => x.name),
      ...gens.map((x) => x.name),
      ...sps.flatMap((x) => [x.name, x.latinName].filter(Boolean) as string[]),
    ];
  }
  const taxonAll = [...taxonNeedles, ...taxonNames];

  const taxonFilter = taxonAll.length
    ? {
        OR: taxonAll.flatMap((s) => [
          { title: { contains: s } },
          { tags: { contains: s } },
        ]),
      }
    : null;

  const otherFilter = other && OTHER_KEYWORDS[other]
    ? {
        OR: OTHER_KEYWORDS[other].flatMap((s) => [
          { title: { contains: s } },
          { category: { contains: s } },
        ]),
      }
    : null;

  // ====== 商品 ======
  let products: ListingItem[] = [];
  if (type === 'all' || type === 'product') {
    const where: Record<string, unknown> = {
      status: { in: ['on_sale', 'sold_out'] as ProductStatus[] },
    };
    if (priceMin) where.price = { ...(where.price as object), gte: priceMin };
    if (priceMax) where.price = { ...(where.price as object), lte: priceMax };
    const ANDs: unknown[] = [];
    if (orFilters.length) ANDs.push({ OR: orFilters });
    if (taxonFilter) ANDs.push(taxonFilter);
    if (otherFilter) ANDs.push(otherFilter);
    if (ANDs.length) where.AND = ANDs;

    const list = await prisma.product.findMany({
      where,
      orderBy:
        sort === 'price_asc' ? [{ price: 'asc' }] :
        sort === 'price_desc' ? [{ price: 'desc' }] :
        sort === 'oldest' ? [{ createdAt: 'asc' }] :
        [{ createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        cover: true,
        price: true,
        originalPrice: true,
        createdAt: true,
        shipFrom: true,
        sellerId: true,
        seller: { select: { id: true, name: true, avatar: true } },
      },
    });
    products = list.map((p) => ({
      type: 'product',
      id: p.id,
      title: p.title,
      cover: p.cover,
      price: p.price,
      originalPrice: p.originalPrice,
      createdAt: p.createdAt.toISOString(),
      url: `/market/${p.id}`,
      shipFrom: p.shipFrom,
      seller: p.seller,
    }));
  }

  // ====== 拍卖 ======
  let auctions: ListingItem[] = [];
  if (type === 'all' || type === 'auction') {
    const where: Record<string, unknown> = {
      status: { in: ['live', 'scheduled'] as AuctionStatus[] },
    };
    // 拍卖按 currentPrice 过滤
    if (priceMin) where.currentPrice = { ...(where.currentPrice as object), gte: priceMin };
    if (priceMax) where.currentPrice = { ...(where.currentPrice as object), lte: priceMax };
    const ANDs: unknown[] = [];
    if (orFilters.length) ANDs.push({ OR: orFilters });
    if (taxonFilter) ANDs.push(taxonFilter);
    if (otherFilter) ANDs.push(otherFilter);
    if (ANDs.length) where.AND = ANDs;

    const list = await prisma.auction.findMany({
      where,
      orderBy:
        sort === 'price_asc' ? [{ currentPrice: 'asc' }] :
        sort === 'price_desc' ? [{ currentPrice: 'desc' }] :
        sort === 'oldest' ? [{ createdAt: 'asc' }] :
        [{ createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        title: true,
        cover: true,
        currentPrice: true,
        createdAt: true,
        endAt: true,
        seller: { select: { id: true, name: true, avatar: true } },
      },
    });
    auctions = list.map((a) => ({
      type: 'auction',
      id: a.id,
      title: a.title,
      cover: a.cover,
      price: a.currentPrice, // 当前价(初始 = startPrice)
      createdAt: a.createdAt.toISOString(),
      endAt: a.endAt.toISOString(),
      url: `/auction/${a.id}`,
      seller: a.seller,
    }));
  }

  // 合并 + 全局再排序
  const merged = [...products, ...auctions];
  merged.sort((x, y) => {
    if (sort === 'price_asc') return x.price - y.price;
    if (sort === 'price_desc') return y.price - x.price;
    if (sort === 'oldest') return new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime();
    return new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime();
  });

  return NextResponse.json({ ok: true, data: { items: merged.slice(0, limit) } });
}
