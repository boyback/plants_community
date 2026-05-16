'use client';

import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { BoardsTreeMenu } from '@/components/layout/BoardsTreeMenu';
import { SidebarQuickDiscovery } from '@/components/layout/SidebarQuickDiscovery';
import { UserAccountCard } from '@/components/layout/UserAccountCard';

/**
 * Sidebar — 板块树 + 热门品种 + 账号卡
 */
export function Sidebar() {
  const { user, vip, pointsBalance, expProgress } = useAuth();
  const { t } = useI18n();

  return (
    <aside className="sticky top-[60px] hidden h-[calc(100vh-72px)] w-56 shrink-0 space-y-3 overflow-y-auto pr-2 lg:block">
      {/* 板块 */}
      <div className="rounded-none border border-leaf-100 bg-white overflow-hidden">
        <div className="flex items-center gap-1 px-2 py-2.5 border-b border-leaf-100/60">
          <span className="text-base shrink-0"><img src="https://cdn.plantcommunity.cn/cmoz85oi8000ay601io2nm9iv/202605/mp84gs706aeu9k.png" width={32} alt="" /></span>
          <span className="text-sm font-medium text-ink-800">板块</span>
        </div>
        <div className="max-h-[60vh]">
          <BoardsTreeMenu />
        </div>
      </div>

      {/* 热门品种 + 板块 */}
      <SidebarQuickDiscovery />

      {user && (
        <UserAccountCard />
      )}

      <div className="mt-6 mb-2 px-3 text-[11px] text-leaf-600/60">
        {t('nav.sidebar.copyright', { year: new Date().getFullYear() })}
      </div>
    </aside>
  );
}

