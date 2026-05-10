'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Empty } from '@/components/ui/Empty';
import { Icon } from '@/components/ui/Icon';
import { AuctionCard } from '@/components/auction/AuctionCard';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { hasPermission } from '@/lib/levels';
import { api } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import type { Auction } from '@/lib/types';

const TABS = [
  { key: 'live', icon: '🔨', labelKey: 'auction.tabLive' },
  { key: 'scheduled', icon: '⏳', labelKey: 'auction.tabScheduled' },
  { key: 'finished', icon: '🏁', labelKey: 'auction.tabFinished' },
  { key: 'mine', icon: '📦', labelKey: 'nav.myOrders' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function AuctionPage() {
  const { user, vip } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>('live');
  const [list, setList] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  const canPublish = hasPermission(
    user ? { level: user.level, isVip: vip.isVip } : null,
    'market:sell'
  );

  useEffect(() => {
    setLoading(true);
    if (tab === 'mine') {
      if (!user) {
        setList([]);
        setLoading(false);
        return;
      }
      api
        .get<{ items: Auction[] }>(
          `/api/auctions?seller=${encodeURIComponent(user.id)}&limit=50`
        )
        .then((r) => setList(r.items))
        .catch(() => setList([]))
        .finally(() => setLoading(false));
    } else {
      api
        .get<{ items: Auction[] }>(`/api/auctions?status=${tab}&limit=24`)
        .then((r) => setList(r.items))
        .catch(() => setList([]))
        .finally(() => setLoading(false));
    }
  }, [tab, user?.id]);

  return (
    <Shell>
      {/* 与 /market 一致的市场 tab */}
      <div className="mb-4 flex gap-1 border-b border-leaf-100">
        <Link
          href="/market"
          className="px-4 py-2 text-sm text-ink-700/60 hover:text-leaf-700"
        >
          🛒 一口价
        </Link>
        <span className="border-b-2 border-leaf-500 px-4 py-2 text-sm font-medium text-leaf-700">
          🔨 拍卖会
        </span>
      </div>

      <div className="card mb-6 overflow-hidden">
        <div className="bg-gradient-to-br from-rose-500 via-rose-400 to-amber-300 p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">🔨 {t('auction.title')}</h1>
              <p className="mt-1 max-w-xl text-xs opacity-90">{t('auction.subtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canPublish ? (
                <Link
                  href="/auction/new"
                  className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-50"
                >
                  <Icon name="plus" size={14} />
                  {t('auction.create.title')}
                </Link>
              ) : user ? (
                <span
                  className="rounded-full bg-white/20 px-4 py-2 text-xs"
                  title={t('auction.create.needLevel')}
                >
                  🔒 {t('auction.create.needLevel')}
                </span>
              ) : (
                <Link
                  href="/login?redirect=/auction"
                  className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-50"
                >
                  {t('nav.login')}
                </Link>
              )}
              <Link
                href="/orders"
                className="inline-flex items-center rounded-full border border-white/40 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                {t('nav.myOrders')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="mb-4 flex items-center gap-1 border-b border-leaf-100">
        {TABS.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'relative px-4 py-2.5 text-sm transition-colors',
              tab === item.key ? 'text-leaf-700 font-medium' : 'text-ink-700/60 hover:text-leaf-700'
            )}
          >
            {item.icon} {t(item.labelKey)}
            {tab === item.key && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-leaf-500" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>
      ) : list.length === 0 ? (
        <Empty
          icon="🔨"
          title={t('common.empty')}
          desc={canPublish ? t('auction.create.title') : undefined}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((a) => (
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      )}
    </Shell>
  );
}
