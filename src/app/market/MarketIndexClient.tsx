'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { Tooltip } from '@/components/ui/Tooltip';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn, formatPrice } from '@/lib/utils';
import type { EquipState } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from "@/lib/client-api";
import styles from './MarketIndexClient.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



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
  listingId?: string;
  itemId?: string;
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
  seller?: {id: string;name: string;avatar: string;equip?: EquipState;followed?: boolean;} | null;
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
  stock?: number;
  collected?: boolean;
  genus?: {slug: string;name: string;cover?: string | null;} | null;
  views?: number;
  comments?: number;
  status?: 'on_sale' | 'trading' | 'sold_out' | 'off_shelf';
  listingStatus?: 'on_sale' | 'trading' | 'sold_out' | 'off_shelf' | 'pending_review';
}

const OTHER_KINDS = [
{ key: "other:tools", label: '工具', icon: '🔧' },
{ key: "other:pot", label: '盆器', icon: '🪴' },
{ key: "other:soil", label: '盆土', icon: '🪨' },
{ key: "other:fertilizer", label: '肥料', icon: '💊' },
{ key: "other:kit", label: '套装', icon: '🎁' }];


const SORT_OPTIONS = [
{ key: 'latest', label: '最新发布' },
{ key: 'oldest', label: '最早发布' },
{ key: 'price_asc', label: '价格 ↑' },
{ key: 'price_desc', label: '价格 ↓' }];


