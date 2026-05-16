'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { UserName } from '@/components/ui/UserName';
import { Empty } from '@/components/ui/Empty';
import { RichTextView } from '@/components/richtext/RichTextView';
import { Countdown } from '@/components/auction/AuctionCard';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { cn, formatDateTime, formatPrice, timeAgo } from '@/lib/utils';
import type { AuctionDetail, Payment } from '@/lib/types';

export default function AuctionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { t } = useI18n();

  const [data, setData] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showJoin, setShowJoin] = useState(false);

  const showToast = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(null), 2400);
  };

  const reload = async () => {
    if (!params?.id) return;
    try {
      const d = await api.get<AuctionDetail>(`/api/auctions/${params.id}`);
      setData(d);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('auction.loadFail'));
    }
  };

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
    // 实时刷新:每 5s 拉一次,但仅在页面可见时(节省 DB 查询)
    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        reload();
      }
    }, 5000);
    // 切回前台时立即刷新一次
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  if (loading) {
    return (
      <Shell>
        <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">🔨</div>
          <div className="mt-3 text-base font-semibold">{err ?? t('auction.notFound')}</div>
          <Link href="/auction" className="btn-primary mt-4 inline-flex">
            {t('auction.backToList')}
          </Link>
        </div>
      </Shell>
    );
  }

  const isMine = user?.id === data.seller.id;
  const isWinner = data.winner?.id === user?.id;
  const myPart = data.myParticipant;
  const isLive = data.status === 'live';
  const minNext =
    data.bidCount === 0 ? data.startPrice : data.currentPrice + data.minIncrement;
  // 我是否目前领先(最高出价是我)
  const isLeading = isLive && user && data.bids[0]?.bidder.id === user.id;
  const myLastBid = user ? data.bids.find((b) => b.bidder.id === user.id) : null;
  const beingOutbid = !!myLastBid && !isLeading;

  // ===== 出价 =====
  const submitBid = async (buyNow = false) => {
    if (!user) {
      router.push(`/login?redirect=/auction/${data.id}`);
      return;
    }
    if (!myPart || myPart.depositStatus !== 'held') {
      setShowJoin(true);
      return;
    }
    let amount = Math.round(Number(bidAmount) * 100);
    if (buyNow && data.buyNowPrice) amount = data.buyNowPrice;
    if (!buyNow && (!Number.isFinite(amount) || amount < minNext)) {
      showToast(t('auction.bidAtLeast', { yuan: (minNext / 100).toFixed(2) }));
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post<{ extended: boolean }>(
        `/api/auctions/${data.id}/bid`,
        { amount, buyNow }
      );
      setBidAmount('');
      await reload();
      showToast(r.extended ? t('auction.bidSuccessExtended') : t('auction.bidSuccess'));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t('auction.bidFail'));
    } finally {
      setSubmitting(false);
    }
  };

  // ===== 取消拍卖(发起者) =====
  const cancel = async () => {
    if (!confirm(t('auction.detail.cancelConfirm'))) return;
    try {
      await api.post(`/api/auctions/${data.id}/cancel`);
      await reload();
      showToast(t('auction.detail.cancelled'));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t('auction.detail.cancelFail'));
    }
  };

  return (
    <Shell>
      {/* 面包屑 */}
      <div className="mb-4 flex items-center gap-1.5 text-xs text-leaf-700/70">
        <Link href="/" className="hover:text-leaf-700">{t('nav.home')}</Link>
        <Icon name="arrow-right" size={12} />
        <Link href="/auction" className="hover:text-leaf-700">{t('auction.backToList')}</Link>
        <Icon name="arrow-right" size={12} />
        <span className="truncate text-ink-700">{data.title}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* 左:商品 + 描述 + 出价记录 */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="relative aspect-[16/10] bg-leaf-50">
              <Image
                src={data.cover}
                alt={data.title}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute left-3 top-3">
                <StatusPill data={data} />
              </div>
            </div>
            <div className="p-5">
              <h1 className="text-xl font-bold md:text-2xl">{data.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="chip">{data.board}</span>
                {data.tags.map((tag) => (
                  <span key={tag} className="chip">#{tag}</span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-leaf-50/60 p-3 text-xs">
                <Stat label={t('auction.startPrice')} value={formatPrice(data.startPrice)} />
                <Stat label={t('auction.priceIncrement')} value={formatPrice(data.minIncrement)} />
                <Stat
                  label={t('auction.buyNow')}
                  value={data.buyNowPrice ? formatPrice(data.buyNowPrice) : '—'}
                />
                <Stat label={t('auction.deposit')} value={formatPrice(data.depositAmount)} />
                <Stat
                  label={t('auction.bidders')}
                  value={t('auction.participantCount', { n: data.participantsCount })}
                />
                <Stat
                  label={t('auction.bidCount', { n: data.bidCount })}
                  value={t('auction.bidTimes', { n: data.bidCount })}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-leaf-100 p-3 text-xs">
                <div>
                  <div className="text-leaf-700/70">{t('auction.startAt')}</div>
                  <div className="mt-0.5 font-medium">{formatDateTime(data.startAt)}</div>
                </div>
                <div>
                  <div className="text-leaf-700/70">{t('auction.endAt')}</div>
                  <div className="mt-0.5 font-medium">{formatDateTime(data.endAt)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-lg font-semibold">{t('auction.detail.intro')}</h2>
            <RichTextView json={data.descriptionJson} html={data.description} />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-lg font-semibold">
              {t('auction.detail.bidLog')} <span className="text-xs font-normal text-leaf-700/60">({data.bidCount})</span>
            </h2>
            {data.bids.length === 0 ? (
              <Empty icon="🤐" title={t('auction.detail.bidLogEmpty')} />
            ) : (
              <ul className="divide-y divide-leaf-50">
                {data.bids.slice(0, 30).map((b, i) => (
                  <li key={b.id} className="flex items-center gap-3 py-3">
                    <span
                      className={cn(
                        'grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                        i === 0 ? 'bg-amber-100 text-amber-800' : 'bg-leaf-50 text-leaf-700'
                      )}
                    >
                      {i === 0 ? '👑' : i + 1}
                    </span>
                    <Avatar src={b.bidder.avatar} alt={b.bidder.name} size={28} />
                    <UserName user={b.bidder} size="sm" />
                    <span className="ml-auto text-sm font-semibold text-rose-600">
                      {formatPrice(b.amount)}
                    </span>
                    <span className="text-[11px] text-leaf-700/60">{timeAgo(b.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 右:出价面板 + 卖家 */}
        <div className="space-y-4">
          <div className="card p-5">
            {/* 我的状态条 */}
            {isLive && isLeading && (
              <div className="mb-3 rounded-lg bg-leaf-100 px-3 py-1.5 text-xs text-leaf-800">
                {t('auction.detail.leadingYou')}
              </div>
            )}
            {isLive && beingOutbid && (
              <div className="mb-3 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
                {t('auction.detail.outbidYou', { amount: formatPrice(myLastBid!.amount) })}
              </div>
            )}
            {isLive && isMine && (
              <div className="mb-3 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                {t('auction.detail.yourAuction')}
              </div>
            )}

            <div className="text-xs text-leaf-700/70">
              {data.bidCount > 0 ? t('auction.currentPrice') : t('auction.startPrice')}
            </div>
            <div className="text-3xl font-bold text-rose-600">
              {formatPrice(data.currentPrice)}
            </div>

            {isLive && (
              <div className="mt-3 rounded-lg bg-leaf-50 p-3 text-center">
                <div className="text-[11px] text-leaf-700/70">{t('auction.detail.distanceToEnd')}</div>
                <Countdown to={data.endAt} className="text-base font-bold" />
                <div className="mt-1 text-[10px] text-leaf-700/60">
                  {t('auction.antiSnipeHint', { n: data.antiSnipeMinutes })}
                </div>
              </div>
            )}

            {data.status === 'scheduled' && (
              <div className="mt-3 rounded-lg bg-amber-50 p-3 text-center">
                <div className="text-[11px] text-amber-700/70">{t('auction.detail.distanceToStart')}</div>
                <Countdown to={data.startAt} className="text-base font-bold text-amber-700" />
              </div>
            )}

            {data.status === 'finished' && (
              <div className="mt-3 rounded-lg bg-leaf-50 p-3 text-center">
                {data.result === 'no_bidder' ? (
                  <div className="text-leaf-700/70">{t('auction.detail.noBidderResult')}</div>
                ) : data.winner ? (
                  <>
                    <div className="text-xs text-leaf-700/70">{t('auction.detail.finalDeal')}</div>
                    <div className="mt-1 font-medium text-leaf-700">
                      🏆 {data.winner.name}
                    </div>
                    <div className="text-xs text-leaf-700/60">
                      {data.result === 'paid' ? t('auction.detail.paidDone') : t('auction.detail.waitPay')}
                    </div>
                    {isWinner && data.winningOrderId && data.result !== 'paid' && (
                      <Link
                        href={`/checkout/auction/${data.winningOrderId}`}
                        className="btn-primary mt-3 w-full justify-center !text-sm"
                      >
                        {t('auction.detail.payFinalNow')}
                      </Link>
                    )}
                  </>
                ) : null}
              </div>
            )}

            {/* 出价区域 */}
            {isLive && !isMine && (
              <div className="mt-4 space-y-2">
                <div className="text-[11px] text-leaf-700/70">
                  {t('auction.bidAtLeastShort', { yuan: (minNext / 100).toFixed(2) })}
                </div>
                <div className="flex gap-2">
                  <input
                    inputMode="decimal"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={(minNext / 100).toFixed(2)}
                    className="input"
                  />
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitBid(false)}
                    className="btn-primary !px-4"
                  >
                    {submitting ? t('auction.detail.submitting') : t('auction.placeBid')}
                  </button>
                </div>
                {data.buyNowPrice && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => submitBid(true)}
                    className="btn-outline w-full justify-center !text-xs"
                  >
                    {t('auction.buyNowFull', { price: formatPrice(data.buyNowPrice) })}
                  </button>
                )}
                {(!user || !myPart || myPart.depositStatus !== 'held') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) router.push(`/login?redirect=/auction/${data.id}`);
                      else setShowJoin(true);
                    }}
                    className="btn-ghost w-full justify-center !text-xs"
                  >
                    {t('auction.depositRequiredHint', { price: formatPrice(data.depositAmount) })}
                  </button>
                )}
                {myPart?.depositStatus === 'held' && (
                  <div className="rounded-lg bg-leaf-50 px-3 py-2 text-[11px] text-leaf-700">
                    {t('auction.depositEscrowed')}
                  </div>
                )}
                {myPart?.depositStatus === 'pending' && (
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    {t('auction.depositPending')}
                  </div>
                )}
              </div>
            )}

            {/* 发起者操作 */}
            {isMine && data.bidCount === 0 && (data.status === 'live' || data.status === 'scheduled') && (
              <button
                type="button"
                onClick={cancel}
                className="btn-outline mt-4 w-full justify-center !text-xs hover:bg-rose-50 hover:text-rose-600"
              >
                {t('auction.detail.cancelAuction')}
              </button>
            )}
            {isMine && data.bidCount > 0 && data.status === 'live' && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-[11px] text-amber-800">
                {t('auction.detail.cannotCancelAfterBid')}
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="mb-3 text-sm font-semibold">{t('auction.detail.sellerTitle')}</div>
            <div className="flex items-center gap-3">
              <Avatar src={data.seller.avatar} alt={data.seller.name} size={40} />
              <div className="min-w-0 flex-1">
                <UserName user={data.seller} size="sm" />
                <div className="mt-0.5 line-clamp-1 text-[11px] text-leaf-700/70">
                  {data.seller.bio}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/user/${data.seller.id}`}
                className="btn-outline flex-1 justify-center !text-xs"
              >
                {t('nav.myProfile')}
              </Link>
              <Link
                href={`/messages?to=${data.seller.id}`}
                className="btn-primary flex-1 justify-center !text-xs"
              >
                {t('nav.messages')}
              </Link>
            </div>
          </div>

          <div className="card p-4 text-[11px] text-leaf-700/70">
            <div className="mb-1 font-medium text-leaf-700">{t('auction.detail.rulesTitle')}</div>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>{t('auction.detail.ruleDeposit', { amount: formatPrice(data.depositAmount) })}</li>
              <li>{t('auction.detail.ruleWinner')}</li>
              <li>{t('auction.detail.ruleRefund', { points: Math.ceil(data.depositAmount / 100) * 100 })}</li>
              <li>{t('auction.detail.ruleDefault')}</li>
              <li>{t('auction.detail.ruleAntiSnipe', { n: data.antiSnipeMinutes })}</li>
            </ul>
          </div>
        </div>
      </div>

      {showJoin && (
        <JoinDialog
          auctionId={data.id}
          depositAmount={data.depositAmount}
          onClose={() => setShowJoin(false)}
          onPaid={async () => {
            setShowJoin(false);
            await reload();
            await refresh();
            showToast(t('auction.depositModal.toastEscrowed'));
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-800 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-leaf-700/70">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-ink-800">{value}</div>
    </div>
  );
}

function StatusPill({ data }: { data: AuctionDetail }) {
  const { t } = useI18n();
  if (data.status === 'live')
    return (
      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
        {t('auction.statusLabel.live')}
      </span>
    );
  if (data.status === 'scheduled')
    return (
      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
        {t('auction.statusLabel.scheduled')}
      </span>
    );
  if (data.status === 'finished')
    return (
      <span className="rounded-full bg-leaf-700 px-2 py-0.5 text-xs text-white">
        {data.result === 'no_bidder' ? t('auction.statusLabel.finishedNoBidder') : t('auction.statusLabel.finished')}
      </span>
    );
  return (
    <span className="rounded-full bg-leaf-300 px-2 py-0.5 text-xs text-leaf-800">
      {t('auction.statusLabel.cancelled')}
    </span>
  );
}

/* -------------- 加入拍卖(支付保证金)对话框 -------------- */

function JoinDialog({
  auctionId,
  depositAmount,
  onClose,
  onPaid,
}: {
  auctionId: string;
  depositAmount: number;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { pointsBalance } = useAuth();
  const { t } = useI18n();
  const [channel, setChannel] = useState<'wechat' | 'alipay' | 'points'>('wechat');
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pointsCost = Math.ceil(depositAmount / 100) * 100;

  const join = async () => {
    setErr(null);
    setSubmitting(true);
    try {
      const r = await api.post<{
        joined?: boolean;
        channel?: string;
        payment?: Payment;
      }>(`/api/auctions/${auctionId}/join`, { channel });

      if (r.joined && r.channel === 'points') {
        onPaid();
        return;
      }
      if (r.payment) {
        setPayment(r.payment);
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('auction.depositModal.opFail'));
    } finally {
      setSubmitting(false);
    }
  };

  // 轮询
  useEffect(() => {
    if (!payment) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const p = await api.get<Payment>(`/api/payments/${payment.payNo}`);
        if (p.status === 'paid') {
          if (pollRef.current) clearInterval(pollRef.current);
          onPaid();
        } else if (p.status !== 'pending') {
          setPayment(p);
        }
      } catch {
        /* ignore */
      }
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.payNo]);

  const mockConfirm = async () => {
    if (!payment) return;
    try {
      await api.post(`/api/payments/${payment.payNo}/confirm`);
      onPaid();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('auction.depositModal.confirmFail'));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 text-base font-semibold">{t('auction.depositModal.title')}</div>
        <p className="mb-4 text-xs text-leaf-700/70">
          {t('auction.depositModal.desc')}
        </p>

        {!payment ? (
          <>
            <div className="mb-3 rounded-xl bg-leaf-50/60 p-3">
              <div className="text-xs text-leaf-700/70">{t('auction.depositModal.needPay')}</div>
              <div className="text-2xl font-bold text-rose-600">
                {formatPrice(depositAmount)}
              </div>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
              <ChannelOption
                active={channel === 'wechat'}
                onClick={() => setChannel('wechat')}
                icon="💚"
                label={t('auction.depositModal.channelWechat')}
              />
              <ChannelOption
                active={channel === 'alipay'}
                onClick={() => setChannel('alipay')}
                icon="💙"
                label={t('auction.depositModal.channelAlipay')}
              />
              <ChannelOption
                active={channel === 'points'}
                onClick={() => setChannel('points')}
                icon="💎"
                label={t('auction.depositModal.channelPoints', { n: pointsCost })}
                disabled={pointsBalance < pointsCost}
              />
            </div>

            {err && (
              <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {err}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="btn-outline !text-xs">{t('auction.depositModal.cancel')}</button>
              <button
                disabled={submitting}
                onClick={join}
                className="btn-primary !text-xs"
              >
                {submitting ? t('auction.detail.submitting') : t('auction.depositModal.confirmPay')}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="text-xs text-leaf-700/70">
              {t('auction.depositModal.scanQr', {
                channel: channel === 'wechat' ? t('auction.depositModal.channelWechat') : t('auction.depositModal.channelAlipay'),
              })}
            </div>
            <div className="my-3 grid h-40 w-40 place-self-center place-items-center rounded-xl border border-dashed border-leaf-200 bg-white text-xs text-leaf-700/60">
              {payment.qrcode?.slice(0, 24)}...
            </div>
            <div className="text-[11px] text-amber-700">
              {t('auction.depositModal.mockHint')}
            </div>
            <button
              onClick={mockConfirm}
              className="btn mt-2 bg-amber-500 text-white hover:bg-amber-600 !text-xs"
            >
              {t('auction.depositModal.mockPay')}
            </button>
            {err && (
              <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {err}
              </div>
            )}
            <div className="mt-3">
              <button onClick={onClose} className="btn-outline !text-xs">
                {t('auction.depositModal.payLater')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelOption({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-xs transition-all',
        active && !disabled
          ? 'border-leaf-500 bg-leaf-50/60'
          : 'border-leaf-100 hover:border-leaf-300',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
