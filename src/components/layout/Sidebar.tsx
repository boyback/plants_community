'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn, boardUrl } from '@/lib/utils';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api } from '@/lib/client-api';
import { VipBadge } from '@/components/ui/VipBadge';
import { SidebarMarket } from '@/components/layout/SidebarMarket';
import type { Board } from '@/lib/types';

/**
 * Sidebar 主导航 - 5 项核心入口。
 * 用户中心相关(订单/地址/积分/VIP/任务/私信/通知)挪到 Header 右上角头像菜单。
 */
const mainNav: { href: string; labelKey: string; icon: IconName }[] = [
  { href: '/', labelKey: 'nav.home', icon: 'home' },
  { href: '/board', labelKey: 'nav.sidebar.allBoards', icon: 'board' },
  { href: '/plants', labelKey: 'nav.sidebar.plants', icon: 'plants' },
];

type BoardTab = 'following' | 'hot';

export function Sidebar() {
  const pathname = usePathname();
  const { user, vip, pointsBalance, expProgress } = useAuth();
  const { t } = useI18n();

  const [hotBoards, setHotBoards] = useState<Board[]>([]);
  const [followedBoards, setFollowedBoards] = useState<Board[] | null>(null);
  const [tab, setTab] = useState<BoardTab>('hot');

  useEffect(() => {
    api.get<Board[]>('/api/categories?kind=family').then((list) => setHotBoards(list)).catch(() => null);
  }, []);

  // 登录后拉「我关注的板块」
  useEffect(() => {
    if (!user) {
      setFollowedBoards(null);
      setTab('hot');
      return;
    }
    api
      .get<Board[]>('/api/boards/followed')
      .then((list) => {
        setFollowedBoards(list);
        // 有关注板块时,默认展示「我的关注」tab
        if (list.length > 0) setTab('following');
      })
      .catch(() => setFollowedBoards([]));
  }, [user]);

  const showFollowingTab = !!user && (followedBoards?.length ?? 0) > 0;
  const currentList =
    tab === 'following' && followedBoards ? followedBoards.slice(0, 12) : hotBoards.slice(0, 6);

  return (
    <aside className="sticky top-[60px] hidden h-[calc(100vh-72px)] w-56 shrink-0 overflow-y-auto pr-2 lg:block">
      <nav className="space-y-0.5">
        {mainNav.map((n) => {
          const active =
            pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href));
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-leaf-100 text-leaf-800 font-medium'
                  : 'text-ink-800 hover:bg-leaf-50 hover:text-leaf-700'
              )}
            >
              <Icon name={n.icon} size={17} />
              {t(n.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        {showFollowingTab ? (
          <div className="mb-2 flex items-center gap-1 rounded-full bg-leaf-50 p-0.5 text-[11px]">
            <TabBtn active={tab === 'following'} onClick={() => setTab('following')}>
              {t('nav.sidebar.myFollowing')}
            </TabBtn>
            <TabBtn active={tab === 'hot'} onClick={() => setTab('hot')}>
              {t('nav.sidebar.hot')}
            </TabBtn>
          </div>
        ) : (
          <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-leaf-600/70">
            {t('nav.sidebar.hotBoards')}
          </div>
        )}

        {currentList.length === 0 ? (
          <div className="rounded-lg bg-leaf-50/50 px-3 py-4 text-center text-[11px] text-leaf-700/60">
            {tab === 'following' ? t('nav.sidebar.emptyFollowingHint') : t('nav.sidebar.emptyHot')}
          </div>
        ) : (
          <div className="space-y-0.5">
            {currentList.map((b) => {
              const url = boardUrl(b);
              const active = pathname === url;
              const subtitle =
                b.level === 'genus' ? b.path[0]?.name : b.level === 'species' ? b.path[1]?.name : undefined;
              return (
                <Link
                  key={b.id}
                  href={url}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                    active
                      ? 'bg-leaf-100 text-leaf-800 font-medium'
                      : 'text-ink-800 hover:bg-leaf-50'
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{b.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{b.name}</span>
                      {subtitle && (
                        <span className="block truncate text-[10px] text-leaf-600/70">
                          {subtitle}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-leaf-600/70">
                    {b.posts > 999 ? `${(b.posts / 1000).toFixed(1)}k` : b.posts}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {tab === 'following' && followedBoards && followedBoards.length > 12 && (
          <Link
            href={`/user/${user!.id}?tab=following-boards`}
            className="mt-2 block text-center text-[10px] text-leaf-700 hover:underline"
          >
            {t('nav.sidebar.viewAllFollow', { n: followedBoards.length })}
          </Link>
        )}
      </div>

      {/* 热门板块下面 → 商品/拍卖(放在账号卡之前) */}
      <SidebarMarket />

      {user && (
        <div className="mt-6 rounded-2xl border border-leaf-100 bg-gradient-to-br from-leaf-50 to-white p-4">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-leaf-700/80">
            {t('nav.sidebar.currentAccount')}
            {vip.isVip && <VipBadge size="xs" lifetime={vip.lifetime} />}
          </div>
          <div
            className={cn(
              'text-sm font-medium',
              vip.isVip
                ? 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 bg-clip-text text-transparent'
                : ''
            )}
          >
            {user.name}
          </div>
          {expProgress && (
            <>
              <div className="mt-2 flex items-baseline justify-between text-[10px] text-leaf-700/70">
                <span>Lv.{user.level}</span>
                {expProgress.isMax ? (
                  <span>{t('nav.sidebar.maxLevel')}</span>
                ) : (
                  <span>{t('nav.sidebar.expToNext', { level: user.level + 1, need: expProgress.pointsToNext })}</span>
                )}
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-leaf-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-leaf-400 to-leaf-600"
                  style={{ width: `${expProgress.percent}%` }}
                />
              </div>
            </>
          )}
          <div className="mt-3 grid grid-cols-3 text-center text-[11px]">
            <div>
              <div className="font-semibold text-ink-800">{user.posts}</div>
              <div className="text-leaf-700/70">{t('nav.sidebar.statPosts')}</div>
            </div>
            <div>
              <div className="font-semibold text-ink-800">💎{pointsBalance}</div>
              <div className="text-leaf-700/70">{t('nav.sidebar.statPoints')}</div>
            </div>
            <div>
              <div className="font-semibold text-ink-800">{user.followers}</div>
              <div className="text-leaf-700/70">{t('nav.sidebar.statFollowers')}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 mb-2 px-3 text-[11px] text-leaf-600/60">
        {t('nav.sidebar.copyright', { year: new Date().getFullYear() })}
      </div>
    </aside>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-full px-2.5 py-1.5 transition-colors',
        active
          ? 'bg-white text-leaf-700 shadow-sm font-medium'
          : 'text-ink-700/60 hover:text-leaf-700'
      )}
    >
      {children}
    </button>
  );
}
