'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type ReactNode, type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { UserName } from '@/components/ui/UserName';
import { Tooltip } from '@/components/ui/Tooltip';
import { registerPhotoSwipeGalleryUi } from '@/lib/photoswipe-ui';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { hasPermission, type Permission } from '@/lib/levels';
import { cn, formatPrice } from '@/lib/utils';
import {
  AddressPicker,
  type AddressPickerValue,
  pickerValueToOrderBody,
  validateAddressPicker,
} from '@/components/address/AddressPicker';

export interface MarketListingDetail {
  id: string;
  title: string;
  category: string;
  shipFrom: string;
  tags: string[];
  description: string;
  tradeMode: 'platform_escrow' | 'online_payment' | 'external';
  tradeModes: Array<'platform_escrow' | 'online_payment' | 'external'>;
  externalUrl?: string;
  contactNote?: string;
  cover: string;
  minPrice: number;
  maxPrice: number;
  itemCount: number;
  viewCount: number;
  commentCount: number;
  status: 'on_sale' | 'sold_out' | 'off_shelf' | 'pending_review';
  createdAt: string;
  seller: {
    id: string;
    name: string;
    avatar: string;
    bio?: string;
    level?: number;
    exp?: number;
    joinedAt?: string;
    role?: string;
    vipExpireAt?: string;
    vipLifetime?: boolean;
    badges?: unknown[];
    postsCount?: number;
    followersCount?: number;
    followingCount?: number;
  };
  genus?: { slug: string; name: string; cover?: string | null };
  species?: { slug: string; name: string };
  taxons: {
    categorySlug: string;
    genusSlug?: string | null;
    speciesSlug?: string | null;
    label: string;
  }[];
  items: MarketListingItem[];
  comments: MarketListingComment[];
}

type TradeMode = MarketListingDetail['tradeMode'];

interface MarketListingItem {
  id: string;
  title: string;
  price: number;
  stock: number;
  soldCount: number;
  cover: string;
  images: string[];
  description: string;
  status: 'on_sale' | 'sold_out' | 'off_shelf';
}

interface MarketListingComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    level?: number;
    role?: string;
    vipExpireAt?: string;
    vipLifetime?: boolean;
    badges?: unknown[];
    postsCount?: number;
    followersCount?: number;
    followingCount?: number;
  };
}

