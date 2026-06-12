'use client';

import { BoardsTreeMenu } from '@/components/layout/BoardsTreeMenu';
import { SignInCard } from '@/components/home/SignInCard';
import { TopicsCard } from '@/components/home/TopicsCard';
import { RecommendUsers } from '@/components/home/RecommendUsers';
import { SidebarQuickDiscovery } from '@/components/layout/SidebarQuickDiscovery';
import { SystemMenuShortcutsRight } from '@/components/home/SystemMenuShortcutsRight';
import { SystemBoardsCard } from '@/components/layout/SystemBoardsCard';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';
import styles from './RightSidebar.module.scss';
import { cx } from '@/lib/style-utils';



interface RightSidebarProps {
  recommendUsers: any[];
}

function parseMenuIcon(icon: string): {image?: string;emoji?: string;} {
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
function CardComponent({ cardKey, users }: {cardKey: string;users?: any[];}) {
  switch (cardKey) {
    case "card:boards":return <BoardsCard />;
    case "card:system_boards":return <SystemBoardsCard location="sidebar_right" />;
    case "card:signin":return <SignInCard />;
    case "card:hot_species":return <SidebarQuickDiscovery />;
    case "card:topics":return <TopicsCard />;
    case "card:recommend_users":return <RecommendUsers users={users || []} />;
    default:return null;
  }
}

function BoardsCard() {
  const { systemMenus } = useFeatureFlags() as any;
  const boardsMenu = systemMenus?.find((m: any) => m.cardKey === "card:boards" && m.location === 'sidebar_right');
  const icon = boardsMenu ? parseMenuIcon(boardsMenu.icon) : null;

  return (
    <div className={cx(styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_2cd02d11)}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_d5eab218, styles.r_e7ee55ac, styles.r_65fdbade, styles.r_38748e06)}>
        {icon?.image ?
        <img src={icon.image} width={32} height={32} alt="" className={cx(styles.r_b1104f41, styles.r_012fbd12)} /> :
        icon?.emoji ?
        <span className={cx(styles.r_4ee73492, styles.r_012fbd12)}>{icon.emoji}</span> :
        null}
        <span className={cx(styles.r_4ee73492, styles.r_69450ef1, styles.r_399e11a5)}>{boardsMenu?.name || '板块'}</span>
      </div>
      <div className={styles.r_5be605a0}>
        <BoardsTreeMenu />
      </div>
    </div>);

}

export function RightSidebar({ recommendUsers }: RightSidebarProps) {
  const { systemMenus, _loaded } = useFeatureFlags() as any;

  // 等数据加载完成后才能判断
  if (!_loaded) return null;

  // 右侧所有菜单（卡片 + 按钮），按 orderIdx 排序
  const rightAllMenus = systemMenus.
  filter((m: any) => m.location === 'sidebar_right' && m.enabled).
  sort((a: any, b: any) => a.orderIdx - b.orderIdx);

  // 分离卡片和按钮
  const cardMenus = rightAllMenus.filter((m: any) => m.cardKey && !m.path);
  const buttonMenus = rightAllMenus.filter((m: any) => m.path && !m.cardKey);

  const hasRightContent = rightAllMenus.length > 0;
  if (!hasRightContent) return null;

  return (
    <div className={cx(styles.r_b43b4c08, styles.r_f271783c, styles.r_5ca527be, styles.r_bb3508ed, styles.r_e07ac670, styles.r_90b8aaf3)}>
      {/* 卡片类菜单，按 orderIdx 顺序 */}
      {cardMenus.map((menu: any) =>
      <CardComponent key={menu.id} cardKey={menu.cardKey} users={recommendUsers} />
      )}

      {/* 按钮类快捷入口 */}
      {buttonMenus.length > 0 &&
      <SystemMenuShortcutsRight menus={buttonMenus} />
      }
    </div>);

}