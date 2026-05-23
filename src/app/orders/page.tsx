'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Empty } from '@/components/ui/Empty';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';
import { cn, formatDateTime, formatPrice } from '@/lib/utils';
import { usePullToRefresh, PullIndicator } from '@/lib/hooks/usePullToRefresh';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { RichTextView } from '@/components/richtext/RichTextView';
import type { Order, OrderStatus } from '@/lib/types';

const STATUS_I18N_KEY: Record<OrderStatus | 'all', string> = {
  all: 'orders.statusAll',
  pending_payment: 'orders.status.pending_payment',
  pending_ship: 'orders.status.pending_ship',
  pending_receipt: 'orders.status.pending_receipt',
  pending_review: 'orders.status.pending_review',
  completed: 'orders.status.completed',
  cancelled: 'orders.status.cancelled',
  refunded: 'orders.status.refunded',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment: 'bg-amber-50 text-amber-700',
  pending_ship: 'bg-blue-50 text-blue-700',
  pending_receipt: 'bg-violet-50 text-violet-700',
  pending_review: 'bg-leaf-50 text-leaf-700',
  completed: 'bg-leaf-100 text-leaf-800',
  cancelled: 'bg-leaf-50 text-leaf-700',
  refunded: 'bg-rose-50 text-rose-700',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <OrdersInner />
    </Suspense>
  );
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
    } finally {
      setLoading(false);
    }
  };

  const { bind, status: pullStatus, progress: pullProgress } = usePullToRefresh(load);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, role, statusFilter]);

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">📦</div>
          <div className="mt-3 text-lg font-semibold">{t('error.unauthorized')}</div>
          <Link href="/login?redirect=/orders" className="btn-primary mt-4 inline-flex">
            {t('nav.login')}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div {...bind}>
        <PullIndicator status={pullStatus} progress={pullProgress} />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('orders.title')}</h1>
        </div>
        <Link href="/market" className="btn-outline !text-sm">
          {t('market.title')}
        </Link>
      </div>

      {/* 我买的 / 我卖的 */}
      <div className="mb-4 inline-flex items-center gap-1 rounded-full border border-leaf-100 bg-white p-1 text-xs">
        {(['buyer', 'seller'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={cn(
              'rounded-full px-4 py-1.5',
              role === r
                ? 'bg-leaf-500 text-white'
                : 'text-ink-700 hover:bg-leaf-50'
            )}
          >
            {r === 'buyer' ? t('orders.tabBuyer') : t('orders.tabSeller')}
          </button>
        ))}
      </div>

      {/* 状态筛选 */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(Object.keys(STATUS_I18N_KEY) as (OrderStatus | 'all')[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs',
              statusFilter === s
                ? 'border-leaf-500 bg-leaf-500 text-white'
                : 'border-leaf-200 bg-white text-ink-700 hover:bg-leaf-50'
            )}
          >
            {t(STATUS_I18N_KEY[s])}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>
      ) : orders.length === 0 ? (
        <Empty icon="📦" title={t('orders.title')} desc={t('market.title')} />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} role={role} onRefresh={() => { void load(); refresh(); }} />
          ))}
        </div>
      )}
      </div>
    </Shell>
  );
}

