'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from "@/lib/client-api";
import { cn, countdown, formatPrice } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import type { Payment } from '@/lib/types';
import { PaymentQr, type PayChannel } from '@/components/payment/PaymentQr';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



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
  const params = useParams<{orderId: string;}>();
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
    api.
    post<Payment>('/api/payments', {
      bizType: 'vip',
      bizId: params.orderId,
      channel
    }).
    then(setPayment).
    catch((e) => setErr(e instanceof ApiError ? e.message : t('checkout.createFail'))).
    finally(() => setCreating(false));
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

          /* ignore */}
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
      <div className={cx(styles.r_0e12dc7d, styles.r_2cc8041e, styles.r_2cd02d11)}>
        <div className={cx(styles.r_39b2e003, styles.r_96b881c8, styles.r_f61dcff4, styles.r_db539fdb, styles.r_0478c89a, styles.r_67e74965)}>
          <h1 className={cx(styles.r_d5c9b000, styles.r_69450ef1)}>{t('checkout.vip.pageTitle')}</h1>
          <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_714816ef)}>{t('checkout.vip.pageSubtitle')}</p>
        </div>

        <div className={styles.r_0478c89a}>
          {/* 选择渠道 */}
          <div className={cx(styles.r_da019856, styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3)}>
            {(['wechat', 'alipay'] as Channel[]).map((c) =>
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={cn(cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_a217b4ea, styles.r_65935df5, styles.r_eb6e8b88, styles.r_2eba0d65, styles.r_0fe7d7d8),

              channel === c ? cx(styles.r_d3b27cd9, styles.r_a8a62ca4) : cx(styles.r_88b684d2, styles.r_a5c39c39)


              )}>

                <span className={styles.r_3febee09}>{c === 'wechat' ? '💚' : '💙'}</span>
                <div>
                  <div className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>
                    {c === 'wechat' ? t('checkout.channelWechat') : t('checkout.channelAlipay')}
                  </div>
                  <div className={cx(styles.r_1dc571a3, styles.r_69335b95)}>
                    {c === 'wechat' ? 'WeChat Pay' : 'Alipay'}
                  </div>
                </div>
              </button>
            )}
          </div>

          <div className={cx(styles.r_f3c543ad, styles.r_67d66567, styles.r_68f2db62, styles.r_9ac94195, styles.r_0478c89a)}>
            {creating || !payment ?
            <div className={cx(styles.r_f3c543ad, styles.r_4ead2714, styles.r_d16aae84, styles.r_67d66567, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_5e10cdb8, styles.r_359090c2, styles.r_6c4cc49e)}>
                {t('checkout.generatingQr', {
                channel: channel === 'wechat' ? t('checkout.channelWechat') : t('checkout.channelAlipay')
              })}
              </div> :
            expired ?
            <div className={cx(styles.r_f3c543ad, styles.r_4ead2714, styles.r_d16aae84, styles.r_67d66567, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_5e10cdb8)}>
                <div className={styles.r_751fb0d1}>⌛</div>
                <div className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_69335b95)}>{t('checkout.qrExpired')}</div>
                <button
                type="button"
                onClick={() => setRegenTick((n) => n + 1)}
                className={cx(styles.r_50d0d216, styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_f673f4a7)}>

                  {t('checkout.qrRegenerate')}
                </button>
              </div> :

            <PaymentQr
              text={payment.qrcode ?? payment.payNo}
              channel={channel}
              status={payment.status}
              scanning={payment.scanning ?? false} />

            }
          </div>

          {payment && payment.status === 'pending' && !expired && (
          abandoned ?
          <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ca6bf630)}>
                <span className={cx(styles.r_d058ca6d, styles.r_85d79ebf)}>
                  {t('checkout.abandoned')}
                </span>
                <button
              type="button"
              onClick={() => setRegenTick((n) => n + 1)}
              className={cx(styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_c82b67c8, styles.r_81be6435)}>

                  {t('checkout.regenerate')}
                </button>
              </div> :

          <div className={cx(styles.r_eccd13ef, styles.r_ca6bf630, styles.r_359090c2, styles.r_69335b95)}>
                {t('checkout.qrExpiresIn', { time: countdown(remain) })}
              </div>)

          }

          {payment &&
          <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_fc7473ca)}>
              <span className={styles.r_69335b95}>{t('checkout.amount')}</span>
              <span className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_595fceba)}>
                {formatPrice(payment.amount)}
              </span>
            </div>
          }

          {/* 仅在 mock 回落时显示 Demo 按钮 */}
          {payment && payment.status === 'pending' && !expired && payment.qrcode?.startsWith("mock://") &&
          <div className={cx(styles.r_0ab86672, styles.r_a217b4ea, styles.r_67d2289d, styles.r_eb6e8b88, styles.r_ca6bf630)}>
              <div className={cx(styles.r_d058ca6d, styles.r_85d79ebf)}>
                <b>{t('checkout.demoTip')}</b>:{t('checkout.demoTipAuction')}
              </div>
              <button
              type="button"
              disabled={confirming}
              onClick={mockConfirm}
              className={cx(styles.r_50d0d216, styles.r_931bc423, styles.r_72a4c7cd, styles.r_7ee371ab, styles.r_dd702538)}>

                {confirming ? t('checkout.processing') : t('checkout.mockConfirm')}
              </button>
            </div>
          }

          {err &&
          <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>
              {err}
            </div>
          }

          <div className={cx(styles.r_0ab86672, styles.r_ca6bf630)}>
            <Link href="/vip" className={cx(styles.r_359090c2, styles.r_5f6a59f1, styles.r_f673f4a7)}>
              ← {t('nav.vipCenter')}
            </Link>
          </div>
        </div>
      </div>
    </Shell>);

}