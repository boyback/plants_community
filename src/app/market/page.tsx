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
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">交易市场</h1>
          <p className="text-sm text-leaf-700/70">
            一口价闲置 + 拍卖竞价 · 支持支付宝 / 微信 / 官方中介担保
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

      {/* 顶部 tab:一口价(default) / 拍卖 */}
      <div className="mb-6 flex gap-1 border-b border-leaf-100">
        <span className="border-b-2 border-leaf-500 px-4 py-2 text-sm font-medium text-leaf-700">
          🛒 一口价
        </span>
        <Link
          href="/auction"
          className="px-4 py-2 text-sm text-ink-700/60 hover:text-leaf-700"
        >
          🔨 拍卖会
        </Link>
      </div>

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
