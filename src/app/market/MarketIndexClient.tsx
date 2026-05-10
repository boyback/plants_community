'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/market/ProductCard';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { cn } from '@/lib/utils';
import { api } from '@/lib/client-api';
import { useI18n } from '@/i18n/I18nContext';
import type { Product } from '@/lib/types';

const SOURCE_TABS = [
  { key: 'all', labelKey: 'market.tabAll' },
  { key: 'official', labelKey: 'market.tabOfficial' },
  { key: 'c2c', labelKey: 'market.tabC2c' },
] as const;

type SourceKey = (typeof SOURCE_TABS)[number]['key'];

const SORT_OPTIONS: { key: string; label: string }[] = [
  { key: 'latest', label: '最新发布' },
  { key: 'oldest', label: '最早发布' },
  { key: 'price_asc', label: '价格 ↑' },
  { key: 'price_desc', label: '价格 ↓' },
  { key: 'hot', label: '热销' },
];

interface FamilyOption {
  slug: string;
  name: string;
}

interface SpeciesOption {
  slug: string;
  name: string;
  familySlug: string;
}

export function MarketIndexClient({
  initial,
  products: initialProducts,
  categories,
}: {
  initial: { source: string; category: string; q: string };
  products: Product[];
  categories: { name: string; count: number }[];
  /** 兼容老接口(已不在 UI 显示),保持类型签名 */
  featured?: Product[];
}) {
  const { t } = useI18n();

  const [source, setSource] = useState<SourceKey>(
    (SOURCE_TABS.find((s) => s.key === initial.source)?.key ?? 'all') as SourceKey,
  );
  const [category, setCategory] = useState<string>(initial.category);
  const [q, setQ] = useState<string>(initial.q);
  const [debouncedQ, setDebouncedQ] = useState<string>(initial.q);
  const [familySlug, setFamilySlug] = useState<string>('');
  const [speciesSlug, setSpeciesSlug] = useState<string>('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [sort, setSort] = useState<string>('latest');

  const [families, setFamilies] = useState<FamilyOption[]>([]);
  const [allSpecies, setAllSpecies] = useState<SpeciesOption[]>([]);

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);

  // 关键词输入 debounce
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);

  // 拉所有科 + 品种(给筛选下拉用)
  useEffect(() => {
    api
      .get<{ slug: string; name: string }[]>('/api/categories?kind=family')
      .then((list) => setFamilies(list || []))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!familySlug) {
      setAllSpecies([]);
      setSpeciesSlug('');
      return;
    }
    // /api/categories?withGenera 返回的不是品种;品种数据从 species API 拉
    // 这里复用 plants 接口(若没有则 fallback 用 search)
    api
      .get<SpeciesOption[]>(`/api/species?family=${encodeURIComponent(familySlug)}&limit=200`)
      .then((list) => setAllSpecies(list || []))
      .catch(() => setAllSpecies([]));
  }, [familySlug]);

  // 任何条件变化都重新拉
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (source !== 'all') params.set('source', source);
    if (category) params.set('category', category);
    if (debouncedQ) params.set('q', debouncedQ);
    if (familySlug) params.set('family', familySlug);
    if (speciesSlug) params.set('species', speciesSlug);
    if (priceMin) params.set('priceMin', String(Math.floor(Number(priceMin) * 100)));
    if (priceMax) params.set('priceMax', String(Math.floor(Number(priceMax) * 100)));
    if (sort) params.set('sort', sort);

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
  }, [source, category, debouncedQ, familySlug, speciesSlug, priceMin, priceMax, sort]);

  const reset = () => {
    setSource('all');
    setCategory('');
    setQ('');
    setFamilySlug('');
    setSpeciesSlug('');
    setPriceMin('');
    setPriceMax('');
    setSort('latest');
  };

  const hasFilter =
    source !== 'all' ||
    category ||
    q ||
    familySlug ||
    speciesSlug ||
    priceMin ||
    priceMax ||
    sort !== 'latest';

  return (
    <>
      {/* ========== 顶部过滤栏 ========== */}
      <div className="card mb-5 space-y-3 p-4">
        {/* 行 1:关键词 + 排序 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon
              name="search"
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-leaf-500"
            />
            <input
              className="input pl-8 !text-sm"
              placeholder="搜索 标题 / 描述 / 标签 / 发货地…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="input !w-auto !text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {hasFilter && (
            <button
              onClick={reset}
              className="text-xs text-leaf-700 hover:underline"
              type="button"
            >
              清空筛选
            </button>
          )}
        </div>

        {/* 行 2:科 + 品种 */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-leaf-700/70">植物:</span>
          <select
            className="input !w-auto !text-xs"
            value={familySlug}
            onChange={(e) => {
              setFamilySlug(e.target.value);
              setSpeciesSlug('');
            }}
          >
            <option value="">所有科</option>
            {families.map((f) => (
              <option key={f.slug} value={f.slug}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            className="input !w-auto !text-xs disabled:opacity-50"
            value={speciesSlug}
            onChange={(e) => setSpeciesSlug(e.target.value)}
            disabled={!familySlug || allSpecies.length === 0}
          >
            <option value="">所有品种</option>
            {allSpecies.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>

          {/* 价格区间 */}
          <span className="ml-2 text-leaf-700/70">价格:</span>
          <input
            type="number"
            min={0}
            placeholder="最低"
            className="input !w-20 !text-xs"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
          <span className="text-leaf-700/40">—</span>
          <input
            type="number"
            min={0}
            placeholder="最高"
            className="input !w-20 !text-xs"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />
          <span className="text-leaf-700/50">元</span>
        </div>

        {/* 行 3:商品类目 chips + 来源 tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-leaf-700/70">商品类目:</span>
          <Chip active={!category} onClick={() => setCategory('')}>
            全部
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

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-leaf-700/70">来源:</span>
          {SOURCE_TABS.map((tab) => (
            <Chip
              key={tab.key}
              active={source === tab.key}
              onClick={() => setSource(tab.key)}
            >
              {t(tab.labelKey)}
            </Chip>
          ))}
        </div>
      </div>

      {/* ========== 商品列表 ========== */}
      {loading ? (
        <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>
      ) : products.length === 0 ? (
        <Empty icon="🛒" title={hasFilter ? '没有匹配的商品,试试放宽筛选' : t('market.empty')} />
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
          : 'border-leaf-200 bg-white text-ink-700 hover:bg-leaf-50',
      )}
    >
      {children}
    </button>
  );
}
