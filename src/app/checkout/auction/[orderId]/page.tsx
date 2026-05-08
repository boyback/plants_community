'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { cn, countdown, formatPrice } from '@/lib/utils';
import {
  AddressPicker,
  type AddressPickerValue,
  pickerValueToOrderBody,
  validateAddressPicker,
} from '@/components/address/AddressPicker';
import type { Order, Payment } from '@/lib/types';
import { PaymentQr, type PayChannel } from '@/components/payment/PaymentQr';

type Channel = PayChannel;

export default function AuctionCheckoutPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useI18n();

  const [order, setOrder] = useState<Order | null>(null);
  const [addr, setAddr] = useState<AddressPickerValue>(null);
  const [addrSubmitting, setAddrSubmitting] = useState(false);
  const [addrSaved, setAddrSaved] = useState(false);
  const [channel, setChannel] = useState<Channel>('alipay');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [abandoned, setAbandoned] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!params?.orderId) return;
    setLoading(true);
    api
      .get<Order>(`/api/orders/${params.orderId}`)
      .then((o) => {
        setOrder(o);
        // 已经填了地址,直接进入支付
        if (o.shipName && o.shipPhone && o.shipAddress) {
          setAddrSaved(true);
        }
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : t('checkout.loadFail')))
      .finally(() => setLoading(false));
  }, [authLoading, user, params?.orderId, router]);

  // 提交地址
  const submitAddress = async () => {
    if (!order) return;
    const v = validateAddressPicker(addr, t);
    if (v) {
      setErr(v);
      return;
    }
    setErr(null);
    setAddrSubmitting(true);
    try {
      await api.post(`/api/orders/${order.id}/address`, pickerValueToOrderBody(addr));
      // 重新拉订单
      const o = await api.get<Order>(`/api/orders/${order.id}`);
      setOrder(o);
      setAddrSaved(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('checkout.addressSaveFail'));
    } finally {
      setAddrSubmitting(false);
    }
  };

  // 创建/重建支付单
  const createPay = async () => {
    if (!order || !addrSaved) return;
    setCreating(true);
    setErr(null);
    setAbandoned(false);
    try {
      const p = await api.post<Payment>('/api/payments', {
        bizType: 'auction_balance',
        bizId: order.id,
        channel,
      });
      setPayment(p);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('checkout.createFail'));
    } finally {
      setCreating(false);
    }
  };

  // 渠道切换或地址刚保存,自动拉起
  useEffect(() => {
    if (addrSaved && order && order.status === 'pending_payment') {
      createPay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addrSaved, channel, order?.id]);

  // 轮询(同 /checkout:连续 2 次 scanning=false 才判为已关闭)
  useEffect(() => {
    if (!payment) return;
    if (payment.status !== 'pending') return;
    if (pollRef.current) clearInterval(pollRef.current);
    let everScanned = false;
    let notScanningStreak = 0;
    const startTimer = setTimeout(() => {
      pollRef.current = setInterval(async () => {
        try {
          const p = await api.get<Payment>(`/api/payments/${payment.payNo}`);
          setPayment(p);
          if (p.status === 'paid') {
            everScanned = false;
            notScanningStreak = 0;
            setAbandoned(false);
            setToast(t('checkout.paySuccessShipping'));
            await refresh();
            setTimeout(() => router.push('/orders'), 3000);
          } else if (p.status === 'expired' || p.status === 'cancelled') {
            if (pollRef.current) clearInterval(pollRef.current);
          } else if (p.status === 'pending') {
            if (p.scanning) {
              everScanned = true;
              notScanningStreak = 0;
              setAbandoned(false);
            } else if (everScanned) {
              notScanningStreak += 1;
              if (notScanningStreak >= 2) {
                setAbandoned(true);
              }
            }
          }
        } catch {
          /* ignore */
        }
      }, 1500);
    }, 4000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(startTimer);
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.payNo]);

  const mockConfirm = async () => {
    if (!payment) return;
    setConfirming(true);
    try {
      await api.post(`/api/payments/${payment.payNo}/confirm`);
      setToast(t('checkout.paySuccess'));
      await refresh();
      setTimeout(() => router.push('/orders'), 3000);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('checkout.confirmFail'));
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>
      </Shell>
    );
  }

  if (!order) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">😕</div>
          <div className="mt-3 text-base font-semibold">{err ?? t('checkout.orderNotFound')}</div>
          <Link href="/auction" className="btn-primary mt-4 inline-flex">
            {t('checkout.backToAuction')}
          </Link>
        </div>
      </Shell>
    );
  }

  if (order.source !== 'auction') {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">😕</div>
          <div className="mt-3 text-base font-semibold">{t('checkout.notAuctionOrder')}</div>
          <Link href={`/checkout/${order.id}`} className="btn-primary mt-4 inline-flex">
            {t('checkout.goNormalPay')}
          </Link>
        </div>
      </Shell>
    );
  }

  if (order.status !== 'pending_payment') {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">✅</div>
          <div className="mt-3 text-base font-semibold">{t('checkout.noNeedPay')}</div>
          <div className="mt-1 text-xs text-leaf-700/70">
            {t('checkout.currentStatus')}:{t(`orders.status.${order.status}`) || order.status}
          </div>
          <Link href="/orders" className="btn-primary mt-4 inline-flex">
            {t('checkout.viewMyOrders')}
          </Link>
        </div>
      </Shell>
    );
  }

  const balance = order.totalPrice - order.depositPaid;
  const expired = payment?.status === 'expired';
  const paid = payment?.status === 'paid';
  const remain = payment ? new Date(payment.expireAt).getTime() - now : 0;

  return (
    <Shell>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card p-6">
          <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700">
            {t('checkout.auctionOrderBadge')}
          </div>
          <h1 className="mt-1 text-xl font-semibold text-ink-800">{t('checkout.pageTitle')}</h1>
          <div className="text-xs text-leaf-700/70">{t('checkout.orderNo')} {order.orderNo}</div>

          {/* 价格明细 */}
          <div className="mt-5 rounded-2xl bg-leaf-50/50 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-leaf-700/70">{t('checkout.winningPrice')}</div>
                <div className="font-semibold">{formatPrice(order.totalPrice)}</div>
              </div>
              <div>
                <div className="text-xs text-leaf-700/70">{t('checkout.paidDeposit')}</div>
                <div className="font-semibold text-leaf-700">
                  -{formatPrice(order.depositPaid)}
                </div>
              </div>
            </div>
            <div className="mt-3 border-t border-leaf-200/60 pt-3 flex items-baseline justify-between">
              <span className="text-xs text-leaf-700/70">{t('checkout.finalAmount')}</span>
              <span className="text-2xl font-bold text-rose-600">{formatPrice(balance)}</span>
            </div>
          </div>

          {/* 收货地址 */}
          {!addrSaved ? (
            <div className="mt-6">
              <h2 className="mb-2 text-sm font-semibold">{t('checkout.ship.pickTitle')}</h2>
              <AddressPicker value={addr} onChange={setAddr} />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={submitAddress}
                  disabled={addrSubmitting}
                  className="btn-primary !text-sm"
                >
                  {addrSubmitting ? t('checkout.ship.saving') : t('checkout.ship.confirmAddr')}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold">{t('checkout.ship.currentAddr')}</span>
                <button
                  type="button"
                  onClick={() => setAddrSaved(false)}
                  className="text-xs text-leaf-700 hover:underline"
                >
                  {t('checkout.ship.changeAddr')}
                </button>
              </div>
              <div className="rounded-xl bg-leaf-50/60 p-3 text-xs">
                <div>
                  <span className="font-medium text-ink-800">{order.shipName}</span>
                  <span className="ml-2 text-leaf-700/70">{order.shipPhone}</span>
                </div>
                <div className="mt-0.5 text-leaf-700/80">{order.shipAddress}</div>
              </div>
            </div>
          )}

          {/* 支付方式 + 二维码(仅地址确认后展示) */}
          {addrSaved && (
            <>
              <div className="mt-6">
                <div className="mb-3 text-sm font-semibold">{t('checkout.pickChannel')}</div>
                <div className="grid grid-cols-2 gap-3">
                  <ChannelCard
                    active={channel === 'wechat'}
                    onClick={() => setChannel('wechat')}
                    icon="💚"
                    title={t('checkout.channelWechat')}
                  />
                  <ChannelCard
                    active={channel === 'alipay'}
                    onClick={() => setChannel('alipay')}
                    icon="💙"
                    title={t('checkout.channelAlipay')}
                  />
                </div>
              </div>

              <div className="mt-6 grid place-items-center rounded-2xl bg-leaf-50/50 p-6">
                {creating || !payment ? (
                  <div className="grid h-56 w-56 place-items-center rounded-xl border border-dashed border-leaf-200 bg-white text-xs text-leaf-700/60">
                    {t('checkout.generatingQr', {
                      channel: channel === 'wechat' ? t('checkout.channelWechat') : t('checkout.channelAlipay'),
                    })}
                  </div>
                ) : expired ? (
                  <div className="grid h-56 w-56 place-items-center rounded-xl border border-dashed border-leaf-200 bg-white">
                    <div className="text-3xl">⌛</div>
                    <div className="mt-2 text-xs text-leaf-700/70">{t('checkout.qrExpired')}</div>
                    <button
                      type="button"
                      onClick={() => createPay()}
                      className="mt-2 text-[11px] text-leaf-700 hover:underline"
                    >
                      {t('checkout.qrRegenerate')}
                    </button>
                  </div>
                ) : (
                  <PaymentQr
                    text={payment.qrcode ?? payment.payNo}
                    channel={channel}
                    status={payment.status}
                    scanning={payment.scanning ?? false}
                  />
                )}
              </div>

              {payment && payment.status === 'pending' && !expired && (
                abandoned ? (
                  <div className="mt-3 flex flex-col items-center gap-1 text-center">
                    <span className="text-[11px] text-amber-700">
                      {t('checkout.abandoned')}
                    </span>
                    <button
                      type="button"
                      onClick={() => createPay()}
                      className="text-[11px] text-leaf-700 underline hover:text-leaf-800"
                    >
                      {t('checkout.regenerate')}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 text-center text-xs text-leaf-700/70">
                    {t('checkout.qrExpiresIn', { time: countdown(remain) })}
                  </div>
                )
              )}

              {/* 仅在 mock 回落时显示 Demo 按钮 */}
              {payment && payment.status === 'pending' && !expired && payment.qrcode?.startsWith('mock://') && (
                <div className="mt-4 rounded-xl bg-amber-50 p-3 text-center">
                  <div className="text-[11px] text-amber-700">
                    <b>{t('checkout.demoTip')}</b>:{t('checkout.demoTipAuction')}
                  </div>
                  <button
                    type="button"
                    disabled={confirming}
                    onClick={mockConfirm}
                    className="btn mt-2 bg-amber-500 text-white hover:bg-amber-600 !text-xs"
                  >
                    {confirming ? t('checkout.processing') : t('checkout.mockConfirm')}
                  </button>
                </div>
              )}

              {paid && (
                <div className="mt-3 rounded-lg bg-leaf-50 px-3 py-2 text-xs text-leaf-700">
                  {t('checkout.paidRedirect')}
                </div>
              )}
            </>
          )}

          {err && (
            <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {err}
            </div>
          )}
        </div>

        {/* 右栏:订单详情 */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="border-b border-leaf-100 px-5 py-3 text-sm font-semibold">
              {t('checkout.itemInfo')}
            </div>
            <div className="p-4">
              <div className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-leaf-50">
                  {order.auctionCover && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={order.auctionCover}
                      alt={order.auctionTitle ?? ''}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-xs text-ink-800">
                    {order.auctionTitle ?? t('checkout.itemLabel')}
                  </div>
                  {order.auctionId && (
                    <Link
                      href={`/auction/${order.auctionId}`}
                      className="mt-1 inline-flex text-[11px] text-leaf-700 hover:underline"
                    >
                      {t('checkout.viewAuctionDetail')}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4 text-[11px] text-leaf-700/70">
            <div className="mb-1 font-medium text-leaf-700">{t('checkout.auctionNote.title')}</div>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>{t('checkout.auctionNote.item1')}</li>
              <li>{t('checkout.auctionNote.item2')}</li>
              <li>{t('checkout.auctionNote.item3')}</li>
            </ul>
          </div>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-800 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </Shell>
  );
}

function ChannelCard({
  active,
  onClick,
  icon,
  title,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all',
        active ? 'border-leaf-500 bg-leaf-50/60' : 'border-leaf-100 hover:border-leaf-300'
      )}
    >
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-2xl shadow-sm">
        {icon}
      </div>
      <div className="text-sm font-semibold">{title}</div>
      {active && (
        <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-leaf-500 text-xs text-white">
          ✓
        </span>
      )}
    </button>
  );
}
