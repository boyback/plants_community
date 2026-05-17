'use client';

import { useI18n } from '@/i18n/I18nContext';
import { BoardsTreeMenu } from '@/components/layout/BoardsTreeMenu';
import { SidebarQuickDiscovery } from '@/components/layout/SidebarQuickDiscovery';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';

/**
 * Sidebar — 板块树 + 热门品种
 */
export function Sidebar() {
  const { t } = useI18n();
  const { systemMenus } = useFeatureFlags();
  const sidebarMenus = systemMenus.filter((m) => m.location === 'sidebar');

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

      {/* 系统菜单 */}
      {sidebarMenus.length > 0 && (
        <div className="rounded-none border border-leaf-100 bg-white overflow-hidden">
          <div className="px-3 py-2.5 border-b border-leaf-100/60">
            <span className="text-sm font-medium text-ink-800">快捷入口</span>
          </div>
          <div className="p-2">
            {sidebarMenus.map((menu) => (
              <a
                key={menu.id}
                href={menu.path}
                className="flex items-center gap-2 px-2 py-2 rounded-none text-sm text-ink-700 hover:bg-leaf-50 hover:text-leaf-700 transition-colors"
              >
                {menu.icon.startsWith('http') ? (
                  <img src={menu.icon} width={20} alt="" />
                ) : (
                  <span className="text-base">{menu.icon}</span>
                )}
                <span className="truncate">{menu.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 热门品种 + 板块 */}
      <SidebarQuickDiscovery />

      <div className="mt-6 mb-2 px-3 text-[11px] text-leaf-600/60">
        {t('nav.sidebar.copyright', { year: new Date().getFullYear() })}
      </div>
    </aside>
  );
}