const TYPE_OPTIONS = [
{ key: 'all', label: '全部' },
{ key: 'product', label: '一口价' },
{ key: 'auction', label: '拍卖' }];


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
    api.
    get<CategoryFamily[]>('/api/boards?kind=family').
    then((list) => setFamilies(list || [])).
    catch(() => null);
  }, []);

  const isFamily = topPick && !topPick.startsWith("other:");
  const isOther = topPick.startsWith("other:");
  useEffect(() => {
    if (!isFamily) return;
    if (generaByFamily[topPick]) return;
    api.
    get<{slug: string;genera: {slug: string;name: string;latinName: string | null;}[];}[]>(
      '/api/boards?kind=family&withGenera=1'
    ).
    then((list) => {
      const map: Record<string, GenusOption[]> = {};
      for (const c of list || []) {
        map[c.slug] = (c.genera || []).map((g) => ({ ...g, familySlug: c.slug }));
      }
      setGeneraByFamily(map);
    }).
    catch(() => null);
  }, [topPick, isFamily, generaByFamily]);

  const currentGenera = useMemo(
    () => isFamily ? generaByFamily[topPick] || [] : [],
    [isFamily, topPick, generaByFamily]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (isFamily) params.set('family', topPick);
    if (selectedGenus) params.set('genus', selectedGenus);
    if (isOther) params.set('other', topPick.split(":")[1]);
    if (debouncedQ) params.set('q', debouncedQ);
    if (priceMin) params.set('priceMin', String(Math.floor(Number(priceMin) * 100)));
    if (priceMax) params.set('priceMax', String(Math.floor(Number(priceMax) * 100)));
    if (type !== 'all') params.set('type', type);
    if (sort) params.set('sort', sort);

    api.
    get<{items: ListingItem[];}>(`/api/market/listings?${params.toString()}`).
    then((res) => {
      if (!cancelled) setItems(res?.items || []);
    }).
    catch(() => {
      if (!cancelled) setItems([]);
    }).
    finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {cancelled = true;};
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
      <div className={cx(styles.r_fb88ccaa, styles.r_6ed543e2)}>
        <FilterRow label="交易">
          {TYPE_OPTIONS.map((opt) =>
          <Chip key={opt.key} active={type === opt.key} onClick={() => setType(opt.key)}>
              {opt.label}
            </Chip>
          )}
        </FilterRow>

        <FilterRow label="类目">
          <Chip active={!topPick} onClick={() => {setTopPick('');setSelectedGenus('');}}>
            全部
          </Chip>
          {families.map((f) =>
          <Chip
            key={f.slug}
            active={topPick === f.slug}
            onClick={() => {setTopPick(topPick === f.slug ? '' : f.slug);setSelectedGenus('');}}>

              {f.name}
            </Chip>
          )}
          {OTHER_KINDS.map((o) =>
          <Chip
            key={o.key}
            active={topPick === o.key}
            onClick={() => {setTopPick(topPick === o.key ? '' : o.key);setSelectedGenus('');}}>

              {o.label}
            </Chip>
          )}
        </FilterRow>

        {isFamily && currentGenera.length > 0 &&
        <FilterRow label="属">
            <Chip active={!selectedGenus} onClick={() => setSelectedGenus('')}>
              全部
            </Chip>
            {currentGenera.map((g) =>
          <Chip
            key={g.slug}
            active={selectedGenus === g.slug}
            onClick={() => setSelectedGenus(selectedGenus === g.slug ? '' : g.slug)}>

                {g.name}
              </Chip>
          )}
          </FilterRow>
        }

        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2)}>
          <span className={cx(styles.r_e7e37107, styles.r_012fbd12, styles.r_6c4cc49e)}>价格</span>
          <Input type="number" min={0} placeholder="最低"
          className={cx(styles.r_ed8a5df7, styles.r_ed831a4d, styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_d5eab218, styles.r_359090c2, styles.r_df37b1fd, styles.r_74046e83)}
          value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
          <span className={styles.r_4d094717}>—</span>
          <Input type="number" min={0} placeholder="最高"
          className={cx(styles.r_ed8a5df7, styles.r_ed831a4d, styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_d5eab218, styles.r_359090c2, styles.r_df37b1fd, styles.r_74046e83)}
          value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
          <span className={styles.r_4d094717}>元</span>

          <span className={cx(styles.r_fd9bb0dd, styles.r_6c4cc49e)}>排序</span>
          <select
            className={cx(styles.r_ed8a5df7, styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_d5eab218, styles.r_359090c2, styles.r_df37b1fd, styles.r_74046e83)}
            value={sort} onChange={(e) => setSort(e.target.value)}>

            {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>

          {hasFilter &&
          <button onClick={reset} type="button"
          className={cx(styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_d5eab218, styles.r_660d2eff, styles.r_69335b95, styles.r_e7235083, styles.r_744ff542)}>
              清空筛选
            </button>
          }

          <div className={cx(styles.r_d89972fe, styles.r_fb56d9cf)}>
            <Icon name="search" size={14} className={cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_ecfeb742, styles.r_d694ba66, styles.r_36b381be, styles.r_eb16169c)} />
            <Input
              className={cx(styles.r_ed8a5df7, styles.r_74b2435a, styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_20ebde75, styles.r_aa2c13a5, styles.r_359090c2, styles.r_df37b1fd, styles.r_74046e83, styles.r_66f2147e)}
              placeholder="搜索 标题 / 标签 / 发货地…"
              value={q} onChange={(e) => setQ(e.target.value)} />

          </div>
        </div>
      </div>

      {/* ============================== 列表 ============================== */}
      {loading ?
      <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>加载中…</div> :
      items.length === 0 ?
      <Empty icon="🛒" title={hasFilter ? '没有匹配的内容' : '暂无商品'} /> :

      <>
          <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
            <span className={cx(styles.r_d058ca6d, styles.r_3353f144)}>{items.length} 个结果</span>
          </div>

          <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_1004c0c3, styles.r_e00ad816, styles.r_19d9b25e, styles.r_a1de1eab)}>
            {items.map((item) =>
          <DefaultCard key={`${item.type}-${item.id}`} item={item} />
          )}
          </div>
        </>
      }
    </>);

}

