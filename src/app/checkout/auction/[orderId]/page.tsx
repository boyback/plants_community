'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from "@/lib/client-api";
import { cn, countdown, formatPrice } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import {
  AddressPicker,
  type AddressPickerValue,
  pickerValueToOrderBody,
  validateAddressPicker } from
'@/components/address/AddressPicker';
import type { Order, Payment } from '@/lib/types';
import { PaymentQr, type PayChannel } from '@/components/payment/PaymentQr';
import { AlipayPagePayButton } from '@/components/payment/AlipayPagePayButton';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



type Channel = PayChannel;

export default function AuctionCheckoutPage() {
  const params = useParams<{orderId: string;}>();
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
  const [err, setErr] = useState<string | null>(null);
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
    api.
    get<Order>(`/api/orders/${params.orderId}`).
    then((o) => {
      setOrder(o);
      // 已经填了地址,直接进入支付
      if (o.shipName && o.shipPhone && o.shipAddress) {
        setAddrSaved(true);
      }
    }).
    catch((e) => setErr(e instanceof ApiError ? e.message : t('checkout.loadFail'))).
    finally(() => setLoading(false));
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
        channel
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
            toast.success(t('checkout.paySuccessShipping'));
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

  if (loading) {
    return (
      <Shell>
        <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</div>
      </Shell>);

  }

  if (!order) {
    return (
      <Shell>
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>😕</div>
          <div className={cx(styles.r_eccd13ef, styles.r_4ee73492, styles.r_e83a7042)}>{err ?? t('checkout.orderNotFound')}</div>
          <Link href="/auction" className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
            {t('checkout.backToAuction')}
          </Link>
        </div>
      </Shell>);

  }

  if (order.source !== 'auction') {
    return (
      <Shell>
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>😕</div>
          <div className={cx(styles.r_eccd13ef, styles.r_4ee73492, styles.r_e83a7042)}>{t('checkout.notAuctionOrder')}</div>
          <Link href={`/checkout/${order.id}`} className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
            {t('checkout.goNormalPay')}
          </Link>
        </div>
      </Shell>);

  }

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

  const balance = order.totalPrice - order.depositPaid;
  const expired = payment?.status === 'expired';
  const paid = payment?.status === 'paid';
  const remain = payment ? new Date(payment.expireAt).getTime() - now : 0;

  return (
    <Shell>
      <div className={cx(styles.r_0e12dc7d, styles.r_f3c543ad, styles.r_5f6f3031, styles.r_d7c83398, styles.r_0d304f90, styles.r_e7849c79)}>
        <div className={styles.r_0478c89a}>
          <div className={cx(styles.r_65281709, styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_e0467cf5, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_b54428d1)}>
            {t('checkout.auctionOrderBadge')}
          </div>
          <h1 className={cx(styles.r_b6b02c0e, styles.r_d5c9b000, styles.r_e83a7042, styles.r_399e11a5)}>{t('checkout.pageTitle')}</h1>
          <div className={cx(styles.r_359090c2, styles.r_69335b95)}>{t('checkout.orderNo')} {order.orderNo}</div>

          {/* 价格明细 */}
          <div className={cx(styles.r_fb77735e, styles.r_68f2db62, styles.r_9ac94195, styles.r_8e63407b)}>
            <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_fc7473ca)}>
              <div>
                <div className={cx(styles.r_359090c2, styles.r_69335b95)}>{t('checkout.winningPrice')}</div>
                <div className={styles.r_e83a7042}>{formatPrice(order.totalPrice)}</div>
              </div>
              <div>
                <div className={cx(styles.r_359090c2, styles.r_69335b95)}>{t('checkout.paidDeposit')}</div>
                <div className={cx(styles.r_e83a7042, styles.r_5f6a59f1)}>
                  -{formatPrice(order.depositPaid)}
                </div>
              </div>
            </div>
            <div className={cx(styles.r_eccd13ef, styles.r_b950dda2, styles.r_66691b5f, styles.r_ce335a8e, styles.r_60fbb771, styles.r_b7012bb2, styles.r_8ef2268e)}>
              <span className={cx(styles.r_359090c2, styles.r_69335b95)}>{t('checkout.finalAmount')}</span>
              <span className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_595fceba)}>{formatPrice(balance)}</span>
            </div>
          </div>

          {/* 收货地址 */}
          {!addrSaved ?
          <div className={styles.r_31f25533}>
              <h2 className={cx(styles.r_a77ed4d9, styles.r_fc7473ca, styles.r_e83a7042)}>{t('checkout.ship.pickTitle')}</h2>
              <AddressPicker value={addr} onChange={setAddr} />
              <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_77c08e01)}>
                <button
                type="button"
                onClick={submitAddress}
                disabled={addrSubmitting}
                className={styles.r_4f43b5cb}>

                  {addrSubmitting ? t('checkout.ship.saving') : t('checkout.ship.confirmAddr')}
                </button>
              </div>
            </div> :

          <div className={styles.r_31f25533}>
              <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_fc7473ca)}>
                <span className={styles.r_e83a7042}>{t('checkout.ship.currentAddr')}</span>
                <button
                type="button"
                onClick={() => setAddrSaved(false)}
                className={cx(styles.r_359090c2, styles.r_5f6a59f1, styles.r_f673f4a7)}>

                  {t('checkout.ship.changeAddr')}
                </button>
              </div>
              <div className={cx(styles.r_a217b4ea, styles.r_a8a62ca4, styles.r_eb6e8b88, styles.r_359090c2)}>
                <div>
                  <span className={cx(styles.r_2689f395, styles.r_399e11a5)}>{order.shipName}</span>
                  <span className={cx(styles.r_c68af998, styles.r_69335b95)}>{order.shipPhone}</span>
                </div>
                <div className={cx(styles.r_15e1b1f4, styles.r_21d33c50)}>{order.shipAddress}</div>
              </div>
            </div>
          }

          {/* 支付方式 + 二维码(仅地址确认后展示) */}
          {addrSaved &&
          <>
              <div className={styles.r_31f25533}>
                <div className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}>{t('checkout.pickChannel')}</div>
                <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_1004c0c3)}>
                  <ChannelCard
                  active={channel === 'wechat'}
                  onClick={() => setChannel('wechat')}
                  icon="💚"
                  title={t('checkout.channelWechat')} />

                  <ChannelCard
                  active={channel === 'alipay'}
                  onClick={() => setChannel('alipay')}
                  icon="💙"
                  title={t('checkout.channelAlipay')} />

                  <ChannelCard
                  active={channel === 'escrow'}
                  onClick={() => setChannel('escrow')}
                  icon="🛡️"
                  title="官方中介" />

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
                  onClick={() => createPay()}
                  className={cx(styles.r_50d0d216, styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_f673f4a7)}>

                      {t('checkout.qrRegenerate')}
                    </button>
                  </div> :

              payment.pagePayUrl ?
              <AlipayPagePayButton pagePayUrl={payment.pagePayUrl} /> :
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
                onClick={() => createPay()}
                className={cx(styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_c82b67c8, styles.r_81be6435)}>

                      {t('checkout.regenerate')}
                    </button>
                  </div> :

            <div className={cx(styles.r_eccd13ef, styles.r_ca6bf630, styles.r_359090c2, styles.r_69335b95)}>
                    {t('checkout.qrExpiresIn', { time: countdown(remain) })}
                  </div>)

            }

              {paid &&
            <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_5f6a59f1)}>
                  {t('checkout.paidRedirect')}
                </div>
            }
            </>
          }

          {err &&
          <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>
              {err}
            </div>
          }
        </div>

        {/* 右栏:订单详情 */}
        <div className={styles.r_3e7ce58d}>
          <div className={styles.r_2cd02d11}>
            <div className={cx(styles.r_65fdbade, styles.r_88b684d2, styles.r_d139dd09, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_e83a7042)}>
              {t('checkout.itemInfo')}
            </div>
            <div className={styles.r_8e63407b}>
              <div className={cx(styles.r_60fbb771, styles.r_1004c0c3)}>
                <div className={cx(styles.r_d89972fe, styles.r_acaee621, styles.r_baceed34, styles.r_012fbd12, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_7ebecbb6)}>
                  {order.auctionCover && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={order.auctionCover}
                    alt={order.auctionTitle ?? ''}
                    className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)} />)

                  }
                </div>
                <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                  <div className={cx(styles.r_054cb4e3, styles.r_359090c2, styles.r_399e11a5)}>
                    {order.auctionTitle ?? t('checkout.itemLabel')}
                  </div>
                  {order.auctionId &&
                  <Link
                    href={`/auction/${order.auctionId}`}
                    className={cx(styles.r_b6b02c0e, styles.r_52083e7d, styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_f673f4a7)}>

                      {t('checkout.viewAuctionDetail')}
                    </Link>
                  }
                </div>
              </div>
            </div>
          </div>

          <div className={cx(styles.r_8e63407b, styles.r_d058ca6d, styles.r_69335b95)}>
            <div className={cx(styles.r_65281709, styles.r_2689f395, styles.r_5f6a59f1)}>{t('checkout.auctionNote.title')}</div>
            <ul className={cx(styles.r_f242aff2, styles.r_1f33b438, styles.r_e2eedc57)}>
              <li>{t('checkout.auctionNote.item1')}</li>
              <li>{t('checkout.auctionNote.item2')}</li>
              <li>{t('checkout.auctionNote.item3')}</li>
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
  title





}: {active: boolean;onClick: () => void;icon: string;title: string;}) {
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
      <div className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>{title}</div>
      {active &&
      <span className={cx(styles.r_fb56d9cf, styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_45499621, styles.r_359090c2, styles.r_72a4c7cd)}>
          ✓
        </span>
      }
    </button>);

}
