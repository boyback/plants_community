'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
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
  externalUrl?: string;
  contactNote?: string;
  cover: string;
  minPrice: number;
  maxPrice: number;
  itemCount: number;
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
}

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

export function ListingDetailClient({ listing }: { listing: MarketListingDetail }) {
  const router = useRouter();
  const { user, vip } = useAuth();
  const [activeItem, setActiveItem] = useState<MarketListingItem | null>(null);
  const [qty, setQty] = useState(1);
  const [addr, setAddr] = useState<AddressPickerValue>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <>
      <div className="space-y-4">
        {listing.items.map((item) => {
          const soldOut = listing.status !== 'on_sale' || item.status !== 'on_sale' || item.stock <= 0;
          const images = item.images.length ? item.images : [item.cover];

          return (
            <article key={item.id} className="rounded-xl border border-leaf-100 bg-white p-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr]">
                <div className="grid grid-cols-4 gap-2 md:block">
                  <div className="relative col-span-4 aspect-square overflow-hidden rounded-lg bg-leaf-50 md:col-span-1">
                    <Image src={item.cover} alt={item.title} fill className="object-cover" unoptimized />
                  </div>
                  {images.slice(1, 4).map((image) => (
                    <div key={image} className="relative mt-0 aspect-square overflow-hidden rounded-md bg-leaf-50 md:mt-2 md:h-12 md:w-12">
                      <Image src={image} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-ink-800">{item.title}</h3>
                      <div className="mt-1 text-sm font-bold text-rose-600">{formatPrice(item.price)}</div>
                    </div>
                    <div className="text-right text-xs text-leaf-700/70">
                      <div>库存 {item.stock}</div>
                      {item.soldCount > 0 && <div>已售 {item.soldCount}</div>}
                    </div>
                  </div>

                  <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-700">
                    {item.description}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {listing.tradeMode === 'external' ? (
                      <>
                        <Link
                          href={`/messages?to=${listing.seller.id}`}
                          className="btn-primary !px-3 !py-1.5 !text-xs"
                        >
                          私信卖家
                        </Link>
                        {listing.externalUrl && (
                          <Link
                            href={listing.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-outline !px-3 !py-1.5 !text-xs"
                          >
                            打开三方链接
                          </Link>
                        )}
                      </>
                    ) : soldOut ? (
                      <button disabled className="btn bg-leaf-100 !px-3 !py-1.5 !text-xs text-leaf-600">
                        已售罄
                      </button>
                    ) : isMine ? (
                      <button disabled className="btn bg-leaf-100 !px-3 !py-1.5 !text-xs text-leaf-600">
                        自己的商品
                      </button>
                    ) : !user ? (
                      <Link
                        href={`/login?redirect=${encodeURIComponent(`/market/${listing.id}`)}`}
                        className="btn-primary !px-3 !py-1.5 !text-xs"
                      >
                        登录购买
                      </Link>
                    ) : !canBuy ? (
                      <Link href="/vip" className="btn-outline !px-3 !py-1.5 !text-xs">
                        Lv.5 或会员可购买
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openBuy(item)}
                        className="btn-primary !px-3 !py-1.5 !text-xs"
                      >
                        立即购买
                      </button>
                    )}
                    <span className="text-[11px] text-leaf-700/60">{tradeModeHint(listing.tradeMode)}</span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

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
              {listing.tradeMode === 'online_payment' && (
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

function tradeModeHint(mode: MarketListingDetail['tradeMode']) {
  if (mode === 'platform_escrow') return '平台担保交易';
  if (mode === 'online_payment') return '支付宝在线支付，手续费 1%';
  return '自行联系，请确认交易风险';
}
