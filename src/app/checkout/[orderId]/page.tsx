'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from "@/lib/client-api";
import { cn, countdown, formatPrice } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import type { Order, Payment } from '@/lib/types';
import { PaymentQr, type PayChannel } from '@/components/payment/PaymentQr';
import { AlipayPagePayButton } from '@/components/payment/AlipayPagePayButton';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



type Channel = PayChannel;

export default function CheckoutPage() {
  const params = useParams<{orderId: string;}>();
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useI18n();

  const [order, setOrder] = useState<Order | null>(null);
  const [channel, setChannel] = useState<Channel>('alipay');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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
    api.
    get<Order>(`/api/orders/${params.orderId}`).
    then((o) => setOrder(o)).
    catch((e) => setErr(e instanceof ApiError ? e.message : t('checkout.loadFail'))).
    finally(() => setLoading(false));
  }, [authLoading, user, params?.orderId, router]);

  // 2. 切换支付渠道或手动刷新时,重新拉起支付单
  useEffect(() => {
    if (!order) return;
    if (order.status !== 'pending_payment') return;
    setCreating(true);
    setErr(null);
    setAbandoned(false);
    api.
    post<Payment>('/api/payments', {
      bizType: "order",
      bizId: order.id,
      channel
    }).
    then((p) => setPayment(p)).
    catch((e) => setErr(e instanceof ApiError ? e.message : t('checkout.createFail'))).
    finally(() => setCreating(false));
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
            toast.success(t('checkout.paySuccessRedirect'));
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
        }}, 1500);}, 4000);const tick = setInterval(() => setNow(Date.now()), 1000);return () => {clearTimeout(startTimer);if (pollTimerRef.current) clearInterval(pollTimerRef.current);clearInterval(tick);};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.payNo]);

  if (loading) {
    return (
      <Shell>
        <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</div>
      </Shell>);

  }

  if (!order) {
    return (
      <Shell>
        <div className={cx(styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>😕</div>
          <div className={cx(styles.r_eccd13ef, styles.r_4ee73492, styles.r_e83a7042)}>{err ?? t('checkout.orderNotFound')}</div>
          <Link href="/market" className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
            {t('checkout.backToMarket')}
          </Link>
        </div>
      </Shell>);

  }

  // 如果订单已完成或非待支付,引导
  if (order.status !== 'pending_payment') {
    return (
      <Shell>
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>✅</div>
          <div className={cx(styles.r_eccd13ef, styles.r_4ee73492, styles.r_e83a7042)}>{t('checkout.noNeedPay')}</div>
          <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_69335b95)}>
            {t('checkout.currentStatus')}:{t(`orders.status.${order.status}`) || order.status}
          </div>
          <Link href="/orders" className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
            {t('checkout.viewMyOrders')}
          </Link>
        </div>
      </Shell>);

  }

  const expired = payment && payment.status === 'expired';
  const paid = payment && payment.status === 'paid';
  const remain = payment ? new Date(payment.expireAt).getTime() - now : 0;
  const orderCover = order.product?.cover ?? order.listingItem?.cover ?? order.listing?.cover ?? order.auctionCover ?? '';
  const orderTitle = order.product?.title ?? order.listingItem?.title ?? order.listing?.title ?? order.auctionTitle ?? t('checkout.orderLabel');

  return (
    <Shell>
      {/* 移动端:顶部一条简化摘要 + 黿底总额 */}
      <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_a327049c)}>
        {orderCover &&
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={orderCover}
          alt=""
          className={cx(styles.r_426b8b75, styles.r_d854e569, styles.r_012fbd12, styles.r_07389a77, styles.r_7d85d0c2)} />

        }
        <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_359090c2)}>
          <div className={cx(styles.r_f50e2015, styles.r_399e11a5)}>
            {orderTitle}
          </div>
          <div className={cx(styles.r_1dc571a3, styles.r_69335b95)}>
            × {order.quantity} · {order.shipName ?? '—'}
          </div>
        </div>
        <div className={cx(styles.r_fc7473ca, styles.r_69450ef1, styles.r_595fceba)}>
          {formatPrice(order.totalPrice)}
        </div>
      </div>

      <div className={cx(styles.r_0e12dc7d, styles.r_f3c543ad, styles.r_5f6f3031, styles.r_d7c83398, styles.r_0d304f90, styles.r_8d7541cb, styles.r_e7849c79, styles.r_9041e6d1)}>
        {/* 主体:支付方式 + 二维码 */}
        <div className={styles.r_0478c89a}>
          <h1 className={cx(styles.r_d5c9b000, styles.r_e83a7042, styles.r_399e11a5)}>{t('checkout.pageTitle')}</h1>
          <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_69335b95)}>{t('checkout.orderNo')} {order.orderNo}</div>

          <div className={styles.r_31f25533}>
            <div className={cx(styles.r_359090c2, styles.r_69335b95)}>{t('checkout.amount')}</div>
            <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_b7012bb2, styles.r_77a2a20e)}>
              <span className={cx(styles.r_751fb0d1, styles.r_69450ef1, styles.r_595fceba)}>
                {formatPrice(order.totalPrice)}
              </span>
              {order.pointsBackTotal > 0 &&
              <span className={cx(styles.r_359090c2, styles.r_69335b95)}>
                  {t('checkout.pointsBack', { n: order.pointsBackTotal })}
                </span>
              }
            </div>
          </div>

          <div className={styles.r_31f25533}>
            <div className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_2689f395)}>{t('checkout.pickChannel')}</div>
            <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_1004c0c3)}>
              <ChannelCard
                active={channel === 'wechat'}
                onClick={() => setChannel('wechat')}
                icon="💚"
                title={t('checkout.channelWechat')}
                subtitle="WeChat Pay" />

              <ChannelCard
                active={channel === 'alipay'}
                onClick={() => setChannel('alipay')}
                icon="💙"
                title={t('checkout.channelAlipay')}
                subtitle="Alipay" />

              <ChannelCard
                active={channel === 'escrow'}
                onClick={() => setChannel('escrow')}
                icon="🛡️"
                title="官方中介"
                subtitle="担保交易" />

            </div>
            {channel === 'escrow' &&
            <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_67d2289d, styles.r_eb6e8b88, styles.r_359090c2, styles.r_7054e276, styles.r_67e74965)}>
                <div className={cx(styles.r_65281709, styles.r_e83a7042)}>🛡️ 官方中介担保流程</div>
                <ol className={cx(styles.r_a0df6401, styles.r_e2eedc57, styles.r_fdb4af3a)}>
                  <li>买家把货款转入官方平台担保账户</li>
                  <li>卖家收到「平台已收款」通知后发货</li>
                  <li>买家收货确认后,平台把货款转给卖家</li>
                  <li>纠纷可申请客服仲裁,平台收 1% 手续费</li>
                </ol>
                <div className={cx(styles.r_50d0d216, styles.r_85d79ebf)}>
                  📩 选择此方式后,请联系客服 admin@plantcommunity.cn 获取担保账户
                </div>
              </div>
            }
          </div>

          <div className={cx(styles.r_31f25533, styles.r_f3c543ad, styles.r_67d66567, styles.r_68f2db62, styles.r_9ac94195, styles.r_0478c89a)}>
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

            <>
                {payment.pagePayUrl ?
                <AlipayPagePayButton pagePayUrl={payment.pagePayUrl} /> :
                <PaymentQr
                  text={payment.qrcode ?? payment.payNo}
                  channel={channel}
                  status={payment.status}
                  scanning={payment.scanning ?? false} />
                }

                <div className={cx(styles.r_eccd13ef, styles.r_ca6bf630, styles.r_359090c2, styles.r_5f6a59f1)}>
                  {paid ?
                <span className={cx(styles.r_5f6a59f1, styles.r_e83a7042)}>{t('checkout.paidRedirect')}</span> :
                abandoned ?
                <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_44ee8ba0)}>
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

                <div className={cx(styles.r_b6b02c0e, styles.r_1dc571a3, styles.r_6c4cc49e)}>
                      {t('checkout.qrExpiresIn', { time: countdown(remain) })}
                    </div>
                }
                </div>
              </>
            }
          </div>

          {err &&
          <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>
              {err}
            </div>
          }
        </div>

        {/* 订单摘要 */}
        <div className={styles.r_3e7ce58d}>
          <div className={styles.r_2cd02d11}>
            <div className={cx(styles.r_65fdbade, styles.r_88b684d2, styles.r_d139dd09, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_e83a7042)}>
              {t('checkout.orderDetail')}
            </div>
            <div className={styles.r_8e63407b}>
              <div className={cx(styles.r_60fbb771, styles.r_1004c0c3)}>
                <div className={cx(styles.r_d89972fe, styles.r_acaee621, styles.r_baceed34, styles.r_012fbd12, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_7ebecbb6)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={orderCover}
                    alt={orderTitle}
                    className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)} />

                </div>
                <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                  <div className={cx(styles.r_054cb4e3, styles.r_359090c2, styles.r_399e11a5)}>
                    {orderTitle}
                  </div>
                  <div className={cx(styles.r_b6b02c0e, styles.r_d058ca6d, styles.r_69335b95)}>
                    {t('checkout.quantity')} × {order.quantity}
                  </div>
                </div>
                <div className={cx(styles.r_359090c2, styles.r_e83a7042, styles.r_595fceba)}>
                  {formatPrice(order.totalPrice)}
                </div>
              </div>
              <div className={cx(styles.r_eccd13ef, styles.r_da7c36cd, styles.r_b950dda2, styles.r_88b684d2, styles.r_ce335a8e, styles.r_d058ca6d, styles.r_21d33c50)}>
                <div>👤 {order.shipName} · {order.shipPhone}</div>
                <div>📍 {order.shipAddress}</div>
              </div>
            </div>
          </div>

          <div className={cx(styles.r_8e63407b, styles.r_d058ca6d, styles.r_69335b95)}>
            <div className={cx(styles.r_65281709, styles.r_2689f395, styles.r_5f6a59f1)}>{t('checkout.guarantee.title')}</div>
            <ul className={cx(styles.r_f242aff2, styles.r_1f33b438, styles.r_e2eedc57)}>
              <li>{t('checkout.guarantee.item1')}</li>
              <li>{t('checkout.guarantee.item2')}</li>
              <li>{t('checkout.guarantee.item3')}</li>
              <li>{t('checkout.guarantee.item4')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 移动端粘底:总额 + 倒计时(支付未完成时显示) */}
      {payment && payment.status === 'pending' && !expired &&
      <div
        className={cx(styles.r_7bc55599, styles.r_3f6397bf, styles.r_189f036c, styles.r_0f2fff0a, styles.r_b950dda2, styles.r_88b684d2, styles.r_f5ebd4d0, styles.r_0b2e8c28, styles.r_a327049c)}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

          <div className={cx(styles.r_0e12dc7d, styles.r_60fbb771, styles.r_2cc8041e, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_f0faeb26, styles.r_1b2d54a3)}>
            <div>
              <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>{t('checkout.amount')}</div>
              <div className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_595fceba)}>
                {formatPrice(order.totalPrice)}
              </div>
            </div>
            <div className={styles.r_308fc069}>
              <div className={cx(styles.r_1dc571a3, styles.r_6c4cc49e)}>
                {t('checkout.qrExpiresIn', { time: countdown(remain) })}
              </div>
              <div className={cx(styles.r_15e1b1f4, styles.r_1dc571a3, styles.r_69335b95)}>
                {t('checkout.scanWith', {
                channel: channel === 'wechat' ? t('checkout.channelWechat') : t('checkout.channelAlipay')
              })}
              </div>
            </div>
          </div>
        </div>
      }
    </Shell>);

}

function ChannelCard({
  active,
  onClick,
  icon,
  title,
  subtitle






}: {active: boolean;onClick: () => void;icon: string;title: string;subtitle: string;}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_a217b4ea, styles.r_65935df5, styles.r_eb6e8b88, styles.r_2eba0d65, styles.r_0fe7d7d8),

      active ? cx(styles.r_d3b27cd9, styles.r_a8a62ca4) : cx(styles.r_88b684d2, styles.r_a5c39c39)
      )}>

      <div className={cx(styles.r_f3c543ad, styles.r_426b8b75, styles.r_d854e569, styles.r_67d66567, styles.r_5f22e64f, styles.r_5e10cdb8, styles.r_3febee09, styles.r_438b2237)}>
        {icon}
      </div>
      <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
        <div className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>{title}</div>
        <div className={cx(styles.r_1dc571a3, styles.r_69335b95)}>{subtitle}</div>
      </div>
      {active &&
      <span className={cx(styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_45499621, styles.r_359090c2, styles.r_72a4c7cd)}>
          ✓
        </span>
      }
    </button>);

}
