'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/market/ProductCard';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { cn, formatPrice } from '@/lib/utils';
import { api } from '@/lib/client-api';
import { useI18n } from '@/i18n/I18nContext';
import type { Product } from '@/lib/types';

const SOURCE_TABS = [
  { key: 'all',      labelKey: 'market.tabAll' },
  { key: 'official', labelKey: 'market.tabOfficial' },
  { key: 'c2c',      labelKey: 'market.tabC2c' },
] as const;

type SourceKey = (typeof SOURCE_TABS)[number]['key'];

export function MarketIndexClient({
  initial,
  products: initialProducts,
  categories,
  featured,
}: {
  initial: { source: string; category: string; q: string };
  products: Product[];
  categories: { name: string; count: number }[];
  featured: Product[];
}) {
  const { t } = useI18n();
  const [source, setSource] = useState<SourceKey>(
    (SOURCE_TABS.find((s) => s.key === initial.source)?.key ?? 'all') as SourceKey
  );
  const [category, setCategory] = useState<string>(initial.category);
  const [q, setQ] = useState<string>(initial.q);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);

  // 切换 tab/分类/搜索时拉数据
  useEffect(() => {
    if (
      source === (initial.source as SourceKey) &&
      category === initial.category &&
      q === initial.q
    ) {
      // 与 SSR 初值一致,跳过
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (source !== 'all') params.set('source', source);
    if (category) params.set('category', category);
    if (q) params.set('q', q);
    api
      .get<{ items: Product[] }>(`/api/market/products?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setProducts(res.items);
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, category, q]);

  return (
    <>
      {/* 精选轮播 / 热销 */}
      {featured.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {featured.slice(0, 3).map((f, i) => (
            <Link
              key={f.id}
              href={`/market/${f.id}`}
              className={cn(
                'card relative overflow-hidden p-0 transition-shadow hover:shadow-lg',
                i === 0 && 'lg:col-span-2'
              )}
            >
              <div className={cn('relative w-full', i === 0 ? 'aspect-[2/1]' : 'aspect-[2/1]')}>
                <Image src={f.cover} alt={f.title} fill className="object-cover" unoptimized />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px]">
                    🔥 热销
                  </span>
                  <h3 className="mt-1 line-clamp-1 text-base font-semibold">{f.title}</h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-bold">{formatPrice(f.price)}</span>
                    {f.originalPrice && (
                      <span className="text-xs opacity-70 line-through">
                        {formatPrice(f.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 来源 tabs + 搜索 */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 border-b border-leaf-100">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSource(tab.key)}
              className={cn(
                'relative px-4 py-2.5 text-sm transition-colors',
                source === tab.key
                  ? 'text-leaf-700 font-medium'
                  : 'text-ink-700/60 hover:text-leaf-700'
              )}
            >
              {t(tab.labelKey)}
              {source === tab.key && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-leaf-500" />
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Icon
            name="search"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-leaf-500"
          />
          <input
            className="input pl-8"
            placeholder={t('market.searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* 分类筛选 */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs text-leaf-700/70">{t('market.categoryAll').replace(/\s?[\(\(].+?[\)\)]$/, '')}:</span>
        <Chip active={!category} onClick={() => setCategory('')}>
          {t('market.categoryAll')} ({categories.reduce((s, c) => s + c.count, 0)})
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.name}
            active={category === c.name}
            onClick={() => setCategory(category === c.name ? '' : c.name)}
          >
            {c.name} ({c.count})
          </Chip>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>
      ) : products.length === 0 ? (
        <Empty icon="🛒" title={t('market.empty')} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition-colors',
        active
          ? 'border-leaf-500 bg-leaf-500 text-white'
          : 'border-leaf-200 bg-white text-ink-700 hover:bg-leaf-50'
      )}
    >
      {children}
    </button>
  );
}
