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
import { api, ApiError } from "@/lib/client-api";
import { cn, formatDateTime, formatPrice, timeAgo } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import type { AuctionDetail, Payment } from '@/lib/types';
import { PaymentQr } from '@/components/payment/PaymentQr';
import { AlipayPagePayButton } from '@/components/payment/AlipayPagePayButton';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export default function AuctionDetailPage() {
  const params = useParams<{id: string;}>();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const { t } = useI18n();

  const [data, setData] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

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
      if (typeof document !== 'undefined' && document.visibilityState === "visible") {
        reload();
      }
    }, 5000);
    // 切回前台时立即刷新一次
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
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
        <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</div>
      </Shell>);

  }

  if (!data) {
    return (
      <Shell>
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>🔨</div>
          <div className={cx(styles.r_eccd13ef, styles.r_4ee73492, styles.r_e83a7042)}>{err ?? t('auction.notFound')}</div>
          <Link href="/auction" className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
            {t('auction.backToList')}
          </Link>
        </div>
      </Shell>);

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
      toast.error(t('auction.bidAtLeast', { yuan: (minNext / 100).toFixed(2) }));
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post<{extended: boolean;}>(
        `/api/auctions/${data.id}/bid`,
        { amount, buyNow }
      );
      setBidAmount('');
      await reload();
      toast.success(r.extended ? t('auction.bidSuccessExtended') : t('auction.bidSuccess'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('auction.bidFail'));
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
      toast.success(t('auction.detail.cancelled'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('auction.detail.cancelFail'));
    }
  };

  return (
    <Shell>
      {/* 面包屑 */}
      <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e, styles.r_359090c2, styles.r_69335b95)}>
        <Link href="/" className={styles.r_9825203a}>{t('nav.home')}</Link>
        <Icon name="arrow-right" size={12} />
        <Link href="/auction" className={styles.r_9825203a}>{t('auction.backToList')}</Link>
        <Icon name="arrow-right" size={12} />
        <span className={cx(styles.r_f283ea9b, styles.r_eb6abb1f)}>{data.title}</span>
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_0d304f90, styles.r_e7849c79)}>
        {/* 左:商品 + 描述 + 出价记录 */}
        <div className={styles.r_3e7ce58d}>
          <div className={styles.r_2cd02d11}>
            <div className={cx(styles.r_d89972fe, styles.r_e5d2d82a, styles.r_7ebecbb6)}>
              <Image
                src={data.cover}
                alt={data.title}
                fill
                className={styles.r_7d85d0c2}
                unoptimized />

              <div className={cx(styles.r_da4dbfbc, styles.r_22e59b72, styles.r_8782d84c)}>
                <StatusPill data={data} />
              </div>
            </div>
            <div className={styles.r_c07e54fd}>
              <h1 className={cx(styles.r_d5c9b000, styles.r_69450ef1, styles.r_115ab7fe)}>{data.title}</h1>
              <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2)}>
                <span className="chip">{data.category}</span>
                {data.tags.map((tag) =>
                <span key={tag} className="chip">#{tag}</span>
                )}
              </div>

              <div className={cx(styles.r_0ab86672, styles.r_f3c543ad, styles.r_be2e831b, styles.r_1004c0c3, styles.r_a217b4ea, styles.r_a8a62ca4, styles.r_eb6e8b88, styles.r_359090c2)}>
                <Stat label={t('auction.startPrice')} value={formatPrice(data.startPrice)} />
                <Stat label={t('auction.priceIncrement')} value={formatPrice(data.minIncrement)} />
                <Stat
                  label={t('auction.buyNow')}
                  value={data.buyNowPrice ? formatPrice(data.buyNowPrice) : '—'} />

                <Stat label={t('auction.deposit')} value={formatPrice(data.depositAmount)} />
                <Stat
                  label={t('auction.bidders')}
                  value={t('auction.participantCount', { n: data.participantsCount })} />

                <Stat
                  label={t('auction.bidCount', { n: data.bidCount })}
                  value={t('auction.bidTimes', { n: data.bidCount })} />

              </div>

              <div className={cx(styles.r_eccd13ef, styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_eb6e8b88, styles.r_359090c2)}>
                <div>
                  <div className={styles.r_69335b95}>{t('auction.startAt')}</div>
                  <div className={cx(styles.r_15e1b1f4, styles.r_2689f395)}>{formatDateTime(data.startAt)}</div>
                </div>
                <div>
                  <div className={styles.r_69335b95}>{t('auction.endAt')}</div>
                  <div className={cx(styles.r_15e1b1f4, styles.r_2689f395)}>{formatDateTime(data.endAt)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.r_c07e54fd}>
            <h2 className={cx(styles.r_1bb88326, styles.r_42536e69, styles.r_e83a7042)}>{t('auction.detail.intro')}</h2>
            <RichTextView json={data.descriptionJson} html={data.description} />
          </div>

          <div className={styles.r_c07e54fd}>
            <h2 className={cx(styles.r_1bb88326, styles.r_42536e69, styles.r_e83a7042)}>
              {t('auction.detail.bidLog')} <span className={cx(styles.r_359090c2, styles.r_8ecebc9f, styles.r_6c4cc49e)}>({data.bidCount})</span>
            </h2>
            {data.bids.length === 0 ?
            <Empty icon="🤐" title={t('auction.detail.bidLogEmpty')} /> :

            <ul className={cx(styles.r_fa6acbf8, styles.r_6f8e581a)}>
                {data.bids.slice(0, 30).map((b, i) =>
              <li key={b.id} className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_1b2d54a3)}>
                    <span
                  className={cn(cx(styles.r_f3c543ad, styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_012fbd12, styles.r_67d66567, styles.r_ac204c10, styles.r_d058ca6d, styles.r_69450ef1),

                  i === 0 ? cx(styles.r_735dd972, styles.r_5c6230d2) : cx(styles.r_7ebecbb6, styles.r_5f6a59f1)
                  )}>

                      {i === 0 ? '👑' : i + 1}
                    </span>
                    <Avatar src={b.bidder.avatar} alt={b.bidder.name} size={28} />
                    <UserName user={b.bidder} size="sm" />
                    <span className={cx(styles.r_fb56d9cf, styles.r_fc7473ca, styles.r_e83a7042, styles.r_595fceba)}>
                      {formatPrice(b.amount)}
                    </span>
                    <span className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>{timeAgo(b.createdAt)}</span>
                  </li>
              )}
              </ul>
            }
          </div>
        </div>

        {/* 右:出价面板 + 卖家 */}
        <div className={styles.r_3e7ce58d}>
          <div className={styles.r_c07e54fd}>
            {/* 我的状态条 */}
            {isLive && isLeading &&
            <div className={cx(styles.r_1bb88326, styles.r_5f22e64f, styles.r_f2b23104, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_e7eab4cb)}>
                {t('auction.detail.leadingYou')}
              </div>
            }
            {isLive && beingOutbid &&
            <div className={cx(styles.r_1bb88326, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_b54428d1)}>
                {t('auction.detail.outbidYou', { amount: formatPrice(myLastBid!.amount) })}
              </div>
            }
            {isLive && isMine &&
            <div className={cx(styles.r_1bb88326, styles.r_5f22e64f, styles.r_67d2289d, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_5c6230d2)}>
                {t('auction.detail.yourAuction')}
              </div>
            }

            <div className={cx(styles.r_359090c2, styles.r_69335b95)}>
              {data.bidCount > 0 ? t('auction.currentPrice') : t('auction.startPrice')}
            </div>
            <div className={cx(styles.r_751fb0d1, styles.r_69450ef1, styles.r_595fceba)}>
              {formatPrice(data.currentPrice)}
            </div>

            {isLive &&
            <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_eb6e8b88, styles.r_ca6bf630)}>
                <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>{t('auction.detail.distanceToEnd')}</div>
                <Countdown to={data.endAt} className={cx(styles.r_4ee73492, styles.r_69450ef1)} />
                <div className={cx(styles.r_b6b02c0e, styles.r_1dc571a3, styles.r_6c4cc49e)}>
                  {t('auction.antiSnipeHint', { n: data.antiSnipeMinutes })}
                </div>
              </div>
            }

            {data.status === 'scheduled' &&
            <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_67d2289d, styles.r_eb6e8b88, styles.r_ca6bf630)}>
                <div className={cx(styles.r_d058ca6d, styles.r_08acc661)}>{t('auction.detail.distanceToStart')}</div>
                <Countdown to={data.startAt} className={cx(styles.r_4ee73492, styles.r_69450ef1, styles.r_85d79ebf)} />
              </div>
            }

            {data.status === 'finished' &&
            <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_eb6e8b88, styles.r_ca6bf630)}>
                {data.result === 'no_bidder' ?
              <div className={styles.r_69335b95}>{t('auction.detail.noBidderResult')}</div> :
              data.winner ?
              <>
                    <div className={cx(styles.r_359090c2, styles.r_69335b95)}>{t('auction.detail.finalDeal')}</div>
                    <div className={cx(styles.r_b6b02c0e, styles.r_2689f395, styles.r_5f6a59f1)}>
                      🏆 {data.winner.name}
                    </div>
                    <div className={cx(styles.r_359090c2, styles.r_6c4cc49e)}>
                      {data.result === 'paid' ? t('auction.detail.paidDone') : t('auction.detail.waitPay')}
                    </div>
                    {isWinner && data.winningOrderId && data.result !== 'paid' &&
                <Link
                  href={`/checkout/auction/${data.winningOrderId}`}
                  className={cx(styles.r_eccd13ef, styles.r_6da6a3c3, styles.r_86843cf1, styles.r_4f43b5cb)}>

                        {t('auction.detail.payFinalNow')}
                      </Link>
                }
                  </> :
              null}
              </div>
            }

            {/* 出价区域 */}
            {isLive && !isMine &&
            <div className={cx(styles.r_0ab86672, styles.r_6f7e013d)}>
                <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>
                  {t('auction.bidAtLeastShort', { yuan: (minNext / 100).toFixed(2) })}
                </div>
                <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
                  <input
                  inputMode="decimal"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={(minNext / 100).toFixed(2)}
                  className="input" />

                  <button
                  type="button"
                  disabled={submitting}
                  onClick={() => submitBid(false)}
                  className={styles.r_af7490b1}>

                    {submitting ? t('auction.detail.submitting') : t('auction.placeBid')}
                  </button>
                </div>
                {data.buyNowPrice &&
              <button
                type="button"
                disabled={submitting}
                onClick={() => submitBid(true)}
                className={cx(styles.r_6da6a3c3, styles.r_86843cf1, styles.r_dd702538)}>

                    {t('auction.buyNowFull', { price: formatPrice(data.buyNowPrice) })}
                  </button>
              }
                {(!user || !myPart || myPart.depositStatus !== 'held') &&
              <button
                type="button"
                onClick={() => {
                  if (!user) router.push(`/login?redirect=/auction/${data.id}`);else
                  setShowJoin(true);
                }}
                className={cx(styles.r_6da6a3c3, styles.r_86843cf1, styles.r_dd702538)}>

                    {t('auction.depositRequiredHint', { price: formatPrice(data.depositAmount) })}
                  </button>
              }
                {myPart?.depositStatus === 'held' &&
              <div className={cx(styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_d058ca6d, styles.r_5f6a59f1)}>
                    {t('auction.depositEscrowed')}
                  </div>
              }
                {myPart?.depositStatus === 'pending' &&
              <div className={cx(styles.r_5f22e64f, styles.r_67d2289d, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_d058ca6d, styles.r_5c6230d2)}>
                    {t('auction.depositPending')}
                  </div>
              }
              </div>
            }

            {/* 发起者操作 */}
            {isMine && data.bidCount === 0 && (data.status === 'live' || data.status === 'scheduled') &&
            <button
              type="button"
              onClick={cancel}
              className={cx(styles.r_0ab86672, styles.r_6da6a3c3, styles.r_86843cf1, styles.r_dd702538, styles.r_85cfcc24, styles.r_744ff542)}>

                {t('auction.detail.cancelAuction')}
              </button>
            }
            {isMine && data.bidCount > 0 && data.status === 'live' &&
            <div className={cx(styles.r_0ab86672, styles.r_5f22e64f, styles.r_67d2289d, styles.r_eb6e8b88, styles.r_d058ca6d, styles.r_5c6230d2)}>
                {t('auction.detail.cannotCancelAfterBid')}
              </div>
            }
          </div>

          <div className={styles.r_8e63407b}>
            <div className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}>{t('auction.detail.sellerTitle')}</div>
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3)}>
              <Avatar src={data.seller.avatar} alt={data.seller.name} size={40} />
              <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                <UserName user={data.seller} size="sm" />
                <div className={cx(styles.r_15e1b1f4, styles.r_f50e2015, styles.r_d058ca6d, styles.r_69335b95)}>
                  {data.seller.bio}
                </div>
              </div>
            </div>
            <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_77a2a20e)}>
              <Link
                href={`/user/${data.seller.id}`}
                className={cx(styles.r_36e579c0, styles.r_86843cf1, styles.r_dd702538)}>

                {t('nav.myProfile')}
              </Link>
              <Link
                href={`/messages?to=${data.seller.id}`}
                className={cx(styles.r_36e579c0, styles.r_86843cf1, styles.r_dd702538)}>

                {t('nav.messages')}
              </Link>
            </div>
          </div>

          <div className={cx(styles.r_8e63407b, styles.r_d058ca6d, styles.r_69335b95)}>
            <div className={cx(styles.r_65281709, styles.r_2689f395, styles.r_5f6a59f1)}>{t('auction.detail.rulesTitle')}</div>
            <ul className={cx(styles.r_f242aff2, styles.r_1f33b438, styles.r_e2eedc57)}>
              <li>{t('auction.detail.ruleDeposit', { amount: formatPrice(data.depositAmount) })}</li>
              <li>{t('auction.detail.ruleWinner')}</li>
              <li>{t('auction.detail.ruleRefund', { points: Math.ceil(data.depositAmount / 100) * 100 })}</li>
              <li>{t('auction.detail.ruleDefault')}</li>
              <li>{t('auction.detail.ruleAntiSnipe', { n: data.antiSnipeMinutes })}</li>
            </ul>
          </div>
        </div>
      </div>

      {showJoin &&
      <JoinDialog
        auctionId={data.id}
        depositAmount={data.depositAmount}
        onClose={() => setShowJoin(false)}
        onPaid={async () => {
          setShowJoin(false);
          await reload();
          await refresh();
          toast.success(t('auction.depositModal.toastEscrowed'));
        }} />

      }
    </Shell>);

}