// ============================================================
// 默认卡片（详细信息模式）
// ============================================================
function DefaultCard({ item }: {item: ListingItem;}) {
  const { user } = useAuth();
  const isAuction = item.type === 'auction';
  const isMine = Boolean(!isAuction && item.seller?.id && user?.id === item.seller.id);
  const images = item.images?.length ? item.images : [item.cover];
  const taxonLabels = item.taxons?.length ?
  item.taxons.map((taxon) => taxon.label).filter(Boolean) :
  item.genus?.name ?
  [item.genus.name] :
  [];
  const tradeModes = normalizeTradeModes(item.tradeModes, item.tradeMode);

  if (!isAuction) {
    const soldLabel = soldOverlayLabel(item);
    return (
      <article className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_e3a0584f, styles.r_7e0b7cdf, styles.r_8dddea07, styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_ceb69a6b, styles.r_a5c39c39, styles.r_ab1dd417)}>
        <Link href={item.url} className={styles.r_0214b4b3}>
          <div className={cx(styles.r_d89972fe, styles.r_726bdf47, styles.r_7ebecbb6)}>
            <Image
              src={item.cover}
              alt={item.title}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className={styles.r_7d85d0c2}
              unoptimized />

            {images.length > 1 &&
            <div className={cx(styles.r_da4dbfbc, styles.r_f6babb33, styles.r_7b2d6393, styles.r_ac204c10, styles.r_95a04d1b, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_2689f395, styles.r_72a4c7cd)}>
                +{images.length - 1}
              </div>
            }
            {item.listingId && item.itemId &&
            <ProductCollectButton
              listingId={item.listingId}
              itemId={item.itemId}
              initialCollected={!!item.collected} />

            }
          </div>
        </Link>

        <div className={cx(styles.r_60fbb771, styles.r_fb7302e5, styles.r_36e579c0, styles.r_8dddea07, styles.r_77a2a20e, styles.r_eb6e8b88)}>
          <Link
            href={item.url}
            className={cx(styles.r_054cb4e3, styles.r_bb37cef0, styles.r_cff55289, styles.r_e83a7042, styles.r_7054e276, styles.r_399e11a5, styles.r_ceb69a6b, styles.r_9825203a)}>

            {item.title}
          </Link>

          {item.seller &&
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2, styles.r_7b89cd85)}>
              <Link
              href={`/user/${item.seller.id}?tab=products`}
              className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_ceb69a6b, styles.r_9825203a)}>

                <UserAvatar
                  src={item.seller.avatar || '/default-avatar.svg'}
                  alt={item.seller.name}
                  size={28}
                  ring={false}
                  pendant={item.seller.equip?.pendant ?? null}
                />
                <span className={cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_f283ea9b, styles.r_2689f395, styles.r_399e11a5)}>{item.seller.name}</span>
              </Link>
              <FollowSellerButton sellerId={item.seller.id} initialFollowed={!!item.seller.followed} />
              {isMine && item.listingId &&
            <Link
              href={`/market/${item.listingId}/edit`}
              className={cx(styles.r_f3c543ad, styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_67d66567, styles.r_421ac2be, styles.r_5f6a59f1, styles.r_5756b7b4)}
              title="编辑">

                  <Icon name="edit" size={14} />
                </Link>
            }
            </div>
          }
          {item.description &&
          <Tooltip content={stripHtml(item.description)} className={styles.r_2eba0d65}>
              <p className={cx(styles.r_054cb4e3, styles.r_359090c2, styles.r_7054e276, styles.r_02eb621e)}>
                {stripHtml(item.description)}
              </p>
            </Tooltip>
          }

          <div className={cx(styles.r_60fbb771, styles.r_6f27f4f7, styles.r_8ef2268e, styles.r_77a2a20e)}>
            <div className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_595fceba)}>{formatPrice(item.price)}</div>
            {typeof item.stock === 'number' &&
            <div className={cx(styles.r_012fbd12, styles.r_d058ca6d, styles.r_69335b95)}>库存 {item.stock}</div>
            }
          </div>

          {tradeModes.length > 0 &&
          <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_44ee8ba0)}>
              {tradeModes.map((mode) =>
            <span key={mode} className={cx(styles.r_07389a77, styles.r_67d2289d, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395, styles.r_85d79ebf)}>
                  {tradeModeLabel(mode)}
                </span>
            )}
            </div>
          }

          {(taxonLabels.length > 0 || (item.tags?.length ?? 0) > 0) &&
          <div className={cx(styles.r_60fbb771, styles.r_662364b2, styles.r_1eb5c6df, styles.r_44ee8ba0, styles.r_2cd02d11)}>
              {taxonLabels.slice(0, 2).map((label) =>
            <span key={label} className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_5f6a59f1)}>
                  {label}
                </span>
            )}
              {item.tags?.slice(0, 2).map((tag) =>
            <span key={tag} className={cx(styles.r_ac204c10, styles.r_ce27a834, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_02eb621e)}>
                  #{tag}
                </span>
            )}
            </div>
          }

          <div className={cx(styles.r_9953408a, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e, styles.r_b950dda2, styles.r_88b684d2, styles.r_f46b61a9, styles.r_d058ca6d, styles.r_7b89cd85)}>
            {item.shipFrom ? <span className={styles.r_f283ea9b}>发货地 {item.shipFrom}</span> : <span />}
            <div className={cx(styles.r_60fbb771, styles.r_012fbd12, styles.r_3960ffc2, styles.r_77a2a20e)}>
              <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}><Icon name="eye" size={12} />{item.views ?? 0}</span>
              <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}><Icon name="message" size={12} />{item.comments ?? 0}</span>
            </div>
          </div>
        </div>
        {soldLabel &&
        <SoldCardOverlay label={soldLabel} />
        }
      </article>);

  }

  return (
    <article className={cx(styles.r_60fbb771, styles.r_e3a0584f, styles.r_7e0b7cdf, styles.r_8dddea07, styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_ceb69a6b, styles.r_a5c39c39, styles.r_ab1dd417)}>
      <Link href={item.url} className={styles.r_0214b4b3}>
        <div className={cx(styles.r_d89972fe, styles.r_726bdf47, styles.r_7ebecbb6)}>
          <Image
            src={item.cover}
            alt={item.title}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className={styles.r_7d85d0c2}
            unoptimized />

          <span className={cx(styles.r_da4dbfbc, styles.r_d83be576, styles.r_9a2db8f9, styles.r_07389a77, styles.r_5d253a80, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395, styles.r_72a4c7cd)}>
            拍卖
          </span>
        </div>
      </Link>
      <div className={cx(styles.r_60fbb771, styles.r_fb7302e5, styles.r_36e579c0, styles.r_8dddea07, styles.r_77a2a20e, styles.r_eb6e8b88)}>
        <Link
          href={item.url}
          className={cx(styles.r_054cb4e3, styles.r_bb37cef0, styles.r_cff55289, styles.r_e83a7042, styles.r_7054e276, styles.r_399e11a5, styles.r_ceb69a6b, styles.r_9825203a)}>

          {item.title}
        </Link>

        {item.seller &&
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2, styles.r_7b89cd85)}>
            <Link
            href={`/user/${item.seller.id}?tab=products`}
            className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_ceb69a6b, styles.r_9825203a)}>

              <UserAvatar
                src={item.seller.avatar || '/default-avatar.svg'}
                alt={item.seller.name}
                size={28}
                ring={false}
                pendant={item.seller.equip?.pendant ?? null}
              />
              <span className={cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_f283ea9b, styles.r_2689f395, styles.r_399e11a5)}>{item.seller.name}</span>
            </Link>
            <FollowSellerButton sellerId={item.seller.id} initialFollowed={!!item.seller.followed} />
          </div>
        }
        {item.description &&
        <p className={cx(styles.r_054cb4e3, styles.r_359090c2, styles.r_7054e276, styles.r_02eb621e)}>
            {stripHtml(item.description)}
          </p>
        }
        <div className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_595fceba)}>{formatPrice(item.price)}</div>
        {item.tags && item.tags.length > 0 &&
        <div className={cx(styles.r_60fbb771, styles.r_662364b2, styles.r_1eb5c6df, styles.r_44ee8ba0, styles.r_2cd02d11)}>
            {item.tags.slice(0, 4).map((tag) =>
          <span key={tag} className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_5f6a59f1)}>
                #{tag}
              </span>
          )}
          </div>
        }
        <div className={cx(styles.r_9953408a, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_b950dda2, styles.r_88b684d2, styles.r_f46b61a9, styles.r_d058ca6d, styles.r_7b89cd85)}>
          <span>{item.endAt ? fmtDate(item.endAt) : formatDateTime(item.createdAt)}</span>
          <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="message" size={12} />
            {item.comments ?? 0}
          </span>
        </div>
      </div>
    </article>);

}
// ============================================================
// 工具函数
// ============================================================
function stripHtml(html: string): string {
  // 去掉 HTML 标签，保留纯文本
  return html.replace(/<[^>]*>/g, '').trim();
}

