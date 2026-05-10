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
  shipFrom?: string | null;
  seller?: { id: string; name: string; avatar: string } | null;
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
  // 视图模式 grid / list,localStorage 持久化
  const [view, setView] = useState<'grid' | 'list'>('grid');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const v = localStorage.getItem('market.view');
    if (v === 'list' || v === 'grid') setView(v);
  }, []);
  const updateView = (v: 'grid' | 'list') => {
    setView(v);
    try {
      localStorage.setItem('market.view', v);
    } catch {}
  };
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
      {/* ============================== 过滤栏 ============================== */}
      <div className="mb-5 space-y-3">
        {/* 行 1:交易类型(放最上) */}
        <FilterRow label="交易">
          {TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt.key}
              active={type === opt.key}
              onClick={() => setType(opt.key)}
            >
              {opt.label}
            </Chip>
          ))}
        </FilterRow>

        {/* 行 2:类目(科 + 其他子类) */}
        <FilterRow label="类目">
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
              {o.label}
            </Chip>
          ))}
        </FilterRow>

        {/* 行 3:动态属(选科后展开) */}
        {isFamily && currentGenera.length > 0 && (
          <FilterRow label="属">
            <Chip active={!selectedGenus} onClick={() => setSelectedGenus('')}>
              全部
            </Chip>
            {currentGenera.map((g) => (
              <Chip
                key={g.slug}
                active={selectedGenus === g.slug}
                onClick={() => setSelectedGenus(selectedGenus === g.slug ? '' : g.slug)}
              >
                {g.name}
              </Chip>
            ))}
          </FilterRow>
        )}

        {/* 行 4:价格 + 排序 + 清空 + 搜索(右下) */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="w-12 shrink-0 text-leaf-700/60">价格</span>
          <input
            type="number"
            min={0}
            placeholder="最低"
            className="h-8 w-20 rounded-md border border-leaf-200 bg-white px-2 text-xs outline-none transition-colors focus:border-leaf-400"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
          />
          <span className="text-leaf-700/40">—</span>
          <input
            type="number"
            min={0}
            placeholder="最高"
            className="h-8 w-20 rounded-md border border-leaf-200 bg-white px-2 text-xs outline-none transition-colors focus:border-leaf-400"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
          />
          <span className="text-leaf-700/40">元</span>

          <span className="ml-3 text-leaf-700/60">排序</span>
          <select
            className="h-8 rounded-md border border-leaf-200 bg-white px-2 text-xs outline-none transition-colors focus:border-leaf-400"
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
              type="button"
              className="rounded-md border border-leaf-200 bg-white px-2 py-1 text-leaf-700/70 hover:border-rose-300 hover:text-rose-600"
            >
              清空筛选
            </button>
          )}

          {/* 视图切换 grid/list */}
          <div className="ml-auto inline-flex overflow-hidden rounded-md border border-leaf-200 bg-white">
            <button
              type="button"
              onClick={() => updateView('grid')}
              title="网格"
              className={cn(
                'flex h-8 w-8 items-center justify-center transition-colors',
                view === 'grid'
                  ? 'bg-leaf-100 text-leaf-700'
                  : 'text-leaf-700/50 hover:bg-leaf-50',
              )}
              aria-label="网格视图"
            >
              ▦
            </button>
            <button
              type="button"
              onClick={() => updateView('list')}
              title="列表"
              className={cn(
                'flex h-8 w-8 items-center justify-center border-l border-leaf-200 transition-colors',
                view === 'list'
                  ? 'bg-leaf-100 text-leaf-700'
                  : 'text-leaf-700/50 hover:bg-leaf-50',
              )}
              aria-label="列表视图"
            >
              ☰
            </button>
          </div>

          {/* 搜索框 — 右下 */}
          <div className="relative">
            <Icon
              name="search"
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-leaf-500"
            />
            <input
              className="h-8 w-48 rounded-md border border-leaf-200 bg-white pl-7 pr-2 text-xs outline-none transition-colors focus:border-leaf-400 sm:w-64"
              placeholder="搜索 标题 / 标签 / 发货地…"
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
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <GridCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ListCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

// ============================================================
// 卡片
// ============================================================

