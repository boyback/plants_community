'use client';

import { useI18n } from '@/i18n/I18nContext';
import { BoardsTreeMenu } from '@/components/layout/BoardsTreeMenu';
import { SidebarQuickDiscovery } from '@/components/layout/SidebarQuickDiscovery';
import { SystemBoardsCard } from '@/components/layout/SystemBoardsCard';
import { TopicsCard } from '@/components/home/TopicsCard';
import { SignInCard } from '@/components/home/SignInCard';
import { RecommendUsers } from '@/components/home/RecommendUsers';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';
import styles from './Sidebar.module.scss';
import { cx } from '@/lib/style-utils';



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
function LeftCardComponent({ cardKey, users }: {cardKey: string;users?: any[];}) {
  switch (cardKey) {
    case "card:boards":return <LeftBoardsCard />;
    case "card:system_boards":return <SystemBoardsCard location="sidebar_left" />;
    case "card:hot_species":return <SidebarQuickDiscovery />;
    case "card:topics":return <TopicsCard />;
    case "card:signin":return <SignInCard />;
    case "card:recommend_users":return <RecommendUsers users={users || []} />;
    default:return null;
  }
}

function LeftBoardsCard() {
  const { systemMenus } = useFeatureFlags() as any;
  const boardsMenu = systemMenus?.find((m: SystemMenuItem) => m.cardKey === "card:boards" && m.location === 'sidebar_left');
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

function LeftButtonCard({ menus }: {menus: SystemMenuItem[];}) {
  if (menus.length === 0) return null;
  return (
    <div className={cx(styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_2cd02d11)}>
      <div className={styles.r_7660b450}>
        {menus.map((menu) => {
          const { image, emoji } = parseMenuIcon(menu.icon);
          return menu.path ?
          <a
            key={menu.id}
            href={menu.path}
            className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_d5eab218, styles.r_03b4dd7f, styles.r_0c5e9137, styles.r_fc7473ca, styles.r_eb6abb1f, styles.r_5756b7b4, styles.r_9825203a, styles.r_ceb69a6b)}>

              {image ?
            <img src={image} width={20} height={20} alt="" className={styles.r_b1104f41} /> :
            emoji ?
            <span className={styles.r_4ee73492}>{emoji}</span> :
            null}
              <span className={styles.r_f283ea9b}>{menu.name}</span>
            </a> :

          <div
            key={menu.id}
            className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_d5eab218, styles.r_03b4dd7f, styles.r_0c5e9137, styles.r_fc7473ca, styles.r_66a36c90, styles.r_50ca6ba5)}>

              {image ?
            <img src={image} width={20} height={20} alt="" className={styles.r_b1104f41} /> :
            emoji ?
            <span className={styles.r_4ee73492}>{emoji}</span> :
            null}
              <span className={styles.r_f283ea9b}>{menu.name}</span>
            </div>;

        })}
      </div>
    </div>);

}

/**
 * Sidebar — 左侧侧边栏
 */
export function Sidebar({ recommendUsers = [] }: {recommendUsers?: any[];}) {
  const { t } = useI18n();
  const { systemMenus, _loaded } = useFeatureFlags() as any;

  // 等数据加载完成后才能判断
  if (!_loaded) return null;

  // 左侧所有菜单，按 orderIdx 排序
  const leftAllMenus = systemMenus.
  filter((m: SystemMenuItem) => m.location === 'sidebar_left' && m.enabled).
  sort((a: SystemMenuItem, b: SystemMenuItem) => a.orderIdx - b.orderIdx);

  // 分离卡片和按钮
  const cardMenus = leftAllMenus.filter((m: SystemMenuItem) => m.cardKey && !m.path);
  const buttonMenus = leftAllMenus.filter((m: SystemMenuItem) => m.path && !m.cardKey);

  const hasLeftContent = leftAllMenus.length > 0;
  if (!hasLeftContent) return null;

  return (
    <aside className={cx(styles.r_3e0fd166, styles.r_317cfdc3, styles.r_99d72c7f, styles.r_85547d94, styles.r_d16aae84, styles.r_012fbd12, styles.r_6ed543e2, styles.r_92bf82f4, styles.r_aa2c13a5, styles.r_d0ce7c24)}>
      {/* 卡片类菜单，按 orderIdx 顺序 */}
      {cardMenus.map((menu: SystemMenuItem) =>
      <LeftCardComponent key={menu.id} cardKey={menu.cardKey!} users={recommendUsers} />
      )}

      {/* 按钮类快捷入口 */}
      <LeftButtonCard menus={buttonMenus} />

      <div className={cx(styles.r_31f25533, styles.r_a77ed4d9, styles.r_0e17f2bd, styles.r_d058ca6d, styles.r_2d91acd3)}>
        {t('nav.sidebar.copyright', { year: new Date().getFullYear() })}
      </div>
    </aside>);

}