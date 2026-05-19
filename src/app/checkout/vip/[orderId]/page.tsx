'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { cn, countdown, formatPrice } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import type { Payment } from '@/lib/types';
import { PaymentQr, type PayChannel } from '@/components/payment/PaymentQr';

type Channel = PayChannel;

interface VipOrderInfo {
  id: string;
  orderNo: string;
  plan: string;
  amount: number;
  pointsCost: number;
  durationDays: number;
  status: string;
}

export default function VipCheckoutPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useI18n();

  const [channel, setChannel] = useState<Channel>('alipay');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [now, setNow] = useState(Date.now());
  const [creating, setCreating] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [abandoned, setAbandoned] = useState(false);
  const [regenTick, setRegenTick] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!params?.orderId) return;
    setCreating(true);
    setErr(null);
    setAbandoned(false);
    api
      .post<Payment>('/api/payments', {
        bizType: 'vip',
        bizId: params.orderId,
        channel,
      })
      .then(setPayment)
      .catch((e) => setErr(e instanceof ApiError ? e.message : t('checkout.createFail')))
      .finally(() => setCreating(false));
  }, [authLoading, user, params?.orderId, channel, router, regenTick]);

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
            toast.success(t('checkout.paySuccess'));
            await refresh();
            setTimeout(() => router.push('/vip'), 3000);
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
      toast.success(t('checkout.paySuccess'));
      await refresh();
      setTimeout(() => router.push('/vip'), 3000);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('checkout.confirmFail'));
    } finally {
      setConfirming(false);
    }
  };

  const remain = payment ? new Date(payment.expireAt).getTime() - now : 0;
  const expired = payment?.status === 'expired';

  return (
    <Shell>
      <div className="mx-auto max-w-2xl card overflow-hidden">
        <div className="bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-300 p-6 text-amber-900">
          <h1 className="text-xl font-bold">{t('checkout.vip.pageTitle')}</h1>
          <p className="mt-1 text-xs opacity-80">{t('checkout.vip.pageSubtitle')}</p>
        </div>

        <div className="p-6">
          {/* 选择渠道 */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            {(['wechat', 'alipay'] as Channel[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all',
                  channel === c
                    ? 'border-leaf-500 bg-leaf-50/60'
                    : 'border-leaf-100 hover:border-leaf-300'
                )}
              >
                <span className="text-2xl">{c === 'wechat' ? '💚' : '💙'}</span>
                <div>
                  <div className="text-sm font-semibold">
                    {c === 'wechat' ? t('checkout.channelWechat') : t('checkout.channelAlipay')}
                  </div>
                  <div className="text-[10px] text-leaf-700/70">
                    {c === 'wechat' ? 'WeChat Pay' : 'Alipay'}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="grid place-items-center rounded-2xl bg-leaf-50/50 p-6">
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
                  onClick={() => setRegenTick((n) => n + 1)}
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

          {payment && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-leaf-700/70">{t('checkout.amount')}</span>
              <span className="text-2xl font-bold text-rose-600">
                {formatPrice(payment.amount)}
              </span>
            </div>
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

          {err && (
            <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {err}
            </div>
          )}

          <div className="mt-4 text-center">
            <Link href="/vip" className="text-xs text-leaf-700 hover:underline">
              ← {t('nav.vipCenter')}
            </Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}