/* ===== 网格模式:极简,只看图 + 价格 + 拍卖徽章 ===== */
function GridCard({ item }: { item: ListingItem }) {
  const isAuction = item.type === 'auction';
  return (
    <Link
      href={item.url}
      className="group overflow-hidden rounded-xl border border-leaf-100 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square bg-leaf-50">
        <Image src={item.cover} alt={item.title} fill className="object-cover" unoptimized />
        {isAuction && (
          <>
            <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-md bg-rose-500/95 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
              🔨 拍卖
            </span>
            {item.endAt && (
              <span className="absolute right-2 top-2 rounded-md bg-ink-900/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                <Countdown to={item.endAt} />
              </span>
            )}
          </>
        )}
      </div>
      <div className="px-2.5 py-2">
        <div className="line-clamp-1 text-[13px] font-medium text-ink-800 group-hover:text-leaf-700">
          {item.title}
        </div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
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

/* ===== 列表模式:横排,信息全 ===== */
function ListCard({ item }: { item: ListingItem }) {
  const isAuction = item.type === 'auction';
  return (
    <Link
      href={item.url}
      className="group flex gap-3 overflow-hidden rounded-xl border border-leaf-100 bg-white p-2.5 transition-all hover:border-leaf-300 hover:shadow-sm"
    >
      {/* 左:封面 */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-leaf-50 sm:h-28 sm:w-28">
        <Image src={item.cover} alt={item.title} fill className="object-cover" unoptimized />
        {isAuction && (
          <span className="absolute left-1 top-1 rounded bg-rose-500/95 px-1 py-0.5 text-[9px] font-medium text-white">
            🔨
          </span>
        )}
      </div>

      {/* 中:标题 + 卖家 + 时间 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="line-clamp-1 text-sm font-medium text-ink-800 group-hover:text-leaf-700">
          {item.title}
        </div>
        {/* 卖家行 */}
        {item.seller && (
          <div className="mt-1 flex items-center gap-1.5">
            {item.seller.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.seller.avatar}
                alt=""
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            )}
            <span className="truncate text-[11px] text-ink-700/70">{item.seller.name}</span>
            {item.shipFrom && (
              <>
                <span className="text-leaf-700/30">·</span>
                <span className="truncate text-[11px] text-leaf-700/60">📍 {item.shipFrom}</span>
              </>
            )}
          </div>
        )}
        <div className="mt-auto pt-1 text-[11px] text-leaf-700/50">
          {fmtDate(item.createdAt)}
        </div>
      </div>

      {/* 右:价格 + 拍卖倒计时 */}
      <div className="flex shrink-0 flex-col items-end justify-between text-right">
        <div>
          {isAuction && (
            <div className="text-[10px] text-leaf-700/50">起拍</div>
          )}
          <div className="text-lg font-bold leading-tight text-rose-600">
            {formatPrice(item.price)}
          </div>
          {item.originalPrice && (
            <div className="text-[10px] text-leaf-700/40 line-through">
              {formatPrice(item.originalPrice)}
            </div>
          )}
        </div>
        {isAuction && item.endAt && (
          <div className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
            <Countdown to={item.endAt} />
          </div>
        )}
      </div>
    </Link>
  );
}

function Countdown({ to }: { to: string }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(to).getTime();
  const diff = target - Date.now();
  if (diff <= 0) return <>已结束</>;
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return <>剩 {days} 天</>;
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) {
    const mins = Math.floor((diff % 3600000) / 60000);
    return (
      <>
        剩 {hours}h{String(mins).padStart(2, '0')}
      </>
    );
  }
  const mins = Math.floor(diff / 60000);
  return <>剩 {mins} 分</>;
}

/** 卡片显示绝对日期(月/日 时:分),不要相对「N 天前」 */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  // 同年仅显示「月/日 hh:mm」,跨年附年份
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return sameYear ? `${m}/${day} ${hh}:${mm}` : `${d.getFullYear()}/${m}/${day}`;
}

/**
 * 过滤行容器 — 左侧固定标签 + 右侧 chips wrap
 */
function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 w-12 shrink-0 text-xs text-leaf-700/60">{label}</span>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

/**
 * 标签态 chip(扁平,不带边框,选中变绿底)
 */
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
        'inline-flex h-7 items-center rounded-md px-2.5 text-xs transition-colors',
        active
          ? 'bg-leaf-100 font-medium text-leaf-700'
          : 'text-ink-700/80 hover:bg-leaf-50 hover:text-leaf-700',
      )}
    >
      {children}
    </button>
  );
}
