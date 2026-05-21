'use client';

import { useI18n } from '@/i18n/I18nContext';
import { BoardsTreeMenu } from '@/components/layout/BoardsTreeMenu';
import { SidebarQuickDiscovery } from '@/components/layout/SidebarQuickDiscovery';
import { SystemBoardsCard } from '@/components/layout/SystemBoardsCard';
import { TopicsCard } from '@/components/home/TopicsCard';
import { SignInCard } from '@/components/home/SignInCard';
import { RecommendUsers } from '@/components/home/RecommendUsers';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';

interface SystemMenuItem {
  id: string;
  cardKey: string | null;
  enabled: boolean;
  location: string;
  path: string | null;
  name: string;
  icon: string;
  orderIdx: number;
}

function parseMenuIcon(icon: string): { image?: string; emoji?: string } {
  try {
    const parsed = JSON.parse(icon);
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!first) return {};
    if (first.startsWith('http')) return { image: first };
    return { emoji: first };
  } catch {
    if (icon.startsWith('http')) return { image: icon };
    return { emoji: icon };
  }
}

// 根据 cardKey 返回对应的组件
function LeftCardComponent({ cardKey, users }: { cardKey: string; users?: any[] }) {
  switch (cardKey) {
    case 'card:boards': return <LeftBoardsCard />;
    case 'card:system_boards': return <SystemBoardsCard location="sidebar_left" />;
    case 'card:hot_species': return <SidebarQuickDiscovery />;
    case 'card:topics': return <TopicsCard />;
    case 'card:signin': return <SignInCard />;
    case 'card:recommend_users': return <RecommendUsers users={users || []} />;
    default: return null;
  }
}

function LeftBoardsCard() {
  const { systemMenus } = useFeatureFlags() as any;
  const boardsMenu = systemMenus?.find((m: SystemMenuItem) => m.cardKey === 'card:boards' && m.location === 'sidebar_left');
  const icon = boardsMenu ? parseMenuIcon(boardsMenu.icon) : null;

  return (
    <div className="rounded-none border border-leaf-100 bg-white overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-2.5 border-b border-leaf-100/60">
        {icon?.image ? (
          <img src={icon.image} width={32} height={32} alt="" className="object-contain shrink-0" />
        ) : icon?.emoji ? (
          <span className="text-base shrink-0">{icon.emoji}</span>
        ) : null}
        <span className="text-base font-bold text-ink-800">{boardsMenu?.name || '板块'}</span>
      </div>
      <div className="max-h-[60vh]">
        <BoardsTreeMenu />
      </div>
    </div>
  );
}

function LeftButtonCard({ menus }: { menus: SystemMenuItem[] }) {
  if (menus.length === 0) return null;
  return (
    <div className="rounded-none border border-leaf-100 bg-white overflow-hidden">
      <div className="p-2">
        {menus.map((menu) => {
          const { image, emoji } = parseMenuIcon(menu.icon);
          return menu.path ? (
            <a
              key={menu.id}
              href={menu.path}
              className="flex items-center gap-2 px-2 py-2 rounded-none text-sm text-ink-700 hover:bg-leaf-50 hover:text-leaf-700 transition-colors"
            >
              {image ? (
                <img src={image} width={20} height={20} alt="" className="object-contain" />
              ) : emoji ? (
                <span className="text-base">{emoji}</span>
              ) : null}
              <span className="truncate">{menu.name}</span>
            </a>
          ) : (
            <div
              key={menu.id}
              className="flex items-center gap-2 px-2 py-2 rounded-none text-sm text-ink-400 cursor-default"
            >
              {image ? (
                <img src={image} width={20} height={20} alt="" className="object-contain" />
              ) : emoji ? (
                <span className="text-base">{emoji}</span>
              ) : null}
              <span className="truncate">{menu.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Sidebar — 左侧侧边栏
 */
export function Sidebar({ recommendUsers = [] }: { recommendUsers?: any[] }) {
  const { t } = useI18n();
  const { systemMenus, _loaded } = useFeatureFlags() as any;

  // 等数据加载完成后才能判断
  if (!_loaded) return null;

  // 左侧所有菜单，按 orderIdx 排序
  const leftAllMenus = systemMenus
    .filter((m: SystemMenuItem) => m.location === 'sidebar_left' && m.enabled)
    .sort((a: SystemMenuItem, b: SystemMenuItem) => a.orderIdx - b.orderIdx);

  // 分离卡片和按钮
  const cardMenus = leftAllMenus.filter((m: SystemMenuItem) => m.cardKey && !m.path);
  const buttonMenus = leftAllMenus.filter((m: SystemMenuItem) => m.path && !m.cardKey);

  const hasLeftContent = leftAllMenus.length > 0;
  if (!hasLeftContent) return null;

  return (
    <aside className="sticky top-[60px] hidden h-[calc(100vh-72px)] w-56 shrink-0 space-y-3 overflow-y-auto pr-2 lg:block">
      {/* 卡片类菜单，按 orderIdx 顺序 */}
      {cardMenus.map((menu: SystemMenuItem) => (
        <LeftCardComponent key={menu.id} cardKey={menu.cardKey!} users={recommendUsers} />
      ))}

      {/* 按钮类快捷入口 */}
      <LeftButtonCard menus={buttonMenus} />

      <div className="mt-6 mb-2 px-3 text-[11px] text-leaf-600/60">
        {t('nav.sidebar.copyright', { year: new Date().getFullYear() })}
      </div>
    </aside>
  );
}