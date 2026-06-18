'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Empty } from '@/components/ui/Empty';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import { cn, formatDateTime, formatPrice } from '@/lib/utils';
import { usePullToRefresh, PullIndicator } from '@/lib/hooks/usePullToRefresh';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { RichTextView } from '@/components/richtext/RichTextView';
import type { Order, OrderStatus } from '@/lib/types';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';



const STATUS_I18N_KEY: Record<OrderStatus | 'all', string> = {
  all: "orders.statusAll",
  pending_payment: "orders.status.pending_payment",
  pending_ship: "orders.status.pending_ship",
  pending_receipt: "orders.status.pending_receipt",
  pending_review: "orders.status.pending_review",
  completed: "orders.status.completed",
  cancelled: "orders.status.cancelled",
  refunded: "orders.status.refunded"
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment: cx(styles.r_67d2289d, styles.r_85d79ebf),
  pending_ship: cx(styles.r_3cc00fe7, styles.r_65b7dd19),
  pending_receipt: cx(styles.r_3b5cf6c0, styles.r_06fd2bc1),
  pending_review: cx(styles.r_7ebecbb6, styles.r_5f6a59f1),
  completed: cx(styles.r_f2b23104, styles.r_e7eab4cb),
  cancelled: cx(styles.r_7ebecbb6, styles.r_5f6a59f1),
  refunded: cx(styles.r_0759a0f1, styles.r_b54428d1)
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OrdersInner />
    </Suspense>);

}

function OrdersInner() {
  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') ?? 'buyer') as 'buyer' | 'seller';

  const [role, setRole] = useState<'buyer' | 'seller'>(initialRole);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('role', role);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    try {
      const data = await api.get<Order[]>(`/api/orders?${params.toString()}`);
      setOrders(data);
    } catch {










      // ignore
    } finally {setLoading(false);}};const { bind, status: pullStatus, progress: pullProgress } = usePullToRefresh(load);useEffect(() => {if (authLoading) return;if (!user) {setLoading(false);
        return;
      }
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, authLoading, role, statusFilter]);

  if (!authLoading && !user) {
    return (
      <Shell withSidebar={false}>
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>📦</div>
          <div className={cx(styles.r_eccd13ef, styles.r_42536e69, styles.r_e83a7042)}>{t('error.unauthorized')}</div>
          <Link href="/login?redirect=/orders" className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
            {t('nav.login')}
          </Link>
        </div>
      </Shell>);

  }

  return (
    <Shell withSidebar={false}>
      <div {...bind}>
        <PullIndicator status={pullStatus} progress={pullProgress} />
      <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <div>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>{t("orders.title")}</h1>
        </div>
        <Link href="/market" className={styles.r_4f43b5cb}>
          {t('market.title')}
        </Link>
      </div>

      {/* 我买的 / 我卖的 */}
      <Card padding="none" className={cx(styles.r_da019856, styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_eb6a3cef, styles.r_359090c2)}>
        {(['buyer', 'seller'] as const).map((r) =>
          <button
            key={r}
            onClick={() => setRole(r)}
            className={cn(cx(styles.r_ac204c10, styles.r_f0faeb26, styles.r_ec0091ee),

            role === r ? cx(styles.r_45499621, styles.r_72a4c7cd) : cx(styles.r_eb6abb1f, styles.r_5756b7b4)


            )}>

            {r === 'buyer' ? t("orders.tabBuyer") : t("orders.tabSeller")}
          </button>
          )}
      </Card>

      {/* 状态筛选 */}
      <Card padding="compact" className={cx(styles.r_fb88ccaa, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
        {(Object.keys(STATUS_I18N_KEY) as (OrderStatus | 'all')[]).map((s) =>
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(cx(styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2),

            statusFilter === s ? cx(styles.r_d3b27cd9, styles.r_45499621, styles.r_72a4c7cd) : cx(styles.r_691861bc, styles.r_5e10cdb8, styles.r_eb6abb1f, styles.r_5756b7b4)


            )}>

            {t(STATUS_I18N_KEY[s])}
          </button>
          )}
      </Card>

      {loading ?
        <Card className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</Card> :
        orders.length === 0 ?
        <Card>
          <Empty icon="📦" title={t("orders.title")} desc={t('market.title')} />
        </Card> :

        <div className={styles.r_6ed543e2}>
          {orders.map((o) =>
          <OrderRow key={o.id} order={o} role={role} onRefresh={() => {void load();refresh();}} />
          )}
        </div>
        }
      </div>
    </Shell>);

}

