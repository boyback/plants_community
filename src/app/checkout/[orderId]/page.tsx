'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from "@/lib/client-api";
import { cn, formatPrice } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import type { MarketTradeMode, Order, Payment } from '@/lib/types';
import { AlipayPagePayButton } from '@/components/payment/AlipayPagePayButton';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



type Channel = 'alipay' | 'external';

export default function CheckoutPage() {
  const params = useParams<{orderId: string;}>();
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useI18n();

  const [order, setOrder] = useState<Order | null>(null);
  const [channel, setChannel] = useState<Channel>('alipay');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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
    if (channel === 'external') {
      setPayment(null);
      setCreating(false);
      setErr(null);
      return;
    }
    setCreating(true);
    setErr(null);
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
          setPayment((current) => ({
            ...p,
            pagePayUrl: p.pagePayUrl ?? current?.pagePayUrl
          }));
          if (p.status === 'paid') {
            everScanned = false;
            notScanningStreak = 0;
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            toast.success(t('checkout.paySuccess'));
            await refresh();
            router.replace(`/checkout/done?payNo=${encodeURIComponent(p.payNo)}&orderId=${encodeURIComponent(p.bizId)}&bizType=order`);
          } else if (p.status === 'expired' || p.status === 'cancelled') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          } else if (p.status === 'pending') {
            if (p.scanning) {
              everScanned = true;
              notScanningStreak = 0;
            } else if (everScanned) {
              notScanningStreak += 1;
            }
          }
        } catch {










          // ignore
        }}, 1500);}, 4000);return () => {clearTimeout(startTimer);if (pollTimerRef.current) clearInterval(pollTimerRef.current);};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.payNo]);

  if (loading) {
    return (
      <Shell withSidebar={false}>
        <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</div>
      </Shell>);

  }

  if (!order) {
    return (
      <Shell withSidebar={false}>
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
      <Shell withSidebar={false}>
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
  const orderCover = order.product?.cover ?? order.listingItem?.cover ?? order.listing?.cover ?? order.auctionCover ?? '';
  const orderTitle = order.product?.title ?? order.listingItem?.title ?? order.listing?.title ?? order.auctionTitle ?? t('checkout.orderLabel');
  const tradeModes = normalizeCheckoutTradeModes(order.listing?.tradeModes, order.listing?.tradeMode ?? order.tradeMode);
  const canUseExternal = order.source === 'product' && tradeModes.includes('external');
  const externalInfo = order.listing?.externalUrl?.trim() ?? '';
  const externalNote = order.listing?.contactNote?.trim() ?? '';
  const externalMessageHref = order.seller?.id && order.listing?.id
    ? `/messages?to=${order.seller.id}&listing=${order.listing.id}`
    : null;

  return (
    <Shell withSidebar={false}>
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
                active={channel === 'alipay'}
                onClick={() => setChannel('alipay')}
                icon={<Icon name="shop" size={22} />}
                title="平台担保交易"
                subtitle="支付宝付款" />

              {canUseExternal && (
                <ChannelCard
                  active={channel === 'external'}
                  onClick={() => setChannel('external')}
                  icon={<Icon name="link" size={22} />}
                  title="自行联系 / 三方平台"
                  subtitle="查看站外信息" />
              )}
            </div>
            {channel === 'external' &&
            <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_67d2289d, styles.r_eb6e8b88, styles.r_359090c2, styles.r_7054e276, styles.r_67e74965)}>
                <div className={cx(styles.r_65281709, styles.r_e83a7042)}>站外交易信息</div>
                {externalInfo ? (
                  <div className={styles.externalInfoText}>{externalInfo}</div>
                ) : (
                  <div className={styles.externalInfoText}>卖家暂未填写站外信息，请先通过站内私信确认。</div>
                )}
                {externalNote && (
                  <div className={styles.externalInfoNote}>{externalNote}</div>
                )}
                <div className={cx(styles.r_50d0d216, styles.r_85d79ebf)}>
                  自行联系 / 三方平台交易不经过平台收款、发货、退款和结算流程，请自行核对对方身份与商品信息。
                </div>
                {externalMessageHref && (
                  <ButtonLink href={externalMessageHref} size="sm" className={styles.externalMessageButton}>
                    <Icon name="message" size={14} />
                    去通知卖家
                  </ButtonLink>
                )}
              </div>
            }
          </div>

          <div className={cx(styles.r_31f25533, styles.r_f3c543ad, styles.r_67d66567, styles.r_68f2db62, styles.r_9ac94195, styles.r_0478c89a)}>
            {channel === 'external' ?
            <div className={styles.externalInfoEmpty}>
              <Icon name="link" size={28} />
              <div>已显示站外信息</div>
              <p>如需继续平台担保交易，请切回支付宝付款。</p>
            </div> :
            paid ?
            <div className={cx(styles.r_f3c543ad, styles.r_4ead2714, styles.r_d16aae84, styles.r_67d66567, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_5e10cdb8, styles.r_359090c2, styles.r_6c4cc49e)}>
              正在跳转支付结果...
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
            creating || !payment ?
            <AlipayPagePayButton /> :
            <AlipayPagePayButton pagePayUrl={payment.pagePayUrl} />
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
    </Shell>);

}

function ChannelCard({
  active,
  onClick,
  icon,
  title,
  subtitle






}: {active: boolean;onClick: () => void;icon: ReactNode;title: string;subtitle: string;}) {
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

function normalizeCheckoutTradeModes(
  modes: MarketTradeMode[] | undefined,
  fallback?: Order['tradeMode']
): Array<'online_payment' | 'external'> {
  const selected = Array.isArray(modes) && modes.length ? modes : fallback ? [fallback] : [];
  const normalized = selected.map((mode) => mode === 'platform_escrow' ? 'online_payment' : mode);
  return Array.from(new Set(['online_payment' as const, ...normalized.filter((mode): mode is 'online_payment' | 'external' => mode === 'online_payment' || mode === 'external')]));
}
