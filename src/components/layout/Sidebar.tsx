'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { VipBadge } from '@/components/ui/VipBadge';
import { BoardsTreeMenu } from '@/components/layout/BoardsTreeMenu';
import { SidebarQuickDiscovery } from '@/components/layout/SidebarQuickDiscovery';

/**
 * Sidebar — 板块树 + 热门品种 + 账号卡
 */
export function Sidebar() {
  const { user, vip, pointsBalance, expProgress } = useAuth();
  const { t } = useI18n();

  return (
    <aside className="sticky top-[60px] hidden h-[calc(100vh-72px)] w-56 shrink-0 space-y-3 overflow-y-auto pr-2 lg:block">
      {/* 板块 */}
      <div className="rounded-xl border border-leaf-100 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-leaf-100/60">
          <span className="text-base shrink-0">🌿</span>
          <span className="text-sm font-medium text-ink-800">板块</span>
        </div>
        <div className="max-h-[40vh] overflow-y-auto">
          <BoardsTreeMenu />
        </div>
      </div>

      {/* 热门品种 + 板块 */}
      <SidebarQuickDiscovery />

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