function OrderRow({
  order,
  role,
  onRefresh




}: {order: Order;role: 'buyer' | 'seller';onRefresh: () => void;}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [showShip, setShowShip] = useState(false);
  const [trackingNo, setTrackingNo] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewTextJson, setReviewTextJson] = useState<unknown>(null);
  const [reviewKey, setReviewKey] = useState(0);
  const [showRefund, setShowRefund] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const call = async (path: string, body?: unknown) => {
    setBusy(true);
    try {
      await api.post(path, body);
      onRefresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('error.generic'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="none" className={styles.r_8e63407b}>
      <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2, styles.r_69335b95)}>
        <span>{t("orders.orderNo", { no: order.orderNo })}</span>
        <span>·</span>
        <span>{formatDateTime(order.createdAt)}</span>
        <span className={cn(cx(styles.r_fb56d9cf, styles.r_ac204c10, styles.r_d5eab218, styles.r_465609a2), STATUS_COLOR[order.status])}>
          {t(STATUS_I18N_KEY[order.status])}
        </span>
      </div>

      <Link
        href={
        order.source === 'auction' && order.auctionId ?
        `/auction/${order.auctionId}` :
        order.listing ?
        `/market/${order.listing.id}` :
        order.product ?
        `/market/${order.product.id}` :
        '#'
        }
        className={cx(styles.r_60fbb771, styles.r_1004c0c3, styles.r_a217b4ea, styles.r_efb55408, styles.r_eb6e8b88, styles.r_5756b7b4)}>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={order.product?.cover ?? order.listingItem?.cover ?? order.listing?.cover ?? order.auctionCover ?? ''}
          alt={order.product?.title ?? order.listingItem?.title ?? order.listing?.title ?? order.auctionTitle ?? ''}
          className={cx(styles.r_acaee621, styles.r_baceed34, styles.r_012fbd12, styles.r_5f22e64f, styles.r_7d85d0c2)} />

        <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
            {order.source === 'auction' &&
            <span className={cx(styles.r_07389a77, styles.r_e0467cf5, styles.r_d8e0e382, styles.r_e0988086, styles.r_b54428d1)}>🔨 {t("orders.source.auction")}</span>
            }
            <span className={cx(styles.r_f50e2015, styles.r_fc7473ca)}>
              {order.product?.title ?? order.listingItem?.title ?? order.listing?.title ?? order.auctionTitle ?? t("orders.source.product")}
            </span>
          </div>
          <div className={cx(styles.r_15e1b1f4, styles.r_d058ca6d, styles.r_69335b95)}>
            × {order.quantity}
          </div>
          {order.shipName &&
          <div className={cx(styles.r_15e1b1f4, styles.r_d058ca6d, styles.r_69335b95)}>
              📍 {order.shipName} · {order.shipPhone} · {order.shipAddress}
            </div>
          }
          {order.trackingNo &&
          <div className={cx(styles.r_15e1b1f4, styles.r_d058ca6d, styles.r_69335b95)}>
              📦 {t("orders.tracking", { no: order.trackingNo })}
            </div>
          }
        </div>
        <div className={styles.r_308fc069}>
          <div className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_595fceba)}>
            {formatPrice(order.totalPrice)}
          </div>
          {order.depositPaid > 0 &&
          <div className={cx(styles.r_1dc571a3, styles.r_69335b95)}>
              已抵 ¥{(order.depositPaid / 100).toFixed(0)}
            </div>
          }
          {order.pointsBackTotal > 0 &&
          <div className={cx(styles.r_1dc571a3, styles.r_69335b95)}>返 {order.pointsBackTotal} 钻石</div>
          }
        </div>
      </Link>

      {/* 操作按钮 */}
      <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77c08e01, styles.r_77a2a20e)}>
        {role === 'buyer' && order.status === 'pending_payment' &&
        <>
            <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => call(`/api/orders/${order.id}/cancel`)}>

              {t("orders.actions.cancel")}
            </Button>
            <ButtonLink
            href={
            order.source === 'auction' ?
            `/checkout/auction/${order.id}` :
            `/checkout/${order.id}`
            }
            size="sm">

              {order.source === 'auction' ? t('auction.payBalance') : t("orders.actions.pay")}
            </ButtonLink>
          </>
        }
        {role === 'seller' && order.status === 'pending_ship' &&
        <Button
          type="button"
          size="sm"
          onClick={() => setShowShip(true)}
        >

            {t("orders.actions.ship")}
          </Button>
        }
        {role === 'buyer' && order.status === 'pending_receipt' &&
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => call(`/api/orders/${order.id}/receive`)}>

            {t("orders.actions.confirm")}
          </Button>
        }
        {role === 'buyer' && order.status === 'pending_review' &&
        <Button
          type="button"
          size="sm"
          onClick={() => setShowReview(true)}
        >

            {t("orders.actions.review")}
          </Button>
        }
        {role === 'buyer' &&
        ['pending_ship', 'pending_receipt', 'pending_review'].includes(order.status) &&
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowRefund(true)}
        >

              {t("orders.actions.review")}
            </Button>
        }
      </div>

      {order.status === 'completed' && order.reviewRating &&
      <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_a8a62ca4, styles.r_eb6e8b88, styles.r_359090c2)}>
          <div className={styles.r_5f6a59f1}>
            ⭐ {'★'.repeat(order.reviewRating)}{'☆'.repeat(5 - order.reviewRating)}
          </div>
          <RichTextView
          json={order.reviewTextJson}
          html={order.reviewText}
          text={order.reviewTextPlain}
          size="sm"
          className={styles.r_b6b02c0e} />

        </div>
      }

      {order.refundReason &&
      <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_eb6e8b88, styles.r_359090c2, styles.r_6699d429)}>
          {order.refundReason}
        </div>
      }

      {/* 弹窗们 */}
      {showShip &&
      <Modal title={t("orders.actions.ship")} onClose={() => setShowShip(false)}>
          <Input
          className="input"
          value={trackingNo}
          onChange={(e) => setTrackingNo(e.target.value)}
          placeholder={t("orders.inputTracking")} />

          <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowShip(false)}>
              {t('common.cancel')}
            </Button>
            <Button
            type="button"
            size="sm"
            disabled={!trackingNo.trim() || busy}
            onClick={async () => {
              await call(`/api/orders/${order.id}/ship`, { trackingNo: trackingNo.trim() });
              setShowShip(false);
              setTrackingNo('');
            }}>

              {t("orders.actions.ship")}
            </Button>
          </div>
        </Modal>
      }

      {showReview &&
      <Modal title={t("orders.actions.review")} onClose={() => setShowReview(false)}>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_3febee09)}>
            {[1, 2, 3, 4, 5].map((n) =>
          <Button
            key={n}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRating(n)}
            className={n <= rating ? styles.r_1dd48761 : styles.r_47eb8768}>

                ★
              </Button>
          )}
            <span className={cx(styles.r_c68af998, styles.r_359090c2, styles.r_69335b95)}>{rating} ★</span>
          </div>
          <div className={styles.r_eccd13ef}>
            <RichTextEditor
            key={reviewKey}
            value={reviewTextJson ?? undefined}
            onChange={setReviewTextJson}
            placeholder={t("orders.reviewPlaceholder")}
            minHeight={120}
            charLimit={500} />

          </div>
          <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowReview(false)}>
              {t('common.cancel')}
            </Button>
            <Button
            type="button"
            size="sm"
            disabled={isReviewEmpty(reviewTextJson) || busy}
            onClick={async () => {
              await call(`/api/orders/${order.id}/review`, {
                rating,
                textJson: reviewTextJson
              });
              setShowReview(false);
              setReviewTextJson(null);
              setReviewKey((k) => k + 1);
            }}>

              {t("orders.submitReview")}
            </Button>
          </div>
        </Modal>
      }

      {showRefund &&
      <Modal title={t("orders.actions.review")} onClose={() => setShowRefund(false)}>
          <Textarea
          rows={3}
          className={styles.r_dd9ce2a7}
          value={refundReason}
          onChange={(e) => setRefundReason(e.target.value)}
          placeholder={t("orders.reviewPlaceholder")} />

          <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowRefund(false)}>
              {t('common.cancel')}
            </Button>
            <Button
            type="button"
            size="sm"
            disabled={!refundReason.trim() || busy}
            onClick={async () => {
              await call(`/api/orders/${order.id}/refund`, { reason: refundReason.trim() });
              setShowRefund(false);
              setRefundReason('');
            }}>

              提交申请
            </Button>
          </div>
        </Modal>
      }
    </Card>);

}

function isReviewEmpty(json: unknown): boolean {
  const j = json as {content?: unknown[];} | null;
  return !j || !Array.isArray(j.content) || j.content.length === 0;
}

function Modal({
  title,
  onClose,
  children




}: {title: string;onClose: () => void;children: React.ReactNode;}) {
  useBodyScrollLock(true);

  return (
    <div
      className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_f3c543ad, styles.r_67d66567, styles.r_094a9df0, styles.r_8e63407b)}
      onClick={onClose}>

      <div
        className={cx(styles.r_6da6a3c3, styles.r_9794ab45, styles.r_c07e54fd)}
        onClick={(e) => e.stopPropagation()}>

        <div className={cx(styles.r_1bb88326, styles.r_4ee73492, styles.r_e83a7042)}>{title}</div>
        {children}
      </div>
    </div>);

}