function soldOverlayLabel(item: ListingItem) {
  if (item.type === 'auction') return '';
  if (item.status === 'trading' || item.listingStatus === 'trading') return '交易中';
  if (item.status === 'sold_out' || item.listingStatus === 'sold_out' || item.stock === 0) return '已售罄';
  return '';
}

function SoldCardOverlay({ label }: {label: string;}) {
  return (
    <div className={styles.soldCardOverlay} aria-hidden>
      <span className={styles.soldCardText}>{label}</span>
    </div>);
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
  const selected = modes?.length ? modes : fallback ? [fallback] : [];
  const normalized = selected.map((mode) => mode === 'platform_escrow' ? 'online_payment' : mode);
  const allowed: TradeMode[] = ['online_payment', 'external'];
  const result = normalized.filter((mode) => allowed.includes(mode));
  return Array.from(new Set(['online_payment' as TradeMode, ...result]));
}

function tradeModeLabel(mode: TradeMode): string {
  if (mode === 'platform_escrow' || mode === 'online_payment') return '平台担保交易';
  return '自行联系';
}

function FollowSellerButton({ sellerId, initialFollowed }: {sellerId: string;initialFollowed: boolean;}) {
  const { user } = useAuth();
  const [followed, setFollowed] = useState(initialFollowed);
  const [busy, setBusy] = useState(false);

  if (user?.id === sellerId) return null;

  const toggleFollow = async () => {
    setBusy(true);
    try {
      const res = await api.post<{followed: boolean;}>(`/api/users/${sellerId}/follow`);
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
      className={cn(cx(styles.r_ac204c10, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_2689f395, styles.r_ceb69a6b),

      followed ? cx(styles.r_f2b23104, styles.r_5f6a59f1, styles.r_d8a68f7c) : cx(styles.r_6bceb016, styles.r_72a4c7cd, styles.r_e269e58c),


      busy && styles.r_f2868c22
      )}>

      {followed ? '已关注' : '关注'}
    </button>);

}

function ProductCollectButton({
  listingId,
  itemId,
  initialCollected




}: {listingId: string;itemId: string;initialCollected: boolean;}) {
  const [collected, setCollected] = useState(initialCollected);
  const [busy, setBusy] = useState(false);

  const toggleCollect = async () => {
    setBusy(true);
    try {
      const res = await api.post<{collected: boolean;}>(
        `/api/market/listings/${listingId}/items/${itemId}/collect`
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
      className={cn(cx(styles.r_da4dbfbc, styles.r_7b2d6393, styles.r_9a2db8f9, styles.r_236812d6, styles.r_f3c543ad, styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_67d66567, styles.r_ac204c10, styles.r_6c21de57, styles.r_438b2237, styles.r_ceb69a6b, styles.r_29687528),

      collected ? styles.r_595fceba : cx(styles.r_5f6a59f1, styles.r_744ff542),
      busy && styles.r_f2868c22
      )}
      aria-label={collected ? '取消收藏商品' : '收藏商品'}
      title={collected ? '取消收藏商品' : '收藏商品'}>

      <Icon name="heart" size={15} fill={collected ? 'currentColor' : 'none'} />
    </button>);

}

function FilterRow({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_77a2a20e)}>
      <span className={cx(styles.r_b6b02c0e, styles.r_e7e37107, styles.r_012fbd12, styles.r_359090c2, styles.r_6c4cc49e)}>{label}</span>
      <div className={cx(styles.r_60fbb771, styles.r_36e579c0, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e)}>{children}</div>
    </div>);

}

function Chip({ children, active, onClick }: {children: React.ReactNode;active?: boolean;onClick?: () => void;}) {
  return (
    <button type="button" onClick={onClick}
    className={cn(cx(styles.r_52083e7d, styles.r_d0a52b31, styles.r_3960ffc2, styles.r_421ac2be, styles.r_0b91436d, styles.r_359090c2, styles.r_ceb69a6b),

    active ? cx(styles.r_f2b23104, styles.r_2689f395, styles.r_5f6a59f1) : cx(styles.r_b85c981b, styles.r_5756b7b4, styles.r_9825203a)
    )}>
      {children}
    </button>);

}
