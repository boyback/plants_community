'use client';

import Image from 'next/image';
import { type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhotoSwipe from 'photoswipe';
import { Icon } from '@/components/ui/Icon';
import { UserIdentity } from '@/components/ui/UserIdentity';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { FloatingActionRail } from '@/components/ui/FloatingActionRail';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { AddressPicker, type AddressPickerValue, pickerValueToOrderBody, validateAddressPicker } from '@/components/address/AddressPicker';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';
import { hasPermission, type Permission } from '@/lib/levels';
import { registerPhotoSwipeGalleryUi } from '@/lib/photoswipe-ui';
import type { EquipState } from '@/lib/types';
import { cn, formatPrice } from '@/lib/utils';
import styles from './ListingDetailClient.module.scss';

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
  canViewExternalContact?: boolean;
  cover: string;
  minPrice: number;
  maxPrice: number;
  itemCount: number;
  viewCount: number;
  commentCount: number;
  status: 'on_sale' | 'trading' | 'sold_out' | 'off_shelf' | 'pending_review';
  createdAt: string;
  seller: {
    id: string;
    name: string;
    avatar: string;
    equipPendantId?: string | null;
    bio?: string;
    level?: number;
    exp?: number;
    joinedAt?: string;
    role?: string;
    equip?: EquipState;
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
  mainHeadSize?: string;
  overallSize?: string;
  potDiameter?: string;
  taxons?: {
    categorySlug: string;
    genusSlug?: string | null;
    speciesSlug?: string | null;
    label?: string;
  }[];
  tags?: string[];
  cover: string;
  images: string[];
  description: string;
  status: 'on_sale' | 'trading' | 'sold_out' | 'off_shelf';
}

interface MarketListingComment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string;
    equipPendantId?: string | null;
    level?: number;
    role?: string;
    equip?: EquipState;
    badges?: unknown[];
    postsCount?: number;
    followersCount?: number;
    followingCount?: number;
  };
}

