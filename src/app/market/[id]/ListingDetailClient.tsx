'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type ReactNode, type SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PhotoSwipe from 'photoswipe';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { UserName } from '@/components/ui/UserName';
import { Tooltip } from '@/components/ui/Tooltip';
import { registerPhotoSwipeGalleryUi } from "@/lib/photoswipe-ui";
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from "@/lib/client-api";
import { hasPermission, type Permission } from '@/lib/levels';
import { cn, formatPrice } from '@/lib/utils';
import {
  AddressPicker,
  type AddressPickerValue,
  pickerValueToOrderBody,
  validateAddressPicker } from
'@/components/address/AddressPicker';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './ListingDetailClient.module.scss';
import { cx } from '@/lib/style-utils';



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
  genus?: {slug: string;name: string;cover?: string | null;};
  species?: {slug: string;name: string;};
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

export function ListingDetailClient({ listing }: {listing: MarketListingDetail;}) {
  const router = useRouter();
  const { user, vip } = useAuth();
  const [activeItem, setActiveItem] = useState<MarketListingItem | null>(null);
  const [qty, setQty] = useState(1);
  const [addr, setAddr] = useState<AddressPickerValue>(null);
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
  const [comments, setComments] = useState<MarketListingComment[]>(listing.comments);
  const [commentCount, setCommentCount] = useState(listing.commentCount);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  useBodyScrollLock(Boolean(activeItem));

  const isMine = user?.id === listing.seller.id;
  const canBuy = hasPermission(
    user ?
    {
      level: user.level,
      isVip: vip.isVip,
      grantedPermissions: user.grantedPermissions as Permission[] | undefined,
      revokedPermissions: user.revokedPermissions as Permission[] | undefined
    } :
    null,
    "market:buy"
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
      const r = await api.post<{orderId: string;}>(
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
    <>
      <div className={styles.r_3e7ce58d}>
        {listing.items.map((item) => {
          const soldOut = listing.status !== 'on_sale' || item.status !== 'on_sale' || item.stock <= 0;
          const images = item.images.length ? item.images : [item.cover];
          const canOrderOnline = onlineTradeModes.length > 0;
          const hasExternal = availableTradeModes.includes('external');

          return (
            <article key={item.id} className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_c07e54fd, styles.r_97effa3f)}>
              <ProductImageMasonry images={images} title={item.title}>
                {(thumbnailStrip) =>
                <div className={cx(styles.r_60fbb771, styles.r_668b21aa, styles.r_7e0b7cdf, styles.r_8dddea07)}>
                  <div>
                    <h3 className={cx(styles.r_054cb4e3, styles.r_42536e69, styles.r_e83a7042, styles.r_e25ca653, styles.r_399e11a5)}>{item.title}</h3>
                    <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_62afc924, styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                      <div className={cx(styles.r_012fbd12, styles.r_d058ca6d, styles.r_8595a2fa)}>价格</div>
                      <div className={cx(styles.r_7e0b7cdf, styles.r_d5c9b000, styles.r_69450ef1, styles.r_1d7f28b0, styles.r_595fceba)}>
                        {formatPrice(item.price)}
                      </div>
                    </div>
                  </div>

                  <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e, styles.r_359090c2)}>
                    <ProductStat label="库存" value={item.stock} />
                    <ProductStat label="已售" value={item.soldCount} />
                    {item.mainHeadSize && <ProductStat label="主头" value={item.mainHeadSize} />}
                    {item.overallSize && <ProductStat label="整体" value={item.overallSize} />}
                    {item.potDiameter && <ProductStat label="盆径" value={item.potDiameter} />}
                    <ProductStat label="在线方式" value={availableTradeModes.map(tradeModeLabel).join(' / ')} />
                  </div>
                  {((item.taxons?.length ?? 0) > 0 || (item.tags?.length ?? 0) > 0) &&
                  <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e)}>
                      {item.taxons?.map((taxon) =>
                    <span
                      key={`${taxon.categorySlug}:${taxon.genusSlug ?? ''}:${taxon.speciesSlug ?? ''}`}
                      className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_5f6a59f1)}>

                          {taxon.label || [taxon.categorySlug, taxon.genusSlug, taxon.speciesSlug].filter(Boolean).join(' / ')}
                        </span>
                    )}
                      {item.tags?.map((tag) =>
                    <span key={tag} className={cx(styles.r_ac204c10, styles.r_ce27a834, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_02eb621e)}>
                          #{tag}
                        </span>
                    )}
                    </div>
                  }
                  {thumbnailStrip}

                  <div className={cx(styles.r_50d0d216, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_efb55408, styles.r_9fe52d5d, styles.r_9ee45fc9)}>
                    <div className={cx(styles.r_65281709, styles.r_359090c2, styles.r_2689f395, styles.r_5f6a59f1)}>商品说明</div>
                    <Tooltip content={item.description} className={styles.r_1ccb99be}>
                      <div className={cx(styles.r_054cb4e3, styles.r_359090c2, styles.r_7054e276, styles.r_eb6abb1f)}>
                        {item.description}
                      </div>
                    </Tooltip>
                  </div>

                  <div className={styles.r_f46b61a9}>
                    <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
                      {!canOrderOnline ?
                      <>
                        <Link
                          href={`/messages?to=${listing.seller.id}`}
                          className={cx(styles.r_af7490b1, styles.r_900c2a51, styles.r_4f43b5cb)}>

                          私信卖家
                        </Link>
                        {listing.externalUrl &&
                        <Link
                          href={listing.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={cx(styles.r_af7490b1, styles.r_900c2a51, styles.r_4f43b5cb)}>

                            打开三方链接
                          </Link>
                        }
                      </> :
                      hasExternal ?
                      <>
                        {soldOut ?
                        <button disabled className={cx(styles.r_f2b23104, styles.r_af7490b1, styles.r_900c2a51, styles.r_4f43b5cb, styles.r_b17d6a13)}>
                            已售罄
                          </button> :
                        isMine ?
                        <button disabled className={cx(styles.r_f2b23104, styles.r_af7490b1, styles.r_900c2a51, styles.r_4f43b5cb, styles.r_b17d6a13)}>
                            自己的商品
                          </button> :
                        !user ?
                        <Link
                          href={`/login?redirect=${encodeURIComponent(`/market/${listing.id}`)}`}
                          className={cx(styles.r_af7490b1, styles.r_900c2a51, styles.r_4f43b5cb)}>

                            登录购买
                          </Link> :
                        !canBuy ?
                        <Link href="/vip" className={cx(styles.r_af7490b1, styles.r_900c2a51, styles.r_4f43b5cb)}>
                            Lv.5 或会员可购买
                          </Link> :

                        <button
                          type="button"
                          onClick={() => openBuy(item)}
                          className={cx(styles.r_89de0f6b, styles.r_900c2a51, styles.r_4f43b5cb)}>

                            立即购买
                          </button>
                        }
                        <Link
                          href={`/messages?to=${listing.seller.id}`}
                          className={cx(styles.r_af7490b1, styles.r_900c2a51, styles.r_4f43b5cb)}>

                          私信卖家
                        </Link>
                        {listing.externalUrl &&
                        <Link
                          href={listing.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={cx(styles.r_af7490b1, styles.r_900c2a51, styles.r_4f43b5cb)}>

                            打开三方链接
                          </Link>
                        }
                      </> :
                      soldOut ?
                      <button disabled className={cx(styles.r_f2b23104, styles.r_af7490b1, styles.r_900c2a51, styles.r_4f43b5cb, styles.r_b17d6a13)}>
                        已售罄
                      </button> :
                      isMine ?
                      <button disabled className={cx(styles.r_f2b23104, styles.r_af7490b1, styles.r_900c2a51, styles.r_4f43b5cb, styles.r_b17d6a13)}>
                        自己的商品
                      </button> :
                      !user ?
                      <Link
                        href={`/login?redirect=${encodeURIComponent(`/market/${listing.id}`)}`}
                        className={cx(styles.r_af7490b1, styles.r_900c2a51, styles.r_4f43b5cb)}>

                        登录购买
                      </Link> :
                      !canBuy ?
                      <Link href="/vip" className={cx(styles.r_af7490b1, styles.r_900c2a51, styles.r_4f43b5cb)}>
                        Lv.5 或会员可购买
                      </Link> :

                      <button
                        type="button"
                        onClick={() => openBuy(item)}
                        className={cx(styles.r_89de0f6b, styles.r_900c2a51, styles.r_4f43b5cb)}>

                        立即购买
                      </button>
                      }
                    </div>
                  </div>
                </div>
                }
              </ProductImageMasonry>
            </article>);

        })}
      </div>

      <section id="comments" className={cx(styles.r_0ab86672, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_8e63407b)}>
        <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <h2 className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>评论</h2>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_359090c2, styles.r_69335b95)}>
            <Icon name="message" size={14} />
            {commentCount}
          </div>
        </div>

        <div className={styles.r_6ed543e2}>
          {comments.length === 0 ?
          <div className={cx(styles.r_5f22e64f, styles.r_a8a62ca4, styles.r_0e17f2bd, styles.r_cb11fec3, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_69335b95)}>
              还没有评论
            </div> :

          comments.map((comment) =>
          <div key={comment.id} className={cx(styles.r_60fbb771, styles.r_1004c0c3, styles.r_65fdbade, styles.r_88b684d2, styles.r_7fcf9124, styles.r_c2db4490, styles.r_dcd339c6)}>
                <Avatar src={comment.author.avatar} alt={comment.author.name} size={32} />
                <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                  <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
                    <UserName user={comment.author} size="xs" />
                    <span className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>{formatDateTime(comment.createdAt)}</span>
                  </div>
                  <div className={cx(styles.r_b6b02c0e, styles.r_a2edcb1a, styles.r_fc7473ca, styles.r_18550d59, styles.r_eb6abb1f)}>{comment.content}</div>
                </div>
              </div>
          )
          }
        </div>

        <div className={cx(styles.r_0ab86672, styles.r_b950dda2, styles.r_88b684d2, styles.r_ce335a8e)}>
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            className={cx(styles.r_a07a3fd9, styles.r_6da6a3c3, styles.r_5bd7b080, styles.r_03b4dd7f)}
            maxLength={1000}
            placeholder={user ? '写下你的评论' : '登录后评论'} />

          <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e)}>
            <span className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>{commentText.length}/1000</span>
            <button
              type="button"
              onClick={submitComment}
              disabled={commentSubmitting || !commentText.trim()}
              className={cn(cx(styles.r_af7490b1, styles.r_900c2a51, styles.r_dd702538), commentSubmitting && styles.r_f2868c22)}>

              {commentSubmitting ? '提交中...' : '发布评论'}
            </button>
          </div>
          {commentError && <div className={cx(styles.r_50d0d216, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>{commentError}</div>}
        </div>
      </section>

      {activeItem &&
      <div
        className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_f3c543ad, styles.r_67d66567, styles.r_094a9df0, styles.r_8e63407b)}
        onClick={() => !submitting && setActiveItem(null)}>

          <div
          className={cx(styles.r_b4168890, styles.r_6da6a3c3, styles.r_6199866f, styles.r_92bf82f4, styles.r_0478c89a)}
          onClick={(e) => e.stopPropagation()}>

            <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_60541e1e, styles.r_1004c0c3)}>
              <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                <h3 className={cx(styles.r_4ee73492, styles.r_e83a7042)}>确认订单</h3>
                <p className={cx(styles.r_f50e2015, styles.r_359090c2, styles.r_69335b95)}>{activeItem.title}</p>
              </div>
              <button
              type="button"
              onClick={() => setActiveItem(null)}
              className={cx(styles.r_b17d6a13, styles.r_81be6435)}
              aria-label="关闭">

                <Icon name="close" size={18} />
              </button>
            </div>

            <div className={styles.r_3e7ce58d}>
              {onlineTradeModes.length > 1 &&
            <div>
                  <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_21d33c50)}>交易方式</label>
                  <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_77a2a20e)}>
                    {onlineTradeModes.map((mode) =>
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedTradeMode(mode)}
                  className={cn(cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65, styles.r_359090c2, styles.r_ceb69a6b),

                  selectedTradeMode === mode ? cx(styles.r_d3b27cd9, styles.r_7ebecbb6, styles.r_2689f395, styles.r_5f6a59f1, styles.r_16b1efa5, styles.r_52c47100) : cx(styles.r_88b684d2, styles.r_5e10cdb8, styles.r_eb6abb1f, styles.r_a5c39c39)


                  )}>

                        <span className={styles.r_0214b4b3}>{tradeModeLabel(mode)}</span>
                        <span className={cx(styles.r_15e1b1f4, styles.r_0214b4b3, styles.r_d058ca6d, styles.r_8ecebc9f, styles.r_69335b95)}>
                          {tradeModeHint(mode)}
                        </span>
                      </button>
                )}
                  </div>
                </div>
            }

              <div>
                <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_21d33c50)}>数量</label>
                <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                  <button
                  type="button"
                  onClick={() => setQty((n) => Math.max(1, n - 1))}
                  className={cx(styles.r_23b4e5ed, styles.r_ebb407e8)}
                  disabled={qty <= 1}>

                    -
                  </button>
                  <input
                  className={cx(styles.r_baceed34, styles.r_ca6bf630)}
                  type="number"
                  value={qty}
                  onChange={(e) =>
                  setQty(Math.max(1, Math.min(activeItem.stock, Number(e.target.value) || 1)))
                  } />

                  <button
                  type="button"
                  onClick={() => setQty((n) => Math.min(activeItem.stock, n + 1))}
                  className={cx(styles.r_23b4e5ed, styles.r_ebb407e8)}
                  disabled={qty >= activeItem.stock}>

                    +
                  </button>
                  <span className={cx(styles.r_c68af998, styles.r_359090c2, styles.r_69335b95)}>库存 {activeItem.stock}</span>
                </div>
              </div>

              <div>
                <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_21d33c50)}>收货地址</label>
                <AddressPicker value={addr} onChange={setAddr} />
              </div>
            </div>

            <div className={cx(styles.r_0ab86672, styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_eb6e8b88, styles.r_359090c2, styles.r_7054e276, styles.r_5f6a59f1)}>
              <div className={cx(styles.r_60fbb771, styles.r_8ef2268e)}>
                <span>商品金额</span>
                <span className={cx(styles.r_e83a7042, styles.r_399e11a5)}>{formatPrice(activeItem.price * qty)}</span>
              </div>
              {selectedTradeMode === 'online_payment' &&
            <div className={cx(styles.r_60fbb771, styles.r_8ef2268e)}>
                  <span>平台手续费</span>
                  <span>卖家承担 1%</span>
                </div>
            }
            </div>

            <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e, styles.r_b950dda2, styles.r_88b684d2, styles.r_ce335a8e)}>
              <div className={cx(styles.r_fc7473ca, styles.r_69450ef1, styles.r_595fceba)}>
                合计 {formatPrice(activeItem.price * qty)}
              </div>
              <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className={cn(styles.r_af7490b1, submitting && styles.r_f2868c22)}>

                {submitting ? '提交中...' : '提交订单'}
              </button>
            </div>

            {err && <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>{err}</div>}
          </div>
        </div>
      }
    </>);

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
  children




}: {images: string[];title: string;children: ProductImageMasonryChildren;}) {
  const safeImages = images.length ? images : [];
  const [active, setActive] = useState(0);
  const [imageSizes, setImageSizes] = useState<Record<string, {width: number;height: number;}>>({});
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
  safeImages.length > 1 ?
  <div className={cx(styles.r_50d0d216, styles.r_f3c543ad, styles.r_931228bb, styles.r_58284b4e)}>
        {safeImages.map((src, index) =>
    <button
      key={`${src}-${index}`}
      type="button"
      onClick={() => setActive(index)}
      className={cn(cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_6da6a3c3, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ebecbb6, styles.r_0fe7d7d8),

      active === index ? cx(styles.r_3bd65fe8, styles.r_3972e98d, styles.r_16b1efa5, styles.r_cf825218) : cx(styles.r_88b684d2, styles.r_0c67ca47, styles.r_a5c39c39, styles.r_5da1d525)


      )}
      aria-label={`Preview image ${index + 1}`}>

            <Image
        src={src}
        alt=""
        fill
        className={styles.r_7d85d0c2}
        unoptimized
        onLoad={(event) => handleImageLoad(src, event)} />

          </button>
    )}
      </div> :
  null;

  return (
    <div className={cx(styles.r_f3c543ad, styles.r_0c3bc985, styles.r_ca10e412, styles.r_00200b8b, styles.r_a5bac8fb)}>
      <div className={cx(styles.r_6da6a3c3, styles.r_a217b4ea, styles.r_5e10cdb8, styles.r_e76f230c, styles.r_050c847f)}>
        <button
          type="button"
          onClick={() => openPreview(active)}
          className={cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_b59cd297, styles.r_6da6a3c3, styles.r_3bbc8c13, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_2eba0d65, styles.r_e76f230c, styles.r_050c847f)}
          aria-label="Preview product image">

          <Image
            key={current}
            src={current}
            alt={active === 0 ? title : `${title} ${active + 1}`}
            fill
            className={styles.r_7d85d0c2}
            unoptimized
            onLoad={(event) => handleImageLoad(current, event)} />

          {total > 1 &&
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
              className={cx(styles.r_da4dbfbc, styles.r_22e59b72, styles.r_d694ba66, styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_36b381be, styles.r_34516836, styles.r_67d66567, styles.r_ac204c10, styles.r_2ccc1c42, styles.r_72a4c7cd, styles.r_3972e98d, styles.r_438b2237, styles.r_0fe7d7d8, styles.r_c42f3f6f, styles.r_d30e4cd2, styles.r_07d233ab)}
              aria-label="上一张">

                <Icon name="arrow-right" size={18} className={styles.r_3350916b} />
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
              className={cx(styles.r_da4dbfbc, styles.r_c100b64c, styles.r_d694ba66, styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_36b381be, styles.r_34516836, styles.r_67d66567, styles.r_ac204c10, styles.r_2ccc1c42, styles.r_72a4c7cd, styles.r_3972e98d, styles.r_438b2237, styles.r_0fe7d7d8, styles.r_c42f3f6f, styles.r_d30e4cd2, styles.r_07d233ab)}
              aria-label="下一张">

                <Icon name="arrow-right" size={18} />
              </span>
            </>
          }
          {total > 1 &&
          <div className={cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_49af11eb, styles.r_c100b64c, styles.r_ac204c10, styles.r_084ed6ec, styles.r_0b91436d, styles.r_660d2eff, styles.r_d058ca6d, styles.r_2689f395, styles.r_3032cae0, styles.r_72a4c7cd)}>
              <span>{active + 1}</span>
              <span className={styles.r_ebeab46b}>/</span>
              <span>{total}</span>
            </div>
          }
        </button>

      </div>

      {typeof children === 'function' ? children(thumbnailStrip) : children}

      {false &&
      <div className={styles.r_99d72c7f} aria-hidden="true">
          {safeImages.map((src, index) =>
        <button
          key={`${src}-${index}`}
          type="button"
          onClick={() => setActive(index)}
          className={cn(cx(styles.r_d89972fe, styles.r_357868ab, styles.r_6da6a3c3, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_c6b7c8a6, styles.r_0fe7d7d8),

          active === index ? cx(styles.r_2fe59630, styles.r_3972e98d, styles.r_438b2237, styles.r_16b1efa5, styles.r_2f107f50) : cx(styles.r_426b5a1c, styles.r_f854738e, styles.r_88a52491, styles.r_5da1d525)


          )}
          aria-label={`查看第 ${index + 1} 张商品图`}>

              <Image src={src} alt="" fill className={styles.r_7d85d0c2} unoptimized />
              <span className={cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_7b7df044, styles.r_79257b8c, styles.r_b7167002, styles.r_0fe2b3da)} />
            </button>
        )}
        </div>
      }
    </div>);

}
function ProductStat({ label, value }: {label: string;value: string | number;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_ba120f34, styles.r_3960ffc2, styles.r_58284b4e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_0b91436d, styles.r_ec0091ee)}>
      <div className={cx(styles.r_012fbd12, styles.r_d058ca6d, styles.r_69335b95)}>{label}</div>
      <div className={cx(styles.r_28fb5fa0, styles.r_f283ea9b, styles.r_359090c2, styles.r_e83a7042, styles.r_399e11a5)}>{value}</div>
    </div>);

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
