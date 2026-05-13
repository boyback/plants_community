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
  cover?: string | null;
}

interface ListingItem {
  type: 'product' | 'auction';
  id: string;
  title: string;
  description?: string;
  cover: string;
  images?: string[];
  price: number;
  originalPrice?: number | null;
  createdAt: string;
  endAt?: string;
  url: string;
  shipFrom?: string | null;
  seller?: { id: string; name: string; avatar: string } | null;
  tags?: string[];
  genus?: { slug: string; name: string; cover?: string | null } | null;
  views?: number;
  comments?: number;
}

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

type LayoutMode = 'default';

export function MarketIndexClient() {
  const [families, setFamilies] = useState<CategoryFamily[]>([]);
  const [generaByFamily, setGeneraByFamily] = useState<Record<string, GenusOption[]>>({});

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
    return () => { cancelled = true; };
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
        <FilterRow label="交易">
          {TYPE_OPTIONS.map((opt) => (
            <Chip key={opt.key} active={type === opt.key} onClick={() => setType(opt.key)}>
              {opt.label}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="类目">
          <Chip active={!topPick} onClick={() => { setTopPick(''); setSelectedGenus(''); }}>
            全部
          </Chip>
          {families.map((f) => (
            <Chip
              key={f.slug}
              active={topPick === f.slug}
              onClick={() => { setTopPick(topPick === f.slug ? '' : f.slug); setSelectedGenus(''); }}
            >
              {f.name}
            </Chip>
          ))}
          {OTHER_KINDS.map((o) => (
            <Chip
              key={o.key}
              active={topPick === o.key}
              onClick={() => { setTopPick(topPick === o.key ? '' : o.key); setSelectedGenus(''); }}
            >
              {o.label}
            </Chip>
          ))}
        </FilterRow>

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

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="w-12 shrink-0 text-leaf-700/60">价格</span>
          <input type="number" min={0} placeholder="最低"
            className="h-8 w-20 rounded-md border border-leaf-200 bg-white px-2 text-xs outline-none focus:border-leaf-400"
            value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
          <span className="text-leaf-700/40">—</span>
          <input type="number" min={0} placeholder="最高"
            className="h-8 w-20 rounded-md border border-leaf-200 bg-white px-2 text-xs outline-none focus:border-leaf-400"
            value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
          <span className="text-leaf-700/40">元</span>

          <span className="ml-3 text-leaf-700/60">排序</span>
          <select
            className="h-8 rounded-md border border-leaf-200 bg-white px-2 text-xs outline-none focus:border-leaf-400"
            value={sort} onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>

          {hasFilter && (
            <button onClick={reset} type="button"
              className="rounded-md border border-leaf-200 bg-white px-2 py-1 text-leaf-700/70 hover:border-rose-300 hover:text-rose-600">
              清空筛选
            </button>
          )}

          <div className="relative ml-auto">
            <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-leaf-500" />
            <input
              className="h-8 w-48 rounded-md border border-leaf-200 bg-white pl-7 pr-2 text-xs outline-none focus:border-leaf-400 sm:w-64"
              placeholder="搜索 标题 / 标签 / 发货地…"
              value={q} onChange={(e) => setQ(e.target.value)}
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
        <>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-leaf-700/50">{items.length} 个结果</span>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <DefaultCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ============================================================
// 默认卡片（详细信息模式）
// ============================================================
function DefaultCard({ item }: { item: ListingItem }) {
  const isAuction = item.type === 'auction';
  const images = item.images?.length ? item.images : [item.cover];
  const displayImages = images.slice(0, 4);

  return (
    <Link
      href={item.url}
      className="block rounded-xl border border-leaf-100 bg-white p-4 transition-colors hover:border-leaf-300 hover:shadow-sm"
    >
      {/* 第一行：用户头像 + 昵称 */}
      {item.seller && (
        <div className="flex items-center gap-2 mb-3">
          {item.seller.avatar ? (
            <img
              src={item.seller.avatar}
              alt={item.seller.name}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-leaf-100"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-leaf-100 flex items-center justify-center text-leaf-600 text-sm">
              {item.seller.name[0]}
            </div>
          )}
          <span className="font-medium text-ink-800">{item.seller.name}</span>
          {isAuction && (
            <span className="ml-2 rounded bg-rose-500/95 px-2 py-0.5 text-[10px] font-medium text-white">
              🔨 拍卖
            </span>
          )}
        </div>
      )}

      {/* 第二行：标题 */}
      <h3 className="text-base font-semibold text-ink-800 mb-2 hover:text-leaf-700 transition-colors">
        {item.title}
      </h3>

      {/* 第三行：描述 */}
      {item.description && (
        <p className="text-sm text-ink-600 leading-relaxed mb-2 line-clamp-2">
          {stripHtml(item.description)}
        </p>
      )}

      {/* 第四行：话题标签 */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {item.tags.slice(0, 5).map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] text-leaf-700"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 第五行：图片 */}
      <div className="flex gap-2 mb-3">
        {displayImages.map((img, i) => (
          <div
            key={i}
            className="relative h-24 w-24 overflow-hidden rounded-lg bg-leaf-50 flex-shrink-0"
          >
            <Image src={img} alt="" fill className="object-cover" unoptimized />
          </div>
        ))}
      </div>

      {/* 最后一行：板块(属) + 时间 + 查看数 + 评论数 */}
      <div className="flex items-center justify-between text-xs">
        {/* 左侧：板块(属) */}
        {item.genus && (
          <div className="flex items-center gap-1.5 text-leaf-700">
            {item.genus.cover ? (
              <img
                src={item.genus.cover}
                alt={item.genus.name}
                className="h-5 w-5 rounded object-cover"
              />
            ) : (
              <span>📁</span>
            )}
            <span>{item.genus.name}</span>
          </div>
        )}

        {/* 右侧：时间 + 查看数 + 评论数 */}
        <div className={cn(
          "flex items-center gap-3 text-ink-500",
          !item.genus && "ml-auto"
        )}>
          <span className="text-ink-400">{formatDateTime(item.createdAt)}</span>
          {item.views !== undefined && (
            <span className="flex items-center gap-1">
              <Icon name="eye" size={14} />
              {item.views}
            </span>
          )}
          {item.comments !== undefined && (
            <span className="flex items-center gap-1">
              <Icon name="message" size={14} />
              {item.comments}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// 工具函数
// ============================================================
function stripHtml(html: string): string {
  // 去掉 HTML 标签，保留纯文本
  return html.replace(/<[^>]*>/g, '').trim();
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1 w-12 shrink-0 text-xs text-leaf-700/60">{label}</span>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center rounded-md px-2.5 text-xs transition-colors',
        active ? 'bg-leaf-100 font-medium text-leaf-700' : 'text-ink-700/80 hover:bg-leaf-50 hover:text-leaf-700',
      )}>
      {children}
    </button>
  );
}
