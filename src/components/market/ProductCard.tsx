import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import { formatPrice, cn } from '@/lib/utils';
import { I18nText } from '@/components/ui/I18nText';

export function ProductCard({ product }: { product: Product }) {
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <Link
      href={`/market/${product.id}`}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-leaf-50">
        <Image
          src={product.cover}
          alt={product.title}
          fill
          sizes="(max-width:768px) 50vw, 280px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              product.source === 'official'
                ? 'bg-leaf-500 text-white'
                : 'bg-amber-100 text-amber-800'
            )}
          >
            <I18nText
              k={product.source === 'official' ? 'market.hero.officialLabel' : 'market.hero.c2cLabel'}
              fallback={product.source === 'official' ? '官方' : '肉友'}
            />
          </span>
          {discount > 0 && (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-medium text-white">
              -{discount}%
            </span>
          )}
        </div>
        {product.status === 'sold_out' && (
          <div className="absolute inset-0 grid place-items-center bg-ink-900/40">
            <span className="rounded-full bg-white px-3 py-1 text-xs text-ink-800">
              <I18nText k="market.card.soldOut" fallback="已售罄" />
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-ink-800">{product.title}</h3>
        <div className="mt-auto flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-rose-600">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="text-[11px] text-leaf-700/50 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-leaf-700/70">
          <span>
            <I18nText
              k="market.hero.ordersCount"
              vars={{ n: product.ordersCount ?? 0 }}
              fallback={`📦 ${product.ordersCount ?? 0} 笔订单`}
            />
          </span>
          {product.pointsBack > 0 && (
            <span className="rounded bg-leaf-50 px-1.5 py-px text-leaf-700">
              <I18nText
                k="market.hero.pointsBack"
                vars={{ n: product.pointsBack }}
                fallback={`返 ${product.pointsBack} 积分`}
              />
            </span>
          )}
        </div>
        {product.source === 'c2c' && product.seller && (
          <div className="flex items-center gap-1 text-[10px] text-leaf-700/70">
            <span>
              <I18nText
                k="market.hero.sellerName"
                vars={{ name: product.seller.name }}
                fallback={`卖家:${product.seller.name}`}
              />
            </span>
            {product.shipFrom && <span>· {product.shipFrom}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
