'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { cn, formatPrice } from '@/lib/utils';
import { api } from '@/lib/client-api';

interface CategoryFamily {
  id: string;
  slug: string;
  name: string;
  icon: string;
}

interface GenusOption {
  slug: string;
  name: string;
  latinName: string | null;
  familySlug: string;
}

interface ListingItem {
  type: 'product' | 'auction';
  id: string;
  title: string;
  cover: string;
  price: number;
  originalPrice?: number | null;
  createdAt: string;
  endAt?: string;
  url: string;
}

const OTHER_OPTIONS = [
  { key: 'tools', label: '工具' },
  { key: 'pot', label: '盆器' },
  { key: 'soil', label: '盆土' },
  { key: 'fertilizer', label: '肥料' },
  { key: 'kit', label: '套装' },
];

const SORT_OPTIONS = [
  { key: 'latest', label: '最新发布' },
  { key: 'oldest', label: '最早发布' },
  { key: 'price_asc', label: '价格 ↑' },
  { key: 'price_desc', label: '价格 ↓' },
];

const TYPE_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'product', label: '🛒 一口价' },
  { key: 'auction', label: '🔨 拍卖' },
];

export function MarketIndexClient() {
  const [families, setFamilies] = useState<CategoryFamily[]>([]);
  const [generaByFamily, setGeneraByFamily] = useState<Record<string, GenusOption[]>>({});

  // 顶层筛选:科 slug 或 'other' 或 ''(全部)
  const [topPick, setTopPick] = useState<string>('');
  // 选中科后展开的属
  const [selectedGenus, setSelectedGenus] = useState<string>('');
  // 选中「其他」后展开的子类
  const [selectedOther, setSelectedOther] = useState<string>('');

  const [type, setType] = useState<string>('all');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [sort, setSort] = useState<string>('latest');
  const [q, setQ] = useState<string>('');
  const [debouncedQ, setDebouncedQ] = useState<string>('');

  const [items, setItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(false);

  // q debounce
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);

  // 拉所有科
  useEffect(() => {
    api
      .get<CategoryFamily[]>('/api/categories?kind=family')
      .then((list) => setFamilies(list || []))
      .catch(() => null);
  }, []);

  // 选了某科后,如果还没属数据就拉
  useEffect(() => {
    if (!topPick || topPick === 'other') return;
    if (generaByFamily[topPick]) return;
    api
      .get<{ slug: string; name: string; latinName: string | null }[]>(
        `/api/categories?kind=family&withGenera=1`,
      )
      .then((list) => {
        const map: Record<string, GenusOption[]> = {};
        for (const c of (list as unknown as Array<{
          slug: string;
          genera: { slug: string; name: string; latinName: string | null }[];
        }>)) {
          map[c.slug] = (c.genera || []).map((g) => ({
            ...g,
            familySlug: c.slug,
          }));
        }
        setGeneraByFamily(map);
      })
      .catch(() => null);
  }, [topPick, generaByFamily]);

  const currentGenera = useMemo(
    () => (topPick && topPick !== 'other' ? generaByFamily[topPick] || [] : []),
    [topPick, generaByFamily],
  );

  // 拉列表
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (topPick && topPick !== 'other') params.set('family', topPick);
    if (selectedGenus) params.set('genus', selectedGenus);
    if (topPick === 'other' && selectedOther) params.set('other', selectedOther);
    if (debouncedQ) params.set('q', debouncedQ);
    if (priceMin) params.set('priceMin', String(Math.floor(Number(priceMin) * 100)));
    if (priceMax) params.set('priceMax', String(Math.floor(Number(priceMax) * 100)));
    if (type !== 'all') params.set('type', type);
    if (sort) params.set('sort', sort);

    api
      .get<{ items: ListingItem[] }>(`/api/market/listings?${params.toString()}`)
      .then((res) => {
        if (!cancelled) setItems(res?.items || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topPick, selectedGenus, selectedOther, debouncedQ, priceMin, priceMax, type, sort]);

  const reset = () => {
    setTopPick('');
    setSelectedGenus('');
    setSelectedOther('');
    setType('all');
    setPriceMin('');
    setPriceMax('');
    setSort('latest');
    setQ('');
  };

  const hasFilter =
    topPick || selectedGenus || selectedOther || type !== 'all' || priceMin || priceMax || q || sort !== 'latest';

  return (
    <>
      {/* ============================== 过滤卡 ============================== */}
      <div className="card mb-5 space-y-3 p-4">
        {/* 行 1:科 chips + 「其他」 */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 shrink-0 text-xs text-leaf-700/70">类目:</span>
          <Chip active={!topPick} onClick={() => { setTopPick(''); setSelectedGenus(''); setSelectedOther(''); }}>
            全部
          </Chip>
          {families.map((f) => (
            <Chip
              key={f.slug}
              active={topPick === f.slug}
              onClick={() => {
                setTopPick(topPick === f.slug ? '' : f.slug);
                setSelectedGenus('');
                setSelectedOther('');
              }}
            >
              {f.icon} {f.name}
            </Chip>
          ))}
          <Chip
            active={topPick === 'other'}
            onClick={() => {
              setTopPick(topPick === 'other' ? '' : 'other');
              setSelectedGenus('');
              setSelectedOther('');
            }}
          >
            🧰 其他
          </Chip>
        </div>

        {/* 行 1.5:动态二级 — 科下属 / 「其他」子类 */}
        {topPick && topPick !== 'other' && currentGenera.length > 0 && (
          <div className="ml-2 flex flex-wrap items-center gap-1.5 border-l-2 border-leaf-200 pl-3">
            <span className="mr-1 shrink-0 text-[11px] text-leaf-700/60">属:</span>
            <Chip
              size="sm"
              active={!selectedGenus}
              onClick={() => setSelectedGenus('')}
            >
              全部属
            </Chip>
            {currentGenera.map((g) => (
              <Chip
                key={g.slug}
                size="sm"
                active={selectedGenus === g.slug}
                onClick={() => setSelectedGenus(selectedGenus === g.slug ? '' : g.slug)}
              >
                {g.name}
              </Chip>
            ))}
          </div>
        )}
        {topPick === 'other' && (
          <div className="ml-2 flex flex-wrap items-center gap-1.5 border-l-2 border-leaf-200 pl-3">
            <span className="mr-1 shrink-0 text-[11px] text-leaf-700/60">细分:</span>
            <Chip
              size="sm"
              active={!selectedOther}
              onClick={() => setSelectedOther('')}
            >
              全部
            </Chip>
            {OTHER_OPTIONS.map((o) => (
              <Chip
                key={o.key}
                size="sm"
                active={selectedOther === o.key}
                onClick={() => setSelectedOther(selectedOther === o.key ? '' : o.key)}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        )}

        {/* 行 2:交易类型 + 价格 + 排序 */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-leaf-700/70">交易:</span>
          {TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              active={type === opt.key}
              onClick={() => setType(opt.key)}
              size="sm"
            >
              {opt.label}
            </Chip>
          ))}

          <span className="ml-3 text-leaf-700/70">价格:</span>
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

          <select
            className="input !w-auto !text-xs ml-3"
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
              className="ml-auto text-xs text-leaf-700 hover:underline"
              type="button"
            >
              清空筛选
            </button>
          )}
        </div>

        {/* 行 3:右下角搜索框 */}
        <div className="flex justify-end pt-1">
          <div className="relative w-full max-w-[320px]">
            <Icon
              name="search"
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-leaf-500"
            />
            <input
              className="input pl-8 !text-sm"
              placeholder="搜索 标题 / 标签 …"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ============================== 列表 ============================== */}
      {loading ? (
        <div className="py-10 text-center text-sm text-leaf-700/60">加载中…</div>
      ) : items.length === 0 ? (
        <Empty icon="🛒" title={hasFilter ? '没有匹配的内容,试试放宽筛选' : '暂无商品'} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <ListingCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

// ============================================================
// 卡片组件
// ============================================================

function ListingCard({ item }: { item: ListingItem }) {
  const isAuction = item.type === 'auction';
  return (
    <Link
      href={item.url}
      className={cn(
        'group overflow-hidden rounded-lg border bg-white transition-all',
        isAuction
          ? 'border-rose-300 hover:border-rose-400 hover:shadow-md'
          : 'border-leaf-100 hover:border-leaf-300 hover:shadow-md',
      )}
    >
      <div className="relative aspect-square bg-leaf-50">
        <Image src={item.cover} alt={item.title} fill className="object-cover" unoptimized />
        {isAuction && (
          <span className="absolute left-1.5 top-1.5 rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
            🔨 拍卖中
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="line-clamp-1 text-sm font-medium text-ink-800 group-hover:text-leaf-700">
          {item.title}
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          {isAuction && (
            <span className="text-[10px] text-leaf-700/60">起拍</span>
          )}
          <span className="text-base font-bold text-rose-600">{formatPrice(item.price)}</span>
          {item.originalPrice && (
            <span className="text-[10px] text-leaf-700/40 line-through">
              {formatPrice(item.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Chip({
  children,
  active,
  onClick,
  size = 'md',
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        active
          ? 'border-leaf-500 bg-leaf-500 text-white'
          : 'border-leaf-200 bg-white text-ink-700 hover:bg-leaf-50',
      )}
    >
      {children}
    </button>
  );
}
