'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { cn, countdown, formatPrice } from '@/lib/utils';
import type { Order, Payment } from '@/lib/types';
import { PaymentQr, type PayChannel } from '@/components/payment/PaymentQr';

type Channel = PayChannel;

export default function CheckoutPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useI18n();

  const [order, setOrder] = useState<Order | null>(null);
  const [channel, setChannel] = useState<Channel>('alipay');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [abandoned, setAbandoned] = useState(false);
  const [regenTick, setRegenTick] = useState(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1. 加载订单
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
      .then((o) => setOrder(o))
      .catch((e) => setErr(e instanceof ApiError ? e.message : t('checkout.loadFail')))
      .finally(() => setLoading(false));
  }, [authLoading, user, params?.orderId, router]);

  // 2. 切换支付渠道或手动刷新时,重新拉起支付单
  useEffect(() => {
    if (!order) return;
    if (order.status !== 'pending_payment') return;
    setCreating(true);
    setErr(null);
    setAbandoned(false);
    api
      .post<Payment>('/api/payments', {
        bizType: 'order',
        bizId: order.id,
        channel,
      })
      .then((p) => setPayment(p))
      .catch((e) => setErr(e instanceof ApiError ? e.message : t('checkout.createFail')))
      .finally(() => setCreating(false));
  }, [order, channel, regenTick]);

  // 3. 轮询支付状态(后端在 GET 时会主动向支付宝 query + 自动 confirm)
  //    判断「用户扫了码但关闭了支付页」:
  //    曾扫码 且 连续 2 次 scanning=false 且 status 仍 pending → 判为已放弃
  useEffect(() => {
    if (!payment) return;
    if (payment.status !== 'pending') return;
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    let everScanned = false;
    let notScanningStreak = 0;
    const startTimer = setTimeout(() => {
      pollTimerRef.current = setInterval(async () => {
        try {
          const p = await api.get<Payment>(`/api/payments/${payment.payNo}`);
          setPayment(p);
          if (p.status === 'paid') {
            everScanned = false;
            notScanningStreak = 0;
            setAbandoned(false);
            setToast(t('checkout.paySuccessRedirect'));
            await refresh();
            setTimeout(() => router.push('/orders'), 3000);
          } else if (p.status === 'expired' || p.status === 'cancelled') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
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
          // ignore
        }
      }, 1500);
    }, 4000);

    const tick = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      clearTimeout(startTimer);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.payNo]);

  const mockConfirm = async () => {
    if (!payment) return;
    setConfirming(true);
    try {
      await api.post(`/api/payments/${payment.payNo}/confirm`);
      const p = await api.get<Payment>(`/api/payments/${payment.payNo}`);
      setPayment(p);
      setToast(t('checkout.paySuccessRedirect'));
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
        <div className="card p-10 text-center">
          <div className="text-4xl">😕</div>
          <div className="mt-3 text-base font-semibold">{err ?? t('checkout.orderNotFound')}</div>
          <Link href="/market" className="btn-primary mt-4 inline-flex">
            {t('checkout.backToMarket')}
          </Link>
        </div>
      </Shell>
    );
  }

  // 如果订单已完成或非待支付,引导
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

  const expired = payment && payment.status === 'expired';
  const paid = payment && payment.status === 'paid';
  const remain = payment ? new Date(payment.expireAt).getTime() - now : 0;

  return (
    <Shell>
      {/* 移动端:顶部一条简化摘要 + 黿底总额 */}
      <div className="mb-3 flex items-center gap-3 rounded-xl border border-leaf-100 bg-white px-3 py-2 lg:hidden">
        {(order.product?.cover || order.auctionCover) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={order.product?.cover ?? order.auctionCover ?? ''}
            alt=""
            className="h-10 w-10 shrink-0 rounded object-cover"
          />
        )}
        <div className="min-w-0 flex-1 text-xs">
          <div className="line-clamp-1 text-ink-800">
            {order.product?.title ?? order.auctionTitle ?? t('checkout.orderLabel')}
          </div>
          <div className="text-[10px] text-leaf-700/70">
            × {order.quantity} · {order.shipName ?? '—'}
          </div>
        </div>
        <div className="text-sm font-bold text-rose-600">
          {formatPrice(order.totalPrice)}
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 pb-20 lg:grid-cols-[1fr_360px] lg:pb-0">
        {/* 主体:支付方式 + 二维码 */}
        <div className="card p-6">
          <h1 className="text-xl font-semibold text-ink-800">{t('checkout.pageTitle')}</h1>
          <div className="mt-1 text-xs text-leaf-700/70">{t('checkout.orderNo')} {order.orderNo}</div>

          <div className="mt-6">
            <div className="text-xs text-leaf-700/70">{t('checkout.amount')}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-rose-600">
                {formatPrice(order.totalPrice)}
              </span>
              {order.pointsBackTotal > 0 && (
                <span className="text-xs text-leaf-700/70">
                  {t('checkout.pointsBack', { n: order.pointsBackTotal })}
                </span>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 text-sm font-medium">{t('checkout.pickChannel')}</div>
            <div className="grid grid-cols-3 gap-3">
              <ChannelCard
                active={channel === 'wechat'}
                onClick={() => setChannel('wechat')}
                icon="💚"
                title={t('checkout.channelWechat')}
                subtitle="WeChat Pay"
              />
              <ChannelCard
                active={channel === 'alipay'}
                onClick={() => setChannel('alipay')}
                icon="💙"
                title={t('checkout.channelAlipay')}
                subtitle="Alipay"
              />
              <ChannelCard
                active={channel === 'escrow'}
                onClick={() => setChannel('escrow')}
                icon="🛡️"
                title="官方中介"
                subtitle="担保交易"
              />
            </div>
            {channel === 'escrow' && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <div className="mb-1 font-semibold">🛡️ 官方中介担保流程</div>
                <ol className="list-decimal space-y-0.5 pl-4">
                  <li>买家把货款转入官方平台担保账户</li>
                  <li>卖家收到「平台已收款」通知后发货</li>
                  <li>买家收货确认后,平台把货款转给卖家</li>
                  <li>纠纷可申请客服仲裁,平台收 1% 手续费</li>
                </ol>
                <div className="mt-2 text-amber-700">
                  📩 选择此方式后,请联系客服 admin@plantcommunity.cn 获取担保账户
                </div>
              </div>
            )}
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
                  onClick={() => setRegenTick((n) => n + 1)}
                  className="mt-2 text-[11px] text-leaf-700 hover:underline"
                >
                  {t('checkout.qrRegenerate')}
                </button>
              </div>
            ) : (
              <>
                <PaymentQr
                  text={payment.qrcode ?? payment.payNo}
                  channel={channel}
                  status={payment.status}
                  scanning={payment.scanning ?? false}
                />
                <div className="mt-3 text-center text-xs text-leaf-700">
                  {paid ? (
                    <span className="text-leaf-700 font-semibold">{t('checkout.paidRedirect')}</span>
                  ) : abandoned ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] text-amber-700">
                        {t('checkout.abandoned')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRegenTick((n) => n + 1)}
                        className="text-[11px] text-leaf-700 underline hover:text-leaf-800"
                      >
                        {t('checkout.regenerate')}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 text-[10px] text-leaf-700/60">
                      {t('checkout.qrExpiresIn', { time: countdown(remain) })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 仅当 qrcode 是 mock:// 时显示 Demo 按钮(微信通道或支付宝 SDK 失败回落时) */}
          {payment && !paid && !expired && payment.qrcode?.startsWith('mock://') && (
            <div className="mt-4 rounded-xl bg-amber-50 p-3 text-center">
              <div className="text-[11px] text-amber-700">
                <b>{t('checkout.demoTip')}</b>:{t('checkout.demoTipDesc')}
              </div>
              <button
                type="button"
                onClick={mockConfirm}
                disabled={confirming}
                className="btn mt-2 bg-amber-500 text-white hover:bg-amber-600 !text-xs"
              >
                {confirming ? t('checkout.processing') : t('checkout.mockConfirm')}
              </button>
            </div>
          )}

          {err && (
            <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {err}
            </div>
          )}
        </div>

        {/* 订单摘要 */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="border-b border-leaf-100 px-5 py-3 text-sm font-semibold">
              {t('checkout.orderDetail')}
            </div>
            <div className="p-4">
              <div className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-leaf-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={order.product?.cover ?? order.auctionCover ?? ''}
                    alt={order.product?.title ?? order.auctionTitle ?? ''}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-xs text-ink-800">
                    {order.product?.title ?? order.auctionTitle ?? t('checkout.orderLabel')}
                  </div>
                  <div className="mt-1 text-[11px] text-leaf-700/70">
                    {t('checkout.quantity')} × {order.quantity}
                  </div>
                </div>
                <div className="text-xs font-semibold text-rose-600">
                  {formatPrice(order.totalPrice)}
                </div>
              </div>
              <div className="mt-3 space-y-1 border-t border-leaf-100 pt-3 text-[11px] text-leaf-700/80">
                <div>👤 {order.shipName} · {order.shipPhone}</div>
                <div>📍 {order.shipAddress}</div>
              </div>
            </div>
          </div>

          <div className="card p-4 text-[11px] text-leaf-700/70">
            <div className="mb-1 font-medium text-leaf-700">{t('checkout.guarantee.title')}</div>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>{t('checkout.guarantee.item1')}</li>
              <li>{t('checkout.guarantee.item2')}</li>
              <li>{t('checkout.guarantee.item3')}</li>
              <li>{t('checkout.guarantee.item4')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 移动端粘底:总额 + 倒计时(支付未完成时显示) */}
      {payment && payment.status === 'pending' && !expired && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-leaf-100 bg-white/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <div>
              <div className="text-[11px] text-leaf-700/70">{t('checkout.amount')}</div>
              <div className="text-lg font-bold text-rose-600">
                {formatPrice(order.totalPrice)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-leaf-700/60">
                {t('checkout.qrExpiresIn', { time: countdown(remain) })}
              </div>
              <div className="mt-0.5 text-[10px] text-leaf-700/70">
                {t('checkout.scanWith', {
                  channel: channel === 'wechat' ? t('checkout.channelWechat') : t('checkout.channelAlipay'),
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-800 px-4 py-2 text-xs text-white shadow-lg lg:bottom-10">
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
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  subtitle: string;
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
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-[10px] text-leaf-700/70">{subtitle}</div>
      </div>
      {active && (
        <span className="grid h-5 w-5 place-items-center rounded-full bg-leaf-500 text-xs text-white">
          ✓
        </span>
      )}
    </button>
  );
}



