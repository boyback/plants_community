import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { I18nText } from '@/components/ui/I18nText';
import { prisma } from '@/lib/db';
import { serializeProduct } from '@/lib/serializers';
import { productInclude } from '@/lib/market-include';
import { Icon } from '@/components/ui/Icon';
import { UserName } from '@/components/ui/UserName';
import { Avatar } from '@/components/ui/Avatar';
import { ProductDetailClient } from './ProductDetailClient';
import { formatPrice, timeAgo } from '@/lib/utils';
import { RichTextView } from '@/components/richtext/RichTextView';

export const dynamic = 'force-dynamic';

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const raw = await prisma.product.findUnique({
    where: { id: params.id },
    include: productInclude(),
  });
  if (!raw) notFound();

  const product = serializeProduct(raw);

  // 同卖家其他商品 / 同分类其他商品
  const others = await prisma.product.findMany({
    where: {
      id: { not: product.id },
      status: 'on_sale',
      OR: product.seller
        ? [{ sellerId: product.seller.id }, { category: product.category }]
        : [{ category: product.category }],
    },
    take: 6,
    include: productInclude(),
  });

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-1.5 text-xs text-leaf-700/70">
        <Link href="/" className="hover:text-leaf-700">
          <I18nText k="nav.home" fallback="首页" />
        </Link>
        <Icon name="arrow-right" size={12} />
        <Link href="/market" className="hover:text-leaf-700">
          <I18nText k="market.detail.crumbMarket" fallback="交易市场" />
        </Link>
        <Icon name="arrow-right" size={12} />
        <Link
          href={`/market?category=${encodeURIComponent(product.category)}`}
          className="hover:text-leaf-700"
        >
          {product.category}
        </Link>
        <Icon name="arrow-right" size={12} />
        <span className="truncate text-ink-700">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* 主体 */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="relative aspect-[16/10] bg-leaf-50">
              <Image src={product.cover} alt={product.title} fill className="object-cover" unoptimized />
              <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                <span
                  className={
                    product.source === 'official'
                      ? 'rounded-full bg-leaf-500 px-2 py-0.5 text-xs text-white'
                      : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800'
                  }
                >
                  <I18nText
                    k={`market.detail.source.${product.source}`}
                    fallback={product.source === 'official' ? '官方甄选' : '肉友闲置'}
                  />
                </span>
                {product.tags.map((tag) => (
                  <span key={tag} className="chip text-[10px]">#{tag}</span>
                ))}
              </div>
            </div>
            <div className="p-5">
              <h1 className="text-xl font-bold text-ink-800 md:text-2xl">{product.title}</h1>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="text-3xl font-bold text-rose-600">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && (
                  <span className="text-sm text-leaf-700/50 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
                {product.pointsBack > 0 && (
                  <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-xs text-leaf-700">
                    <I18nText
                      k="market.detail.pointsBackShort"
                      vars={{ n: product.pointsBack }}
                      fallback={`🎁 返 ${product.pointsBack} 积分`}
                    />
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 rounded-xl bg-leaf-50/50 p-3 text-xs">
                <Stat labelKey="market.detail.stat.stock" labelFallback="库存" value={product.stock} />
                <Stat labelKey="market.detail.stat.orders" labelFallback="销量" value={product.ordersCount ?? 0} />
                <Stat labelKey="market.detail.stat.shipFrom" labelFallback="发货地" value={product.shipFrom ?? ''} />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-lg font-semibold text-ink-800">
              <I18nText k="market.detail.productIntro" fallback="商品详情" />
            </h2>
            <RichTextView
              json={product.descriptionJson}
              html={product.description}
              size="sm"
            />
          </div>
        </div>

        {/* 右栏 */}
        <div className="space-y-4">
          <ProductDetailClient product={product} />

          {product.seller && (
            <div className="card p-4">
              <div className="mb-3 text-sm font-semibold">
                <I18nText k="market.detail.sellerInfo" fallback="卖家信息" />
              </div>
              <div className="flex items-center gap-3">
                <Avatar src={product.seller.avatar} alt={product.seller.name} size={40} />
                <div className="min-w-0 flex-1">
                  <UserName user={product.seller} size="sm" />
                  <div className="mt-0.5 line-clamp-1 text-[11px] text-leaf-700/70">
                    {product.seller.bio}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/user/${product.seller.id}`}
                  className="btn-outline flex-1 justify-center !text-xs"
                >
                  <I18nText k="nav.myProfile" fallback="主页" />
                </Link>
                <Link
                  href={`/messages?to=${product.seller.id}`}
                  className="btn-primary flex-1 justify-center !text-xs"
                >
                  <I18nText k="nav.messages" fallback="私信" />
                </Link>
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div className="card p-4">
              <div className="mb-3 text-sm font-semibold">
                <I18nText k="market.detail.relatedProducts" fallback="相关商品" />
              </div>
              <div className="space-y-3">
                {others.slice(0, 4).map((p) => {
                  const sp = serializeProduct(p);
                  return (
                    <Link
                      key={sp.id}
                      href={`/market/${sp.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-leaf-50"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-leaf-50">
                        <Image src={sp.cover} alt="" fill className="object-cover" unoptimized />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-xs font-medium">{sp.title}</div>
                        <div className="mt-0.5 text-xs font-bold text-rose-600">
                          {formatPrice(sp.price)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <div className="card p-4 text-[11px] text-leaf-700/70">
            <div className="mb-1 font-medium text-leaf-700">
              <I18nText k="market.detail.noticeTitle" fallback="📜 交易须知" />
            </div>
            <ul className="ml-4 list-disc space-y-0.5">
              <li><I18nText k="market.detail.noticeItems.item1" fallback="支持微信 / 支付宝 / 积分支付" /></li>
              <li><I18nText k="market.detail.noticeItems.item2" fallback="15 分钟未支付订单自动取消" /></li>
              <li><I18nText k="market.detail.noticeItems.item3" fallback="订单完成后可在订单中心评价" /></li>
              <li><I18nText k="market.detail.noticeItems.item4" fallback="C2C 商品请文明交易,避免被骗" /></li>
            </ul>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Stat({
  labelKey,
  labelFallback,
  value,
}: {
  labelKey: string;
  labelFallback: string;
  value: string | number;
}) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-leaf-700/70">
        <I18nText k={labelKey} fallback={labelFallback} />
      </div>
      <div className="mt-0.5 text-sm font-semibold text-ink-800">{value}</div>
    </div>
  );
}
