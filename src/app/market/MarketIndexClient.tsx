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

// 顶层「其他」类目直接平铺,key 用 other:xxx
const OTHER_KINDS = [
  { key: 'other:tools', label: '工具', icon: '🔧' },
  { key: 'other:pot', label: '盆器', icon: '🪴' },
  { key: 'other:soil', label: '盆土', icon: '🪨' },
  { key: 'other:fertilizer', label: '肥料', icon: '💊' },
  { key: 'other:kit', label: '套装', icon: '🎁' },
];

const SORT_OPTIONS = [
  { key: 'latest', label: '最新发布' },
  { key: 'oldest', label: '最早发布' },
  { key: 'price_asc', label: '价格 ↑' },
  { key: 'price_desc', label: '价格 ↓' },
];

const TYPE_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'product', label: '一口价' },
  { key: 'auction', label: '拍卖' },
];

export function MarketIndexClient() {
  const [families, setFamilies] = useState<CategoryFamily[]>([]);
  const [generaByFamily, setGeneraByFamily] = useState<Record<string, GenusOption[]>>({});

  // topPick 取值:'' (全部) | family slug (科) | 'other:xxx' (其他子类)
  const [topPick, setTopPick] = useState<string>('');
  const [selectedGenus, setSelectedGenus] = useState<string>('');

  const [type, setType] = useState<string>('all');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [sort, setSort] = useState<string>('latest');
  const [q, setQ] = useState<string>('');
  const [debouncedQ, setDebouncedQ] = useState<string>('');

  const [items, setItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    api
      .get<CategoryFamily[]>('/api/categories?kind=family')
      .then((list) => setFamilies(list || []))
      .catch(() => null);
  }, []);

  // 选了某科 → 拉一次科+属
  const isFamily = topPick && !topPick.startsWith('other:');
  const isOther = topPick.startsWith('other:');
  useEffect(() => {
    if (!isFamily) return;
    if (generaByFamily[topPick]) return;
    api
      .get<{ slug: string; genera: { slug: string; name: string; latinName: string | null }[] }[]>(
        '/api/categories?kind=family&withGenera=1',
      )
      .then((list) => {
        const map: Record<string, GenusOption[]> = {};
        for (const c of list || []) {
          map[c.slug] = (c.genera || []).map((g) => ({ ...g, familySlug: c.slug }));
        }
        setGeneraByFamily(map);
      })
      .catch(() => null);
  }, [topPick, isFamily, generaByFamily]);

  const currentGenera = useMemo(
    () => (isFamily ? generaByFamily[topPick] || [] : []),
    [isFamily, topPick, generaByFamily],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (isFamily) params.set('family', topPick);
    if (selectedGenus) params.set('genus', selectedGenus);
    if (isOther) params.set('other', topPick.split(':')[1]);
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
  }, [topPick, selectedGenus, debouncedQ, priceMin, priceMax, type, sort, isFamily, isOther]);

  const reset = () => {
    setTopPick('');
    setSelectedGenus('');
    setType('all');
    setPriceMin('');
    setPriceMax('');
    setSort('latest');
    setQ('');
  };

  const hasFilter =
    topPick || selectedGenus || type !== 'all' || priceMin || priceMax || q || sort !== 'latest';

  return (
    <>
      {/* ============================== 过滤卡 ============================== */}
      <div className="mb-5 rounded-2xl border border-leaf-100 bg-white p-4 shadow-sm">
        {/* 行 1:类目 chips(科 + 其他子类同级平铺) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={!topPick} onClick={() => { setTopPick(''); setSelectedGenus(''); }}>
            全部
          </Chip>
          {families.map((f) => (
            <Chip
              key={f.slug}
              active={topPick === f.slug}
              onClick={() => {
                setTopPick(topPick === f.slug ? '' : f.slug);
                setSelectedGenus('');
              }}
            >
              <span className="mr-0.5">{f.icon}</span>
              {f.name}
            </Chip>
          ))}
          {OTHER_KINDS.map((o) => (
            <Chip
              key={o.key}
              active={topPick === o.key}
              onClick={() => {
                setTopPick(topPick === o.key ? '' : o.key);
                setSelectedGenus('');
              }}
            >
              <span className="mr-0.5">{o.icon}</span>
              {o.label}
            </Chip>
          ))}
        </div>

        {/* 行 1.5:动态属(只有选了科才展开) */}
        {isFamily && currentGenera.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-lg bg-leaf-50/60 px-2 py-2">
            <span className="ml-1 mr-1 shrink-0 text-[11px] text-leaf-700/70">
              {families.find((f) => f.slug === topPick)?.name} 属:
            </span>
            <Chip size="sm" active={!selectedGenus} onClick={() => setSelectedGenus('')}>
              全部
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

        {/* 行 2:交易类型 + 价格 + 排序 + 搜索(右下) */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              size="sm"
              active={type === opt.key}
              onClick={() => setType(opt.key)}
            >
              {opt.label}
            </Chip>
          ))}

          <span className="ml-2 text-leaf-700/60">¥</span>
          <input
            type="number"
            min={0}
            placeholder="最低"
            className="h-7 w-20 rounded-md border border-leaf-200 bg-white px-2 text-xs outline-none focus:border-leaf-400"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
          <span className="text-leaf-700/40">—</span>
          <input
            type="number"
            min={0}
            placeholder="最高"
            className="h-7 w-20 rounded-md border border-leaf-200 bg-white px-2 text-xs outline-none focus:border-leaf-400"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />

          <select
            className="h-7 rounded-md border border-leaf-200 bg-white px-2 text-xs outline-none focus:border-leaf-400"
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
            <button onClick={reset} type="button" className="text-leaf-700/70 hover:text-leaf-700">
              清空
            </button>
          )}

          {/* 搜索框靠右(右下角) */}
          <div className="ml-auto relative">
            <Icon
              name="search"
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-leaf-500"
            />
            <input
              className="h-7 w-44 rounded-md border border-leaf-200 bg-white pl-7 pr-2 text-xs outline-none focus:border-leaf-400 sm:w-56"
              placeholder="搜索…"
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
        <Empty icon="🛒" title={hasFilter ? '没有匹配的内容' : '暂无商品'} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <ListingCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

// ============================================================
// 卡片
// ============================================================

function ListingCard({ item }: { item: ListingItem }) {
  const isAuction = item.type === 'auction';
  return (
    <Link
      href={item.url}
      className="group overflow-hidden rounded-xl border border-leaf-100 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square bg-leaf-50">
        <Image src={item.cover} alt={item.title} fill className="object-cover" unoptimized />
        {isAuction && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-md bg-rose-500/95 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
            🔨 拍卖
          </span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <div className="line-clamp-1 text-[13px] font-medium text-ink-800 group-hover:text-leaf-700">
          {item.title}
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          {isAuction && <span className="text-[10px] text-leaf-700/50">起拍</span>}
          <span className="text-[15px] font-bold text-rose-600">{formatPrice(item.price)}</span>
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
        'inline-flex items-center rounded-full border transition-colors',
        size === 'sm' ? 'h-6 px-2.5 text-[11px]' : 'h-7 px-3 text-xs',
        active
          ? 'border-leaf-500 bg-leaf-500 text-white shadow-sm'
          : 'border-leaf-200 bg-white text-ink-700 hover:border-leaf-400 hover:bg-leaf-50',
      )}
    >
      {children}
    </button>
  );
}
