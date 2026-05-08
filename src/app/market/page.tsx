import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { I18nText } from '@/components/ui/I18nText';
import { prisma } from '@/lib/db';
import { serializeProduct } from '@/lib/serializers';
import { productInclude } from '@/lib/market-include';
import type { ProductStatus } from '@prisma/client';
import { MarketIndexClient } from './MarketIndexClient';

export const dynamic = 'force-dynamic';

export default async function MarketPage({
  searchParams,
}: {
  searchParams?: { source?: string; category?: string; q?: string };
}) {
  const where = {
    status: { in: ['on_sale', 'sold_out'] as ProductStatus[] },
    ...(searchParams?.source ? { source: searchParams.source as 'official' | 'c2c' } : {}),
    ...(searchParams?.category ? { category: searchParams.category } : {}),
    ...(searchParams?.q ? { title: { contains: searchParams.q } } : {}),
  };

  const [productsRaw, categoryGroups] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 24,
      include: productInclude(),
    }),
    prisma.product.groupBy({
      by: ['category'],
      where: { status: 'on_sale' },
      _count: true,
    }),
  ]);

  const products = productsRaw.map(serializeProduct);
  const categories = categoryGroups
    .map((g) => ({ name: g.category, count: g._count }))
    .sort((a, b) => b.count - a.count);

  // 顶部精选(热销 + 折扣)
  const allRaw = await prisma.product.findMany({
    where: { status: 'on_sale' },
    take: 6,
    orderBy: { orders: { _count: 'desc' } },
    include: productInclude(),
  });
  const featured = allRaw.map(serializeProduct);

  return (
    <Shell>
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold"><I18nText k="market.hero.title" fallback="交易市场" /></h1>
          <p className="text-sm text-leaf-700/70">
            <I18nText k="market.hero.subtitle" fallback="官方甄选 + 肉友闲置,买卖肉肉、工具、盆器一站式" />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/addresses" className="btn-outline !text-sm">
            📦 <I18nText k="nav.shippingAddress" fallback="收货地址" />
          </Link>
          <Link href="/orders" className="btn-outline !text-sm">
            <I18nText k="nav.myOrders" fallback="我的订单" />
          </Link>
          <Link href="/market/sell" className="btn-primary !text-sm">
            <I18nText k="market.hero.iWantSell" fallback="✨ 我要出售" />
          </Link>
        </div>
      </div>

      {/* 拍卖入口 banner */}
      <Link
        href="/auction"
        className="card mb-6 group flex items-center gap-4 overflow-hidden bg-gradient-to-r from-rose-500 via-rose-400 to-amber-300 p-5 text-white transition-shadow hover:shadow-lg"
      >
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-3xl backdrop-blur">
          🔨
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold">
            <I18nText k="market.hero.auctionBannerTitle" fallback="拍卖会进行中" />
          </div>
          <div className="text-xs opacity-90">
            <I18nText k="market.hero.auctionBannerSub" fallback="珍稀老桩、限定品种、精品盆器,价高者得 · 保证金参拍" />
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur transition-colors group-hover:bg-white/30">
          <I18nText k="market.hero.goCheck" fallback="去看看 →" />
        </span>
      </Link>

      <MarketIndexClient
        initial={{
          source: searchParams?.source ?? 'all',
          category: searchParams?.category ?? '',
          q: searchParams?.q ?? '',
        }}
        products={products}
        categories={categories}
        featured={featured}
      />
    </Shell>
  );
}
