'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn, formatPrice } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';

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
  maxPrice?: number;
  itemCount?: number;
  tradeMode?: 'platform_escrow' | 'online_payment' | 'external';
  tradeModes?: Array<'platform_escrow' | 'online_payment' | 'external'>;
  originalPrice?: number | null;
  createdAt: string;
  endAt?: string;
  url: string;
  shipFrom?: string | null;
  seller?: { id: string; name: string; avatar: string; followed?: boolean } | null;
  tags?: string[];
  taxons?: {
    categorySlug: string;
    genusSlug: string | null;
    speciesSlug: string | null;
    label: string;
  }[];
  products?: {
    id: string;
    title: string;
    description: string;
    price: number;
    stock: number;
    collectCount?: number;
    collected?: boolean;
    cover: string;
    images: string[];
  }[];
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
type TradeMode = NonNullable<ListingItem['tradeMode']>;

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
      .get<CategoryFamily[]>('/api/boards?kind=family')
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
        '/api/boards?kind=family&withGenera=1',
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
  const { user } = useAuth();
  const isAuction = item.type === 'auction';
  const isMine = Boolean(!isAuction && item.seller?.id && user?.id === item.seller.id);
  const images = item.images?.length ? item.images : [item.cover];
  const displayImages = images.slice(0, 4);
  const products = item.products?.length
    ? item.products
    : [{
        id: item.id,
        title: item.title,
        description: item.description ?? '',
        price: item.price,
        stock: item.itemCount ?? 1,
        cover: item.cover,
        images,
      }];
  const taxonLabels = item.taxons?.length
    ? item.taxons.map((taxon) => taxon.label).filter(Boolean)
    : item.genus?.name
      ? [item.genus.name]
      : [];
  const tradeModes = normalizeTradeModes(item.tradeModes, item.tradeMode);

  if (!isAuction) {
    return (
      <article className="rounded-xl border border-leaf-100 bg-white p-4 transition-colors hover:border-leaf-300 hover:shadow-sm">
        {item.seller && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-ink-500">
            {item.seller.avatar ? (
              <img
                src={item.seller.avatar}
                alt={item.seller.name}
                className="h-7 w-7 rounded-full object-cover ring-2 ring-leaf-100"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-leaf-100 text-xs text-leaf-600">
                {item.seller.name[0]}
              </div>
            )}
            <span className="font-medium text-ink-800">{item.seller.name}</span>
            <FollowSellerButton sellerId={item.seller.id} initialFollowed={!!item.seller.followed} />
            {isMine && (
              <Link
                href={`/market/${item.id}/edit`}
                className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-leaf-700 hover:bg-leaf-50"
                title="编辑"
              >
                <Icon name="edit" size={14} />
                编辑
              </Link>
            )}
          </div>
        )}
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={item.url}
              className="line-clamp-2 text-base font-semibold text-ink-800 transition-colors hover:text-leaf-700"
            >
              {item.title}
            </Link>
            {item.description && (
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-600">
                {stripHtml(item.description)}
              </p>
            )}
          </div>
          {tradeModes.length > 0 && (
            <span className="shrink-0 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {tradeModes.map(tradeModeLabel).join(' / ')}
            </span>
          )}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-leaf-700/70">
          {item.shipFrom && <span>发货地 {item.shipFrom}</span>}
          {taxonLabels.length > 0 && (
            <>
              <span className="text-leaf-700/30">/</span>
              <span>所属板块/品种</span>
              {taxonLabels.slice(0, 6).map((label) => (
                <span key={label} className="rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] text-leaf-700">
                  {label}
                </span>
              ))}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {products.map((product) => {
            const image = product.images[0] || product.cover;
            const extraImageCount = Math.max(0, product.images.length - 1);
            return (
              <div key={product.id} className="rounded-lg border border-leaf-100 bg-leaf-50/30">
                <div className="relative aspect-square overflow-hidden rounded-t-lg bg-leaf-50">
                  <Link href={item.url} className="block h-full">
                    <Image src={image} alt={product.title} fill className="object-cover" unoptimized />
                  </Link>
                  {extraImageCount > 0 && (
                    <div className="absolute bottom-2 right-2 rounded-full bg-ink-900/70 px-2 py-0.5 text-[11px] font-medium text-white">
                      +{extraImageCount}
                    </div>
                  )}
                  <ProductCollectButton
                    listingId={item.id}
                    itemId={product.id}
                    initialCollected={!!product.collected}
                  />
                </div>
                <Link href={item.url} className="block">
                  <div className="space-y-1 p-2">
                    <div className="line-clamp-1 text-xs font-medium leading-4 text-ink-800">
                      {product.title}
                    </div>
                    {product.description && (
                      <Tooltip content={product.description} className="text-left">
                        <span className="block max-h-8 overflow-hidden text-[11px] leading-4 text-leaf-700/70 [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
                          {product.description}
                        </span>
                      </Tooltip>
                    )}
                    <div className="flex items-end justify-between gap-1 pt-0.5">
                      <span className="text-sm font-bold text-rose-600">{formatPrice(product.price)}</span>
                      <span className="shrink-0 text-[11px] text-leaf-700/70">数量 {product.stock}</span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
          <span>{item.itemCount ?? products.length} 件商品</span>
          <div className="ml-auto flex items-center gap-3">
            <Link href={item.url} className="flex items-center gap-1 hover:text-leaf-700" title="查看">
              <Icon name="eye" size={14} />
              {item.views ?? 0}
            </Link>
            <Link href={`${item.url}#comments`} className="flex items-center gap-1 hover:text-leaf-700" title="评论">
              <Icon name="message" size={14} />
              {item.comments ?? 0}
            </Link>
            <span className="text-ink-400">{formatDateTime(item.createdAt)}</span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-leaf-100 bg-white p-4 transition-colors hover:border-leaf-300 hover:shadow-sm">
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
          <FollowSellerButton sellerId={item.seller.id} initialFollowed={!!item.seller.followed} />
          {isAuction && (
            <span className="ml-2 rounded bg-rose-500/95 px-2 py-0.5 text-[10px] font-medium text-white">
              🔨 拍卖
            </span>
          )}
          {!isAuction && (
            <span className="ml-2 rounded bg-leaf-100 px-2 py-0.5 text-[10px] font-medium text-leaf-700">
              {item.itemCount && item.itemCount > 1 ? `${item.itemCount} 件商品` : '一口价'}
            </span>
          )}
          {!isAuction && tradeModes.length > 0 && (
            <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              {tradeModes.map(tradeModeLabel).join(' / ')}
            </span>
          )}
        </div>
      )}

      {/* 第二行：标题 */}
      <Link
        href={item.url}
        className="mb-2 block text-base font-semibold text-ink-800 transition-colors hover:text-leaf-700"
      >
        {item.title}
      </Link>

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

      {!isAuction && (
        <div className="mb-3 text-lg font-bold text-rose-600">
          {item.maxPrice && item.maxPrice !== item.price
            ? `${formatPrice(item.price)} - ${formatPrice(item.maxPrice)}`
            : formatPrice(item.price)}
        </div>
      )}

      {/* 第五行：图片 */}
      <Link href={item.url} className="mb-3 flex gap-2">
        {displayImages.map((img, i) => (
          <div
            key={i}
            className="relative h-24 w-24 overflow-hidden rounded-lg bg-leaf-50 flex-shrink-0"
          >
            <Image src={img} alt="" fill className="object-cover" unoptimized />
          </div>
        ))}
      </Link>

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

        {/* 右侧：查看数 + 评论数 + 时间 */}
        <div className={cn(
          "flex items-center gap-3 text-ink-500",
          !item.genus && "ml-auto"
        )}>
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
          <span className="text-ink-400">{formatDateTime(item.createdAt)}</span>
        </div>
      </div>
    </article>
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

function normalizeTradeModes(modes: TradeMode[] | undefined, fallback: ListingItem['tradeMode']): TradeMode[] {
  const allowed: TradeMode[] = ['platform_escrow', 'online_payment', 'external'];
  const selected = modes?.length ? modes : fallback ? [fallback] : [];
  return Array.from(new Set(selected.filter((mode) => allowed.includes(mode))));
}

function tradeModeLabel(mode: TradeMode): string {
  if (mode === 'platform_escrow') return '平台担保';
  if (mode === 'online_payment') return '在线支付';
  return '自行联系';
}

function FollowSellerButton({ sellerId, initialFollowed }: { sellerId: string; initialFollowed: boolean }) {
  const { user } = useAuth();
  const [followed, setFollowed] = useState(initialFollowed);
  const [busy, setBusy] = useState(false);

  if (user?.id === sellerId) return null;

  const toggleFollow = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ followed: boolean }>(`/api/users/${sellerId}/follow`);
      setFollowed(res.followed);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent('/market')}`;
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleFollow}
      disabled={busy}
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors',
        followed
          ? 'bg-leaf-100 text-leaf-700 hover:bg-leaf-200'
          : 'bg-leaf-600 text-white hover:bg-leaf-700',
        busy && 'opacity-60',
      )}
    >
      {followed ? '已关注' : '关注'}
    </button>
  );
}

function ProductCollectButton({
  listingId,
  itemId,
  initialCollected,
}: {
  listingId: string;
  itemId: string;
  initialCollected: boolean;
}) {
  const [collected, setCollected] = useState(initialCollected);
  const [busy, setBusy] = useState(false);

  const toggleCollect = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ collected: boolean }>(
        `/api/market/listings/${listingId}/items/${itemId}/collect`,
      );
      setCollected(res.collected);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        window.location.href = `/login?redirect=${encodeURIComponent('/market')}`;
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleCollect}
      disabled={busy}
      className={cn(
        'absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white',
        collected ? 'text-rose-600' : 'text-leaf-700 hover:text-rose-600',
        busy && 'opacity-60',
      )}
      aria-label={collected ? '取消收藏商品' : '收藏商品'}
      title={collected ? '取消收藏商品' : '收藏商品'}
    >
      <Icon name="heart" size={15} fill={collected ? 'currentColor' : 'none'} />
    </button>
  );
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