export function ListingDetailClient({ listing }: { listing: MarketListingDetail }) {
  const router = useRouter();
  const { user, vip } = useAuth();
  const [activeItem, setActiveItem] = useState<MarketListingItem | null>(null);
  const [qty, setQty] = useState(1);
  const [addr, setAddr] = useState<AddressPickerValue>(null);
  const availableTradeModes = useMemo(
    () => normalizeTradeModes(listing.tradeModes, listing.tradeMode),
    [listing.tradeModes, listing.tradeMode],
  );
  const onlineTradeModes = useMemo(
    () => availableTradeModes.filter((mode) => mode !== 'external'),
    [availableTradeModes],
  );
  const [selectedTradeMode, setSelectedTradeMode] = useState<TradeMode>(
    onlineTradeModes[0] ?? availableTradeModes[0],
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [comments, setComments] = useState<MarketListingComment[]>(listing.comments);
  const [commentCount, setCommentCount] = useState(listing.commentCount);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const isMine = user?.id === listing.seller.id;
  const canBuy = hasPermission(
    user
      ? {
          level: user.level,
          isVip: vip.isVip,
          grantedPermissions: user.grantedPermissions as Permission[] | undefined,
          revokedPermissions: user.revokedPermissions as Permission[] | undefined,
        }
      : null,
    'market:buy',
  );

  const openBuy = (item: MarketListingItem) => {
    setErr(null);
    setQty(1);
    setAddr(null);
    setSelectedTradeMode(onlineTradeModes[0] ?? availableTradeModes[0]);
    setActiveItem(item);
  };

  const submit = async () => {
    if (!activeItem) return;
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/market/${listing.id}`));
      return;
    }
    setErr(null);
    const validErr = validateAddressPicker(addr);
    if (validErr) {
      setErr(validErr);
      return;
    }

    setSubmitting(true);
    try {
      const r = await api.post<{ orderId: string }>(
        `/api/market/listings/${listing.id}/items/${activeItem.id}/buy`,
        {
          quantity: qty,
          tradeMode: selectedTradeMode,
          ...pickerValueToOrderBody(addr),
        },
      );
      router.push(`/checkout/${r.orderId}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '提交订单失败');
    } finally {
      setSubmitting(false);
    }
  };

  const submitComment = async () => {
    const content = commentText.trim();
    if (!content) return;
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/market/${listing.id}#comments`));
      return;
    }
    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const comment = await api.post<MarketListingComment>(`/api/market/listings/${listing.id}/comments`, {
        content,
      });
      setComments((list) => [...list, comment]);
      setCommentCount((count) => count + 1);
      setCommentText('');
    } catch (error) {
      setCommentError(error instanceof ApiError ? error.message : '评论失败');
    } finally {
      setCommentSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        {listing.items.map((item) => {
          const soldOut = listing.status !== 'on_sale' || item.status !== 'on_sale' || item.stock <= 0;
          const images = item.images.length ? item.images : [item.cover];
          const canOrderOnline = onlineTradeModes.length > 0;
          const hasExternal = availableTradeModes.includes('external');

          return (
            <article key={item.id} className="rounded-xl border border-leaf-100 bg-white p-5 md:p-6">
              <ProductImageMasonry images={images} title={item.title}>
                {(thumbnailStrip) => (
                <div className="flex h-full min-w-0 flex-col">
                  <div>
                    <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-ink-800">{item.title}</h3>
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50/70 px-3 py-2">
                      <div className="shrink-0 text-[11px] text-rose-700/70">价格</div>
                      <div className="min-w-0 text-xl font-bold tracking-tight text-rose-600">
                        {formatPrice(item.price)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <ProductStat label="库存" value={item.stock} />
                    <ProductStat label="已售" value={item.soldCount} />
                    <ProductStat label="在线方式" value={availableTradeModes.map(tradeModeLabel).join(' / ')} />
                  </div>
                  {thumbnailStrip}

                  <div className="mt-2 rounded-lg border border-leaf-100 bg-leaf-50/40 p-2.5 md:flex-1">
                    <div className="mb-1 text-xs font-medium text-leaf-700">商品说明</div>
                    <Tooltip content={item.description} className="max-w-[420px]">
                      <div className="line-clamp-2 text-xs leading-5 text-ink-700">
                        {item.description}
                      </div>
                    </Tooltip>
                  </div>

                  <div className="pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {!canOrderOnline ? (
                      <>
                        <Link
                          href={`/messages?to=${listing.seller.id}`}
                          className="btn-primary !px-4 !py-1.5 !text-sm"
                        >
                          私信卖家
                        </Link>
                        {listing.externalUrl && (
                          <Link
                            href={listing.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-outline !px-4 !py-1.5 !text-sm"
                          >
                            打开三方链接
                          </Link>
                        )}
                      </>
                    ) : hasExternal ? (
                      <>
                        {soldOut ? (
                          <button disabled className="btn bg-leaf-100 !px-4 !py-1.5 !text-sm text-leaf-600">
                            已售罄
                          </button>
                        ) : isMine ? (
                          <button disabled className="btn bg-leaf-100 !px-4 !py-1.5 !text-sm text-leaf-600">
                            自己的商品
                          </button>
                        ) : !user ? (
                          <Link
                            href={`/login?redirect=${encodeURIComponent(`/market/${listing.id}`)}`}
                            className="btn-primary !px-4 !py-1.5 !text-sm"
                          >
                            登录购买
                          </Link>
                        ) : !canBuy ? (
                          <Link href="/vip" className="btn-outline !px-4 !py-1.5 !text-sm">
                            Lv.5 或会员可购买
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openBuy(item)}
                            className="btn-primary !px-5 !py-1.5 !text-sm"
                          >
                            立即购买
                          </button>
                        )}
                        <Link
                          href={`/messages?to=${listing.seller.id}`}
                          className="btn-outline !px-4 !py-1.5 !text-sm"
                        >
                          私信卖家
                        </Link>
                        {listing.externalUrl && (
                          <Link
                            href={listing.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-outline !px-4 !py-1.5 !text-sm"
                          >
                            打开三方链接
                          </Link>
                        )}
                      </>
                    ) : soldOut ? (
                      <button disabled className="btn bg-leaf-100 !px-4 !py-1.5 !text-sm text-leaf-600">
                        已售罄
                      </button>
                    ) : isMine ? (
                      <button disabled className="btn bg-leaf-100 !px-4 !py-1.5 !text-sm text-leaf-600">
                        自己的商品
                      </button>
                    ) : !user ? (
                      <Link
                        href={`/login?redirect=${encodeURIComponent(`/market/${listing.id}`)}`}
                        className="btn-primary !px-4 !py-1.5 !text-sm"
                      >
                        登录购买
                      </Link>
                    ) : !canBuy ? (
                      <Link href="/vip" className="btn-outline !px-4 !py-1.5 !text-sm">
                        Lv.5 或会员可购买
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openBuy(item)}
                        className="btn-primary !px-5 !py-1.5 !text-sm"
                      >
                        立即购买
                      </button>
                      )}
                    </div>
                  </div>
                </div>
                )}
              </ProductImageMasonry>
            </article>
          );
        })}
      </div>

      <section id="comments" className="mt-4 rounded-xl border border-leaf-100 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink-800">评论</h2>
          <div className="flex items-center gap-1 text-xs text-leaf-700/70">
            <Icon name="message" size={14} />
            {commentCount}
          </div>
        </div>

        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="rounded-lg bg-leaf-50/60 px-3 py-4 text-center text-sm text-leaf-700/70">
              还没有评论
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 border-b border-leaf-100 pb-3 last:border-0 last:pb-0">
                <Avatar src={comment.author.avatar} alt={comment.author.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <UserName user={comment.author} size="xs" />
                    <span className="text-[11px] text-leaf-700/60">{formatDateTime(comment.createdAt)}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-700">{comment.content}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 border-t border-leaf-100 pt-3">
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            className="input min-h-[88px] w-full resize-y py-2"
            maxLength={1000}
            placeholder={user ? '写下你的评论' : '登录后评论'}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-leaf-700/60">{commentText.length}/1000</span>
            <button
              type="button"
              onClick={submitComment}
              disabled={commentSubmitting || !commentText.trim()}
              className={cn('btn-primary !px-4 !py-1.5 !text-xs', commentSubmitting && 'opacity-60')}
            >
              {commentSubmitting ? '提交中...' : '发布评论'}
            </button>
          </div>
          {commentError && <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{commentError}</div>}
        </div>
      </section>

      {activeItem && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4"
          onClick={() => !submitting && setActiveItem(null)}
        >
          <div
            className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold">确认订单</h3>
                <p className="line-clamp-1 text-xs text-leaf-700/70">{activeItem.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="text-leaf-600 hover:text-leaf-800"
                aria-label="关闭"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {onlineTradeModes.length > 1 && (
                <div>
                  <label className="mb-1 block text-xs text-leaf-700/80">交易方式</label>
                  <div className="grid grid-cols-2 gap-2">
                    {onlineTradeModes.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSelectedTradeMode(mode)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                          selectedTradeMode === mode
                            ? 'border-leaf-500 bg-leaf-50 font-medium text-leaf-700 ring-2 ring-leaf-100'
                            : 'border-leaf-100 bg-white text-ink-700 hover:border-leaf-300',
                        )}
                      >
                        <span className="block">{tradeModeLabel(mode)}</span>
                        <span className="mt-0.5 block text-[11px] font-normal text-leaf-700/70">
                          {tradeModeHint(mode)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs text-leaf-700/80">数量</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty((n) => Math.max(1, n - 1))}
                    className="btn-outline !px-3 !py-1"
                    disabled={qty <= 1}
                  >
                    -
                  </button>
                  <input
                    className="input w-16 text-center"
                    type="number"
                    value={qty}
                    onChange={(e) =>
                      setQty(Math.max(1, Math.min(activeItem.stock, Number(e.target.value) || 1)))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setQty((n) => Math.min(activeItem.stock, n + 1))}
                    className="btn-outline !px-3 !py-1"
                    disabled={qty >= activeItem.stock}
                  >
                    +
                  </button>
                  <span className="ml-2 text-xs text-leaf-700/70">库存 {activeItem.stock}</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-leaf-700/80">收货地址</label>
                <AddressPicker value={addr} onChange={setAddr} />
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-leaf-50 p-3 text-xs leading-5 text-leaf-700">
              <div className="flex justify-between">
                <span>商品金额</span>
                <span className="font-semibold text-ink-800">{formatPrice(activeItem.price * qty)}</span>
              </div>
              {selectedTradeMode === 'online_payment' && (
                <div className="flex justify-between">
                  <span>平台手续费</span>
                  <span>卖家承担 1%</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-leaf-100 pt-3">
              <div className="text-sm font-bold text-rose-600">
                合计 {formatPrice(activeItem.price * qty)}
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className={cn('btn-primary !px-4', submitting && 'opacity-60')}
              >
                {submitting ? '提交中...' : '提交订单'}
              </button>
            </div>

            {err && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>}
          </div>
        </div>
      )}
    </>
  );
}

function normalizeTradeModes(modes: TradeMode[] | undefined, fallback: TradeMode): TradeMode[] {
  const allowed: TradeMode[] = ['platform_escrow', 'online_payment', 'external'];
  const selected = modes?.length ? modes : [fallback];
  const result = Array.from(new Set(selected.filter((mode) => allowed.includes(mode))));
  return result.length ? result : [fallback];
}

function tradeModeHint(mode: TradeMode) {
  if (mode === 'platform_escrow') return '平台担保交易';
  if (mode === 'online_payment') return '支付宝在线支付，手续费 1%';
  return '自行联系，请确认交易风险';
}

function tradeModeLabel(mode: TradeMode) {
  if (mode === 'platform_escrow') return '平台担保';
  if (mode === 'online_payment') return '在线支付';
  return '自行联系';
}

type ProductImageMasonryChildren = ReactNode | ((thumbnailStrip: ReactNode) => ReactNode);

function ProductImageMasonry({
  images,
  title,
  children,
}: {
  images: string[];
  title: string;
  children: ProductImageMasonryChildren;
}) {
  const safeImages = images.length ? images : [];
  const [active, setActive] = useState(0);
  const [imageSizes, setImageSizes] = useState<Record<string, { width: number; height: number }>>({});
  const pswpRef = useRef<PhotoSwipe | null>(null);
  const current = safeImages[active] || safeImages[0];
  const total = safeImages.length;
  const handleImageLoad = useCallback((src: string, event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImageSizes((prev) => ({
        ...prev,
        [src]: { width: img.naturalWidth, height: img.naturalHeight },
      }));
    }
  }, []);
  const slides = useMemo(
    () =>
      safeImages.map((src) => {
        const size = imageSizes[src] || { width: 1600, height: 1066 };
        return {
          src,
          msrc: src,
          thumbnail: src,
          width: size.width,
          height: size.height,
        };
      }),
    [imageSizes, safeImages],
  );

  const openPreview = useCallback(
    (index: number) => {
      pswpRef.current?.destroy();
      pswpRef.current = new PhotoSwipe({
        dataSource: slides,
        index,
        showHideAnimationType: 'fade',
        imageClickAction: false,
        tapAction: false,
        doubleTapAction: false,
        zoom: false,
        closeOnVerticalDrag: false,
      } as any);
      registerPhotoSwipeGalleryUi(pswpRef.current);
      pswpRef.current.init();
    },
    [slides],
  );
  const switchImage = useCallback((direction: 1 | -1) => {
    if (total <= 1) return;
    setActive((index) => (index + direction + total) % total);
  }, [total]);

  useEffect(() => {
    return () => {
      pswpRef.current?.destroy();
    };
  }, []);

  if (!current) return null;

  const thumbnailStrip =
    safeImages.length > 1 ? (
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {safeImages.map((src, index) => (
          <button
            key={`${src}-${index}`}
            type="button"
            onClick={() => setActive(index)}
            className={cn(
              'relative aspect-square w-full overflow-hidden rounded-lg border bg-leaf-50 transition-all',
              active === index
                ? 'border-leaf-600 opacity-100 ring-2 ring-leaf-500/20'
                : 'border-leaf-100 opacity-70 hover:border-leaf-300 hover:opacity-100',
            )}
            aria-label={`Preview image ${index + 1}`}
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              unoptimized
              onLoad={(event) => handleImageLoad(src, event)}
            />
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className="grid gap-4 md:grid-cols-[380px_minmax(0,1fr)] md:items-stretch md:gap-5">
      <div className="w-full rounded-xl bg-white md:h-[380px] md:w-[380px]">
        <button
          type="button"
          onClick={() => openPreview(active)}
          className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-lg bg-leaf-50 text-left md:h-[380px] md:w-[380px]"
          aria-label="Preview product image"
        >
          <Image
            key={current}
            src={current}
            alt={active === 0 ? title : `${title} ${active + 1}`}
            fill
            className="object-cover"
            unoptimized
            onLoad={(event) => handleImageLoad(current, event)}
          />
          {total > 1 && (
            <>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  switchImage(-1);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    switchImage(-1);
                  }
                }}
                className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-ink-900/45 text-white opacity-100 shadow-sm transition-all hover:bg-ink-900/65 md:opacity-0 md:group-hover:opacity-100"
                aria-label="上一张"
              >
                <Icon name="arrow-right" size={18} className="rotate-180" />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  switchImage(1);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    switchImage(1);
                  }
                }}
                className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-ink-900/45 text-white opacity-100 shadow-sm transition-all hover:bg-ink-900/65 md:opacity-0 md:group-hover:opacity-100"
                aria-label="下一张"
              >
                <Icon name="arrow-right" size={18} />
              </span>
            </>
          )}
          {total > 1 && (
            <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-ink-900/55 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white">
              <span>{active + 1}</span>
              <span className="mx-px">/</span>
              <span>{total}</span>
            </div>
          )}
        </button>

      </div>

      {typeof children === 'function' ? children(thumbnailStrip) : children}

      {false && (
        <div className="hidden" aria-hidden="true">
          {safeImages.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                'relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-white/40 transition-all',
                active === index
                  ? 'border-white opacity-100 shadow-sm ring-2 ring-leaf-500/25'
                  : 'border-white/60 opacity-75 hover:border-white hover:opacity-100',
              )}
              aria-label={`查看第 ${index + 1} 张商品图`}
            >
              <Image src={src} alt="" fill className="object-cover" unoptimized />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/15 to-transparent" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function ProductStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex min-w-fit items-center gap-1.5 rounded-lg border border-leaf-100 bg-white px-2.5 py-1.5">
      <div className="shrink-0 text-[11px] text-leaf-700/70">{label}</div>
      <div className="max-w-[220px] truncate text-xs font-semibold text-ink-800">{value}</div>
    </div>
  );
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
