'use client';

import { BoardsTreeMenu } from '@/components/layout/BoardsTreeMenu';
import { SignInCard } from '@/components/home/SignInCard';
import { TopicsCard } from '@/components/home/TopicsCard';
import { RecommendUsers } from '@/components/home/RecommendUsers';
import { SidebarQuickDiscovery } from '@/components/layout/SidebarQuickDiscovery';
import { SystemMenuShortcutsRight } from '@/components/home/SystemMenuShortcutsRight';
import { SystemBoardsCard } from '@/components/layout/SystemBoardsCard';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';

interface RightSidebarProps {
  recommendUsers: any[];
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
function CardComponent({ cardKey, users }: { cardKey: string; users?: any[] }) {
  switch (cardKey) {
    case 'card:boards': return <BoardsCard />;
    case 'card:system_boards': return <SystemBoardsCard location="sidebar_right" />;
    case 'card:signin': return <SignInCard />;
    case 'card:hot_species': return <SidebarQuickDiscovery />;
    case 'card:topics': return <TopicsCard />;
    case 'card:recommend_users': return <RecommendUsers users={users || []} />;
    default: return null;
  }
}

function BoardsCard() {
  const { systemMenus } = useFeatureFlags() as any;
  const boardsMenu = systemMenus?.find((m: any) => m.cardKey === 'card:boards' && m.location === 'sidebar_right');
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

export function RightSidebar({ recommendUsers }: RightSidebarProps) {
  const { systemMenus, _loaded } = useFeatureFlags() as any;

  // 等数据加载完成后才能判断
  if (!_loaded) return null;

  // 右侧所有菜单（卡片 + 按钮），按 orderIdx 排序
  const rightAllMenus = systemMenus
    .filter((m: any) => m.location === 'sidebar_right' && m.enabled)
    .sort((a: any, b: any) => a.orderIdx - b.orderIdx);

  // 分离卡片和按钮
  const cardMenus = rightAllMenus.filter((m: any) => m.cardKey && !m.path);
  const buttonMenus = rightAllMenus.filter((m: any) => m.path && !m.cardKey);

  const hasRightContent = rightAllMenus.length > 0;
  if (!hasRightContent) return null;

  return (
    <div className="space-y-5 xl:sticky xl:top-[60px] xl:self-start xl:h-[calc(100vh-72px)] xl:overflow-y-auto">
      {/* 卡片类菜单，按 orderIdx 顺序 */}
      {cardMenus.map((menu: any) => (
        <CardComponent key={menu.id} cardKey={menu.cardKey} users={recommendUsers} />
      ))}

      {/* 按钮类快捷入口 */}
      {buttonMenus.length > 0 && (
        <SystemMenuShortcutsRight menus={buttonMenus} />
      )}
    </div>
  );
}