export function ListingDetailClient({ listing }: { listing: MarketListingDetail }) {
  const router = useRouter();
  const { user } = useAuth();
  const [activeItem, setActiveItem] = useState<MarketListingItem | null>(null);
  const [qty, setQty] = useState(1);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [addr, setAddr] = useState<AddressPickerValue>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const availableTradeModes = useMemo(
    () => normalizeTradeModes(listing.tradeModes, listing.tradeMode),
    [listing.tradeModes, listing.tradeMode]
  );
  const onlineTradeModes = useMemo(
    () => availableTradeModes.filter((mode) => mode !== 'external'),
    [availableTradeModes]
  );
  const [selectedTradeMode, setSelectedTradeMode] = useState<TradeMode>(
    onlineTradeModes[0] ?? availableTradeModes[0]
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isMine = user?.id === listing.seller.id;
  const canBuy = hasPermission(
    user
      ? {
          level: user.level,
          grantedPermissions: user.grantedPermissions as Permission[] | undefined,
          revokedPermissions: user.revokedPermissions as Permission[] | undefined
        }
      : null,
    'market:buy'
  );

  const privateMessageSeller = useCallback(() => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/market/${listing.id}`));
      return;
    }
    router.push(`/messages?to=${listing.seller.id}&listing=${listing.id}`);
  }, [listing.id, listing.seller.id, router, user]);

  const copyListingLink = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : `/market/${listing.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('链接已复制');
    } catch {
      toast.error('复制失败，请手动复制地址栏链接');
    }
  }, [listing.id]);

  const railItems = useMemo(
    () => [
      { icon: 'alert' as const, label: '举报交易信息', onClick: () => setShowReportDialog(true) },
      { icon: 'message' as const, label: '私信卖家', onClick: privateMessageSeller, disabled: isMine },
      { icon: 'share' as const, label: '复制链接', onClick: copyListingLink },
    ],
    [copyListingLink, isMine, privateMessageSeller]
  );

  const clampQuantity = useCallback((stock: number, value: number) => {
    const max = Math.max(1, stock);
    return Math.max(1, Math.min(max, Number.isFinite(value) ? value : 1));
  }, []);

  const updateItemQuantity = useCallback(
    (item: MarketListingItem, value: number) => {
      setItemQuantities((current) => ({
        ...current,
        [item.id]: clampQuantity(item.stock, value)
      }));
    },
    [clampQuantity]
  );

  const openBuy = (item: MarketListingItem, quantity = 1) => {
    setErr(null);
    setQty(clampQuantity(item.stock, quantity));
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
          ...pickerValueToOrderBody(addr)
        }
      );
      router.push(`/checkout/${r.orderId}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '提交订单失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <FloatingActionRail items={railItems} contentMaxWidth={1280} />

      <div className={styles.productStack}>
        {listing.items.map((item) => {
          const unavailable = listing.status !== 'on_sale' || item.status !== 'on_sale' || item.stock <= 0;
          const trading = listing.status === 'trading' || item.status === 'trading';
          const images = item.images.length ? item.images : [item.cover];
          const canOrderOnline = onlineTradeModes.length > 0;
          const itemQuantity = clampQuantity(item.stock, itemQuantities[item.id] ?? 1);
          const detailText = uniqueTextBlocks([item.description, listing.description]).join('\n\n').trim();
          const hasDetail = Boolean(detailText);
          const labels = [
            ...(item.taxons ?? []).map((taxon) => taxon.label || [taxon.categorySlug, taxon.genusSlug, taxon.speciesSlug].filter(Boolean).join(' / ')),
            ...(item.tags ?? []).map((tag) => `#${tag}`)
          ].filter(Boolean);

          return (
            <Card key={item.id} padding="none" className={styles.productCard}>
              <header className={styles.productHeader}>
                <div className={styles.titleBlock}>
                  <p className={styles.eyebrow}>{listing.title !== item.title ? listing.title : listing.category}</p>
                  <h1 className={styles.productTitle}>{item.title}</h1>
                </div>
                <nav className={styles.productTabs} aria-label="商品详情导航">
                  <a className={styles.activeTab} href={`#product-info-${item.id}`}>商品信息</a>
                  {hasDetail && <a href={`#product-detail-${item.id}`}>商品详情</a>}
                  <a href="#comments">评论 {listing.commentCount}</a>
                </nav>
              </header>

              <div id={`product-info-${item.id}`} className={styles.productLayout}>
                <ProductImageGallery images={images} title={item.title} />

                <aside className={styles.purchasePanel} aria-label="商品购买信息">
                  <div className={styles.priceBlock}>
                    <span>价格</span>
                    <strong>{formatPrice(item.price)}</strong>
                  </div>

                  {labels.length > 0 && (
                    <div className={styles.labelCloud}>
                      {labels.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                  )}

                  <div className={styles.infoRows}>
                    <InfoRow label="库存" value={item.stock} />
                    <InfoRow label="已售" value={item.soldCount} />
                    {listing.shipFrom && <InfoRow label="发货地" value={listing.shipFrom} />}
                    {item.mainHeadSize && <InfoRow label="主头" value={item.mainHeadSize} />}
                    {item.overallSize && <InfoRow label="整体" value={item.overallSize} />}
                    {item.potDiameter && <InfoRow label="盆径" value={item.potDiameter} />}
                    <InfoRow label="交易方式" value={availableTradeModes.map(tradeModeLabel).join(' / ')} />
                  </div>

                  {!unavailable && canOrderOnline && !isMine && user && canBuy && (
                    <div className={styles.quantityPanel}>
                      <span className={styles.panelLabel}>数量</span>
                      <QuantityControl
                        value={itemQuantity}
                        max={Math.max(1, item.stock)}
                        onChange={(next) => updateItemQuantity(item, next)}
                      />
                    </div>
                  )}

                  <div className={styles.actionRow}>
                    {!canOrderOnline ? (
                      <Button disabled variant="muted" fullWidth>
                        下单后可在支付页查看站外信息
                      </Button>
                    ) : (
                      <BuyAction
                        soldOut={unavailable}
                        trading={trading}
                        isMine={isMine}
                        userId={user?.id}
                        canBuy={canBuy}
                        listingId={listing.id}
                        onBuy={() => openBuy(item, itemQuantity)}
                      />
                    )}
                  </div>
                </aside>
              </div>

              {hasDetail && (
                <section id={`product-detail-${item.id}`} className={styles.detailSection}>
                  <h2>商品详情</h2>
                  {detailText && <p>{detailText}</p>}
                </section>
              )}
            </Card>
          );
        })}
      </div>

      {activeItem && (
        <Dialog
          open={Boolean(activeItem)}
          onClose={() => {
            if (!submitting) setActiveItem(null);
          }}
          title="确认订单"
          maxWidth="lg"
        >
          <p className={styles.orderIntro}>{activeItem.title}</p>

          <div className={styles.orderForm}>
            {onlineTradeModes.length > 1 && (
              <div>
                <label className={styles.fieldLabel}>交易方式</label>
                <div className={styles.tradeChoiceGrid}>
                  {onlineTradeModes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSelectedTradeMode(mode)}
                      className={cn(styles.tradeOption, selectedTradeMode === mode && styles.tradeOptionActive)}
                    >
                      <span>{tradeModeLabel(mode)}</span>
                      <small>{tradeModeHint(mode)}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className={styles.fieldLabel}>数量</label>
              <div className={styles.dialogQuantity}>
                <QuantityControl
                  value={qty}
                  max={Math.max(1, activeItem.stock)}
                  onChange={(next) => setQty(clampQuantity(activeItem.stock, next))}
                />
                <span>库存 {activeItem.stock}</span>
              </div>
            </div>

            <div>
              <label className={styles.fieldLabel}>收货地址</label>
              <AddressPicker value={addr} onChange={setAddr} />
            </div>
          </div>

          <Card muted padding="compact" className={styles.orderSummary}>
            <div>
              <span>商品金额</span>
              <strong>{formatPrice(activeItem.price * qty)}</strong>
            </div>
            {selectedTradeMode !== 'external' && (
              <div>
                <span>平台手续费</span>
                <span>卖家承担 1%</span>
              </div>
            )}
          </Card>

          <div className={styles.orderFooter}>
            <div>合计 {formatPrice(activeItem.price * qty)}</div>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? '提交中...' : '提交订单'}
            </Button>
          </div>

          {err && <div className={styles.errorBox}>{err}</div>}
        </Dialog>
      )}

      <Dialog
        open={showReportDialog}
        onClose={() => {
          if (!reportSubmitting) setShowReportDialog(false);
        }}
        title="举报交易信息"
        maxWidth="sm"
      >
        <Textarea
          value={reportText}
          onChange={(event) => {
            setReportText(event.target.value.slice(0, 1000));
            setReportError(null);
          }}
          rows={5}
          maxLength={1000}
          placeholder="请说明你发现的问题，例如虚假信息、诱导站外付款、冒充平台担保等"
        />
        <div className={styles.orderFooter}>
          <span>{reportText.length} / 1000</span>
          <Button
            type="button"
            disabled={reportSubmitting || reportText.trim().length < 5}
            onClick={async () => {
              if (reportText.trim().length < 5) {
                setReportError('请至少填写 5 个字');
                return;
              }
              setReportSubmitting(true);
              setReportError(null);
              try {
                await api.post('/api/feedback', {
                  category: 'content',
                  content: [
                    `举报交易信息：${listing.title}`,
                    `商品ID：${listing.id}`,
                    `卖家：${listing.seller.name} (${listing.seller.id})`,
                    '',
                    reportText.trim(),
                  ].join('\n'),
                });
                setReportText('');
                setShowReportDialog(false);
                toast.success('举报已提交');
              } catch (error) {
                setReportError(error instanceof ApiError ? error.message : '提交失败，请稍后再试');
              } finally {
                setReportSubmitting(false);
              }
            }}
          >
            {reportSubmitting ? '提交中...' : '提交举报'}
          </Button>
        </div>
        {reportError && <div className={styles.errorBox}>{reportError}</div>}
      </Dialog>
    </>
  );
}

