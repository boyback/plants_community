'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { cn, formatPrice } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nContext';
import type { Auction } from '@/lib/types';

export function AuctionCard({ auction }: { auction: Auction }) {
  const { t } = useI18n();
  return (
    <Link
      href={`/auction/${auction.id}`}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-leaf-50">
        <Image
          src={auction.cover}
          alt={auction.title}
          fill
          sizes="(max-width:768px) 50vw, 280px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute left-2 top-2">
          <StatusBadge auction={auction} />
        </div>
        {auction.bidCount > 0 && (
          <div className="absolute right-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-medium text-white">
            {t('auction.card.hotBids', { n: auction.bidCount })}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-ink-800">{auction.title}</h3>
        <div className="mt-auto">
          <div className="text-[10px] text-leaf-700/60">
            {auction.bidCount > 0 ? t('auction.card.currentPrice') : t('auction.card.startPrice')}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-rose-600">
              {formatPrice(auction.currentPrice)}
            </span>
            {auction.buyNowPrice && (
              <span className="text-[10px] text-leaf-700/60">
                {t('auction.card.buyNowHint', { price: formatPrice(auction.buyNowPrice) })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] text-leaf-700/70">
          <span>{t('auction.card.depositHint', { n: (auction.depositAmount / 100).toFixed(0) })}</span>
          {auction.status === 'live' ? (
            <Countdown to={auction.endAt} prefix={t('auction.card.endedPrefix')} />
          ) : auction.status === 'scheduled' ? (
            <Countdown to={auction.startAt} prefix={t('auction.card.startingPrefix')} />
          ) : (
            <span>{t('auction.card.finishedShort')}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({ auction }: { auction: Auction }) {
  const { t } = useI18n();
  if (auction.status === 'live')
    return (
      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
        {t('auction.status.live')}
      </span>
    );
  if (auction.status === 'scheduled')
    return (
      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
        {t('auction.status.scheduled')}
      </span>
    );
  if (auction.status === 'finished') {
    if (auction.result === 'no_bidder')
      return (
        <span className="rounded-full bg-leaf-200 px-2 py-0.5 text-[10px] text-leaf-800">
          {t('auction.status.noBidder')}
        </span>
      );
    return (
      <span className="rounded-full bg-leaf-700 px-2 py-0.5 text-[10px] text-white">
        {t('auction.status.sold')}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-leaf-300 px-2 py-0.5 text-[10px] text-leaf-800">
      {t('auction.status.cancelled')}
    </span>
  );
}

export function Countdown({
  to,
  prefix = '',
  className,
}: {
  to: string;
  prefix?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(to).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  let label: string;
  if (days > 0) label = t('auction.countdown.daysHours', { days, hours });
  else if (hours > 0) label = t('auction.countdown.hoursMinutes', { hours, minutes });
  else if (minutes > 0) label = t('auction.countdown.minutesSeconds', { minutes, seconds });
  else label = t('auction.countdown.seconds', { seconds });
  if (diff === 0) label = t('auction.countdown.ended');

  // 最后 5 分钟红色高亮
  const urgent = diff > 0 && diff < 5 * 60 * 1000;
  return (
    <span className={cn(urgent ? 'text-rose-600 font-semibold' : '', className)}>
      {prefix}
      {label}
    </span>
  );
}
