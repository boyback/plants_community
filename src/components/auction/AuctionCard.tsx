'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { cn, formatPrice } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nContext';
import type { Auction } from '@/lib/types';
import styles from './AuctionCard.module.scss';
import { cx } from '@/lib/style-utils';



export function AuctionCard({ auction }: {auction: Auction;}) {
  const { t } = useI18n();
  return (
    <Link
      href={`/auction/${auction.id}`}
      className={cx(styles.r_64292b1c, styles.r_60fbb771, styles.r_8dddea07, styles.r_2cd02d11, styles.r_b8627687, styles.r_9c02094c)}>

      <div className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_2cd02d11, styles.r_7ebecbb6)}>
        <Image
          src={auction.cover}
          alt={auction.title}
          fill
          sizes="(max-width:768px) 50vw, 280px"
          className={cx(styles.r_7d85d0c2, styles.r_eadef238, styles.r_84432211, styles.r_1a9195e1)}
          unoptimized />

        <div className={cx(styles.r_da4dbfbc, styles.r_d83be576, styles.r_9a2db8f9)}>
          <StatusBadge auction={auction} />
        </div>
        {auction.bidCount > 0 &&
        <div className={cx(styles.r_da4dbfbc, styles.r_7b2d6393, styles.r_9a2db8f9, styles.r_ac204c10, styles.r_45a732a4, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395, styles.r_72a4c7cd)}>
            {t('auction.card.hotBids', { n: auction.bidCount })}
          </div>
        }
      </div>

      <div className={cx(styles.r_60fbb771, styles.r_36e579c0, styles.r_8dddea07, styles.r_58284b4e, styles.r_eb6e8b88)}>
        <h3 className={cx(styles.r_054cb4e3, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{auction.title}</h3>
        <div className={styles.r_9953408a}>
          <div className={cx(styles.r_1dc571a3, styles.r_6c4cc49e)}>
            {auction.bidCount > 0 ? t('auction.card.currentPrice') : t('auction.card.startPrice')}
          </div>
          <div className={cx(styles.r_60fbb771, styles.r_b7012bb2, styles.r_58284b4e)}>
            <span className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_595fceba)}>
              {formatPrice(auction.currentPrice)}
            </span>
            {auction.buyNowPrice &&
            <span className={cx(styles.r_1dc571a3, styles.r_6c4cc49e)}>
                {t('auction.card.buyNowHint', { price: formatPrice(auction.buyNowPrice) })}
              </span>
            }
          </div>
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1dc571a3, styles.r_69335b95)}>
          <span>{t('auction.card.depositHint', { n: (auction.depositAmount / 100).toFixed(0) })}</span>
          {auction.status === 'live' ?
          <Countdown to={auction.endAt} prefix={t('auction.card.endedPrefix')} /> :
          auction.status === 'scheduled' ?
          <Countdown to={auction.startAt} prefix={t('auction.card.startingPrefix')} /> :

          <span>{t('auction.card.finishedShort')}</span>
          }
        </div>
      </div>
    </Link>);

}

function StatusBadge({ auction }: {auction: Auction;}) {
  const { t } = useI18n();
  if (auction.status === 'live')
  return (
    <span className={cx(styles.r_ac204c10, styles.r_45a732a4, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_69450ef1, styles.r_72a4c7cd)}>
        {t('auction.status.live')}
      </span>);

  if (auction.status === 'scheduled')
  return (
    <span className={cx(styles.r_ac204c10, styles.r_931bc423, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_69450ef1, styles.r_72a4c7cd)}>
        {t('auction.status.scheduled')}
      </span>);

  if (auction.status === 'finished') {
    if (auction.result === 'no_bidder')
    return (
      <span className={cx(styles.r_ac204c10, styles.r_ae525718, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_e7eab4cb)}>
          {t('auction.status.noBidder')}
        </span>);

    return (
      <span className={cx(styles.r_ac204c10, styles.r_b81efa1b, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_72a4c7cd)}>
        {t('auction.status.sold')}
      </span>);

  }
  return (
    <span className={cx(styles.r_ac204c10, styles.r_8b65c498, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_e7eab4cb)}>
      {t('auction.status.cancelled')}
    </span>);

}

export function Countdown({
  to,
  prefix = '',
  className




}: {to: string;prefix?: string;className?: string;}) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(to).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff % 86400000 / 3600000);
  const minutes = Math.floor(diff % 3600000 / 60000);
  const seconds = Math.floor(diff % 60000 / 1000);

  let label: string;
  if (days > 0) label = t('auction.countdown.daysHours', { days, hours });else
  if (hours > 0) label = t('auction.countdown.hoursMinutes', { hours, minutes });else
  if (minutes > 0) label = t('auction.countdown.minutesSeconds', { minutes, seconds });else
  label = t('auction.countdown.seconds', { seconds });
  if (diff === 0) label = t('auction.countdown.ended');

  // 最后 5 分钟红色高亮
  const urgent = diff > 0 && diff < 5 * 60 * 1000;
  return (
    <span className={cn(urgent ? cx(styles.r_595fceba, styles.r_e83a7042) : '', className)}>
      {prefix}
      {label}
    </span>);

}