export function MarketListingComments({ listing }: { listing: MarketListingDetail }) {
  const router = useRouter();
  const { user } = useAuth();
  const [comments, setComments] = useState<MarketListingComment[]>(listing.comments);
  const [commentCount, setCommentCount] = useState(listing.commentCount);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

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
        content
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
    <Card id="comments" className={styles.commentsCard}>
      <div className={styles.commentsHeader}>
        <h2>评论</h2>
        <div>
          <Icon name="message" size={14} />
          {commentCount}
        </div>
      </div>

      <div className={styles.commentList}>
        {comments.length === 0 ? (
          <div className={styles.emptyComments}>还没有评论</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={styles.commentItem}>
              <UserIdentity user={comment.author} size="sm" asLink={false} showName={false} />
              <div className={styles.commentBody}>
                <div className={styles.commentMeta}>
                  <UserIdentity user={comment.author} size="xs" showAvatar={false} />
                  <span>{formatDateTime(comment.createdAt)}</span>
                </div>
                <div className={styles.commentText}>{comment.content}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.commentComposer}>
        <Textarea
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          className={styles.commentTextarea}
          maxLength={1000}
          placeholder={user ? '写下你的评论' : '登录后评论'}
        />

        <div className={styles.commentActions}>
          <span>{commentText.length}/1000</span>
          <Button size="sm" onClick={submitComment} disabled={commentSubmitting || !commentText.trim()}>
            {commentSubmitting ? '提交中...' : '发布评论'}
          </Button>
        </div>
        {commentError && <div className={styles.errorBox}>{commentError}</div>}
      </div>
    </Card>
  );
}