function OrderRow({
  order,
  role,
  onRefresh,
}: {
  order: Order;
  role: 'buyer' | 'seller';
  onRefresh: () => void;
}) {
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
    <div className="card p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-leaf-700/70">
        <span>{t('orders.orderNo', { no: order.orderNo })}</span>
        <span>·</span>
        <span>{formatDateTime(order.createdAt)}</span>
        <span className={cn('ml-auto rounded-full px-2 py-0.5', STATUS_COLOR[order.status])}>
          {t(STATUS_I18N_KEY[order.status])}
        </span>
      </div>

      <Link
        href={
          order.source === 'auction' && order.auctionId
            ? `/auction/${order.auctionId}`
            : order.listing
            ? `/market/${order.listing.id}`
            : order.product
            ? `/market/${order.product.id}`
            : '#'
        }
        className="flex gap-3 rounded-xl bg-leaf-50/40 p-3 hover:bg-leaf-50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={order.product?.cover ?? order.listingItem?.cover ?? order.listing?.cover ?? order.auctionCover ?? ''}
          alt={order.product?.title ?? order.listingItem?.title ?? order.listing?.title ?? order.auctionTitle ?? ''}
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {order.source === 'auction' && (
              <span className="rounded bg-rose-100 px-1 text-[9px] text-rose-700">🔨 {t('orders.source.auction')}</span>
            )}
            <span className="line-clamp-1 text-sm">
              {order.product?.title ?? order.listingItem?.title ?? order.listing?.title ?? order.auctionTitle ?? t('orders.source.product')}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-leaf-700/70">
            × {order.quantity}
          </div>
          {order.shipName && (
            <div className="mt-0.5 text-[11px] text-leaf-700/70">
              📍 {order.shipName} · {order.shipPhone} · {order.shipAddress}
            </div>
          )}
          {order.trackingNo && (
            <div className="mt-0.5 text-[11px] text-leaf-700/70">
              📦 {t('orders.tracking', { no: order.trackingNo })}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-base font-semibold text-rose-600">
            {formatPrice(order.totalPrice)}
          </div>
          {order.depositPaid > 0 && (
            <div className="text-[10px] text-leaf-700/70">
              已抵 ¥{(order.depositPaid / 100).toFixed(0)}
            </div>
          )}
          {order.pointsBackTotal > 0 && (
            <div className="text-[10px] text-leaf-700/70">返 {order.pointsBackTotal} 积分</div>
          )}
        </div>
      </Link>

      {/* 操作按钮 */}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {role === 'buyer' && order.status === 'pending_payment' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => call(`/api/orders/${order.id}/cancel`)}
              className="btn-outline !text-xs"
            >
              {t('orders.actions.cancel')}
            </button>
            <Link
              href={
                order.source === 'auction'
                  ? `/checkout/auction/${order.id}`
                  : `/checkout/${order.id}`
              }
              className="btn-primary !text-xs"
            >
              {order.source === 'auction' ? t('auction.payBalance') : t('orders.actions.pay')}
            </Link>
          </>
        )}
        {role === 'seller' && order.status === 'pending_ship' && (
          <button
            type="button"
            onClick={() => setShowShip(true)}
            className="btn-primary !text-xs"
          >
            {t('orders.actions.ship')}
          </button>
        )}
        {role === 'buyer' && order.status === 'pending_receipt' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => call(`/api/orders/${order.id}/receive`)}
            className="btn-primary !text-xs"
          >
            {t('orders.actions.confirm')}
          </button>
        )}
        {role === 'buyer' && order.status === 'pending_review' && (
          <button
            type="button"
            onClick={() => setShowReview(true)}
            className="btn-primary !text-xs"
          >
            {t('orders.actions.review')}
          </button>
        )}
        {role === 'buyer' &&
          ['pending_ship', 'pending_receipt', 'pending_review'].includes(order.status) && (
            <button
              type="button"
              onClick={() => setShowRefund(true)}
              className="btn-outline !text-xs"
            >
              {t('orders.actions.review')}
            </button>
          )}
      </div>

      {order.status === 'completed' && order.reviewRating && (
        <div className="mt-3 rounded-lg bg-leaf-50/60 p-3 text-xs">
          <div className="text-leaf-700">
            ⭐ {'★'.repeat(order.reviewRating)}{'☆'.repeat(5 - order.reviewRating)}
          </div>
          <RichTextView
            json={order.reviewTextJson}
            html={order.reviewText}
            text={order.reviewTextPlain}
            size="sm"
            className="mt-1"
          />
        </div>
      )}

      {order.refundReason && (
        <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">
          {order.refundReason}
        </div>
      )}

      {/* 弹窗们 */}
      {showShip && (
        <Modal title={t('orders.actions.ship')} onClose={() => setShowShip(false)}>
          <input
            className="input"
            value={trackingNo}
            onChange={(e) => setTrackingNo(e.target.value)}
            placeholder={t('orders.inputTracking')}
          />
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setShowShip(false)} className="btn-outline !text-xs">
              {t('common.cancel')}
            </button>
            <button
              disabled={!trackingNo.trim() || busy}
              onClick={async () => {
                await call(`/api/orders/${order.id}/ship`, { trackingNo: trackingNo.trim() });
                setShowShip(false);
                setTrackingNo('');
              }}
              className="btn-primary !text-xs"
            >
              {t('orders.actions.ship')}
            </button>
          </div>
        </Modal>
      )}

      {showReview && (
        <Modal title={t('orders.actions.review')} onClose={() => setShowReview(false)}>
          <div className="flex items-center gap-2 text-2xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={n <= rating ? 'text-amber-500' : 'text-leaf-200'}
              >
                ★
              </button>
            ))}
            <span className="ml-2 text-xs text-leaf-700/70">{rating} ★</span>
          </div>
          <div className="mt-3">
            <RichTextEditor
              key={reviewKey}
              value={reviewTextJson ?? undefined}
              onChange={setReviewTextJson}
              placeholder={t('orders.reviewPlaceholder')}
              minHeight={120}
              charLimit={500}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setShowReview(false)} className="btn-outline !text-xs">
              {t('common.cancel')}
            </button>
            <button
              disabled={isReviewEmpty(reviewTextJson) || busy}
              onClick={async () => {
                await call(`/api/orders/${order.id}/review`, {
                  rating,
                  textJson: reviewTextJson,
                });
                setShowReview(false);
                setReviewTextJson(null);
                setReviewKey((k) => k + 1);
              }}
              className="btn-primary !text-xs"
            >
              {t('orders.submitReview')}
            </button>
          </div>
        </Modal>
      )}

      {showRefund && (
        <Modal title={t('orders.actions.review')} onClose={() => setShowRefund(false)}>
          <textarea
            rows={3}
            className="input min-h-[80px]"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder={t('orders.reviewPlaceholder')}
          />
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setShowRefund(false)} className="btn-outline !text-xs">
              {t('common.cancel')}
            </button>
            <button
              disabled={!refundReason.trim() || busy}
              onClick={async () => {
                await call(`/api/orders/${order.id}/refund`, { reason: refundReason.trim() });
                setShowRefund(false);
                setRefundReason('');
              }}
              className="btn-primary !text-xs"
            >
              提交申请
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function isReviewEmpty(json: unknown): boolean {
  const j = json as { content?: unknown[] } | null;
  return !j || !Array.isArray(j.content) || j.content.length === 0;
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-base font-semibold">{title}</div>
        {children}
      </div>
    </div>
  );
}