function Stat({ label, value }: {label: string;value: string;}) {
  return (
    <div>
      <div className={cx(styles.r_1dc571a3, styles.r_69335b95)}>{label}</div>
      <div className={cx(styles.r_15e1b1f4, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{value}</div>
    </div>);

}

function StatusPill({ data }: {data: AuctionDetail;}) {
  const { t } = useI18n();
  if (data.status === 'live')
  return (
    <span className={cx(styles.r_ac204c10, styles.r_45a732a4, styles.r_d5eab218, styles.r_465609a2, styles.r_359090c2, styles.r_69450ef1, styles.r_72a4c7cd)}>
        {t('auction.statusLabel.live')}
      </span>);

  if (data.status === 'scheduled')
  return (
    <span className={cx(styles.r_ac204c10, styles.r_931bc423, styles.r_d5eab218, styles.r_465609a2, styles.r_359090c2, styles.r_69450ef1, styles.r_72a4c7cd)}>
        {t('auction.statusLabel.scheduled')}
      </span>);

  if (data.status === 'finished')
  return (
    <span className={cx(styles.r_ac204c10, styles.r_b81efa1b, styles.r_d5eab218, styles.r_465609a2, styles.r_359090c2, styles.r_72a4c7cd)}>
        {data.result === 'no_bidder' ? t('auction.statusLabel.finishedNoBidder') : t('auction.statusLabel.finished')}
      </span>);

  return (
    <span className={cx(styles.r_ac204c10, styles.r_8b65c498, styles.r_d5eab218, styles.r_465609a2, styles.r_359090c2, styles.r_e7eab4cb)}>
      {t('auction.statusLabel.cancelled')}
    </span>);

}

/* -------------- 加入拍卖(支付保证金)对话框 -------------- */

function JoinDialog({
  auctionId,
  depositAmount,
  onClose,
  onPaid





}: {auctionId: string;depositAmount: number;onClose: () => void;onPaid: () => void;}) {
  useBodyScrollLock(true);

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

        /* ignore */}
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment?.payNo]);

  return (
    <div
      className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_f3c543ad, styles.r_67d66567, styles.r_094a9df0, styles.r_8e63407b)}
      onClick={onClose}>

      <div className={cx(styles.r_6da6a3c3, styles.r_9794ab45, styles.r_0478c89a)} onClick={(e) => e.stopPropagation()}>
        <div className={cx(styles.r_a77ed4d9, styles.r_4ee73492, styles.r_e83a7042)}>{t('auction.depositModal.title')}</div>
        <p className={cx(styles.r_da019856, styles.r_359090c2, styles.r_69335b95)}>
          {t('auction.depositModal.desc')}
        </p>

        {!payment ?
        <>
            <div className={cx(styles.r_1bb88326, styles.r_a217b4ea, styles.r_a8a62ca4, styles.r_eb6e8b88)}>
              <div className={cx(styles.r_359090c2, styles.r_69335b95)}>{t('auction.depositModal.needPay')}</div>
              <div className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_595fceba)}>
                {formatPrice(depositAmount)}
              </div>
            </div>

            <div className={cx(styles.r_1bb88326, styles.r_f3c543ad, styles.r_be2e831b, styles.r_77a2a20e)}>
              <ChannelOption
              active={channel === 'wechat'}
              onClick={() => setChannel('wechat')}
              icon="💚"
              label={t('auction.depositModal.channelWechat')} />

              <ChannelOption
              active={channel === 'alipay'}
              onClick={() => setChannel('alipay')}
              icon="💙"
              label={t('auction.depositModal.channelAlipay')} />

              <ChannelOption
              active={channel === 'points'}
              onClick={() => setChannel('points')}
              icon="💎"
              label={t('auction.depositModal.channelPoints', { n: pointsCost })}
              disabled={pointsBalance < pointsCost} />

            </div>

            {err &&
          <div className={cx(styles.r_1bb88326, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>
                {err}
              </div>
          }

            <div className={cx(styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
              <button onClick={onClose} className={styles.r_dd702538}>{t('auction.depositModal.cancel')}</button>
              <button
              disabled={submitting}
              onClick={join}
              className={styles.r_dd702538}>

                {submitting ? t('auction.detail.submitting') : t('auction.depositModal.confirmPay')}
              </button>
            </div>
          </> :

        <div className={styles.r_ca6bf630}>
            <div className={cx(styles.r_359090c2, styles.r_69335b95)}>
              {payment.pagePayUrl ? '点击按钮跳转到支付宝完成保证金支付' : t('auction.depositModal.scanQr', {
              channel: channel === 'wechat' ? t('auction.depositModal.channelWechat') : t('auction.depositModal.channelAlipay')
            })}
            </div>
            {payment.pagePayUrl ?
            <AlipayPagePayButton pagePayUrl={payment.pagePayUrl} /> :
            <PaymentQr
              text={payment.qrcode ?? payment.payNo}
              channel={channel === 'wechat' ? 'wechat' : 'alipay'}
              status={payment.status}
              scanning={payment.scanning ?? false} />
            }
            {err &&
          <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>
                {err}
              </div>
          }
            <div className={styles.r_eccd13ef}>
              <button onClick={onClose} className={styles.r_dd702538}>
                {t('auction.depositModal.payLater')}
              </button>
            </div>
          </div>
        }
      </div>
    </div>);

}

function ChannelOption({
  active,
  disabled,
  onClick,
  icon,
  label






}: {active: boolean;disabled?: boolean;onClick: () => void;icon: string;label: string;}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_a217b4ea, styles.r_65935df5, styles.r_eb6e8b88, styles.r_359090c2, styles.r_0fe7d7d8),

      active && !disabled ? cx(styles.r_d3b27cd9, styles.r_a8a62ca4) : cx(styles.r_88b684d2, styles.r_a5c39c39),


      disabled && cx(styles.r_2a2db466, styles.r_29b733e4)
      )}>

      <span className={styles.r_d5c9b000}>{icon}</span>
      <span>{label}</span>
    </button>);

}