function BuyAction({
  soldOut,
  trading,
  isMine,
  userId,
  canBuy,
  listingId,
  onBuy
}: {
  soldOut: boolean;
  trading: boolean;
  isMine: boolean;
  userId?: string;
  canBuy: boolean;
  listingId: string;
  onBuy: () => void;
}) {
  if (trading) {
    return (
      <Button disabled variant="muted" fullWidth>
        交易中
      </Button>
    );
  }
  if (soldOut) {
    return (
      <Button disabled variant="muted" fullWidth>
        已售罄
      </Button>
    );
  }
  if (isMine) {
    return (
      <Button disabled variant="muted" fullWidth>
        自己的商品
      </Button>
    );
  }
  if (!userId) {
    return (
      <ButtonLink href={`/login?redirect=${encodeURIComponent(`/market/${listingId}`)}`} variant="primary" fullWidth>
        登录购买
      </ButtonLink>
    );
  }
  if (!canBuy) {
    return (
      <Button disabled variant="muted" fullWidth>
        Lv.5 可购买
      </Button>
    );
  }
  return (
    <Button onClick={onBuy} fullWidth>
      立即购买
    </Button>
  );
}

function QuantityControl({
  value,
  max,
  onChange
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.quantityControl}>
      <Button variant="outline" size="sm" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="减少数量">
        -
      </Button>
      <Input
        className={styles.quantityInput}
        type="number"
        min={1}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 1)}
        aria-label="购买数量"
      />
      <Button variant="outline" size="sm" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="增加数量">
        +
      </Button>
    </div>
  );
}

function ProductImageGallery({ images, title }: { images: string[]; title: string }) {
  const safeImages = images.filter(Boolean);
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
        [src]: { width: img.naturalWidth, height: img.naturalHeight }
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
          height: size.height
        };
      }),
    [imageSizes, safeImages]
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
        closeOnVerticalDrag: false
      } as any);
      registerPhotoSwipeGalleryUi(pswpRef.current);
      pswpRef.current.init();
    },
    [slides]
  );

  const switchImage = useCallback(
    (direction: 1 | -1) => {
      if (total <= 1) return;
      setActive((index) => (index + direction + total) % total);
    },
    [total]
  );

  useEffect(() => {
    return () => {
      pswpRef.current?.destroy();
    };
  }, []);

  if (!current) return null;

  return (
    <div className={styles.gallery}>
      <div className={styles.galleryMain}>
        <button type="button" onClick={() => openPreview(active)} className={styles.mainImageButton} aria-label="预览商品图片">
          <Image
            key={current}
            src={current}
            alt={active === 0 ? title : `${title} ${active + 1}`}
            fill
            className={styles.galleryImage}
            unoptimized
            onLoad={(event) => handleImageLoad(current, event)}
          />
        </button>
        {total > 1 && (
          <>
            <button type="button" className={cn(styles.galleryArrow, styles.galleryArrowLeft)} onClick={() => switchImage(-1)} aria-label="上一张">
              <Icon name="arrow-right" size={18} />
            </button>
            <button type="button" className={cn(styles.galleryArrow, styles.galleryArrowRight)} onClick={() => switchImage(1)} aria-label="下一张">
              <Icon name="arrow-right" size={18} />
            </button>
            <div className={styles.imageCounter}>
              {active + 1}/{total}
            </div>
          </>
        )}
      </div>

      {total > 1 && (
        <div className={styles.thumbnailGrid}>
          {safeImages.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              className={cn(styles.thumbnailButton, active === index && styles.thumbnailActive)}
              aria-label={`查看第 ${index + 1} 张商品图`}
            >
              <Image src={src} alt="" fill className={styles.galleryImage} unoptimized onLoad={(event) => handleImageLoad(src, event)} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.infoRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function normalizeTradeModes(modes: TradeMode[] | undefined, fallback: TradeMode): TradeMode[] {
  const allowed: TradeMode[] = ['online_payment', 'external'];
  const selected = modes?.length ? modes : [fallback];
  const normalized = selected.map((mode) => mode === 'platform_escrow' ? 'online_payment' : mode);
  const result = Array.from(new Set(normalized.filter((mode) => allowed.includes(mode))));
  return Array.from(new Set(['online_payment' as TradeMode, ...result]));
}

function uniqueTextBlocks(blocks: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return blocks
    .map((block) => block?.trim())
    .filter((block): block is string => {
      if (!block || seen.has(block)) return false;
      seen.add(block);
      return true;
    });
}

function tradeModeHint(mode: TradeMode) {
  if (mode === 'online_payment' || mode === 'platform_escrow') return '支付宝在线付款，平台担保结算，手续费 1%';
  return '自行联系，请确认交易风险';
}

function tradeModeLabel(mode: TradeMode) {
  if (mode === 'online_payment' || mode === 'platform_escrow') return '平台担保交易';
  return '自行联系';
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
