'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';
import styles from './SystemBoardsCard.module.scss';
import { cx } from '@/lib/style-utils';



interface SystemBoardLite {
  id: string;
  slug: string;
  name: string;
  icon: string;
  linkPath?: string | null;
  posts: number;
}

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
    if (typeof first === 'string' && first.startsWith('http')) return { image: first };
    return { emoji: String(first) };
  } catch {
    if (icon?.startsWith?.('http')) return { image: icon };
    return { emoji: icon };
  }
}

// 模块级缓存,避免左右侧边栏各加载一次
let cachedBoards: SystemBoardLite[] | null = null;
let cachePromise: Promise<SystemBoardLite[]> | null = null;

export function SystemBoardsCard({ location = 'sidebar_left' }: {location?: 'sidebar_left' | 'sidebar_right';}) {
  const pathname = usePathname();
  const { systemMenus } = useFeatureFlags() as any;
  const [data, setData] = useState<SystemBoardLite[] | null>(cachedBoards);

  // 从 systemMenus 取卡片本身的标题/图标(管理员后台可改)
  const menuRow = systemMenus?.find(
    (m: SystemMenuItem) => m.cardKey === "card:system_boards" && m.location === location
  );
  const headerIcon = menuRow ? parseMenuIcon(menuRow.icon) : null;

  useEffect(() => {
    if (cachedBoards) {
      setData(cachedBoards);
      return;
    }
    if (!cachePromise) {
      cachePromise = api.
      get<SystemBoardLite[]>('/api/boards?kind=system').
      then((list) => {
        cachedBoards = list || [];
        return cachedBoards;
      }).
      catch(() => {
        cachedBoards = [];
        return [];
      }).
      finally(() => {
        cachePromise = null;
      });
    }
    cachePromise.then((list) => setData(list));
  }, []);

  if (!data || data.length === 0) return null;

  return (
    <div className={cx(styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_2cd02d11)}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_d5eab218, styles.r_e7ee55ac, styles.r_65fdbade, styles.r_38748e06)}>
        {headerIcon?.image ?
        <img src={headerIcon.image} width={32} height={32} alt="" className={cx(styles.r_b1104f41, styles.r_012fbd12)} /> :
        headerIcon?.emoji ?
        <span className={cx(styles.r_4ee73492, styles.r_012fbd12)}>{headerIcon.emoji}</span> :
        null}
        <span className={cx(styles.r_4ee73492, styles.r_69450ef1, styles.r_399e11a5)}>{menuRow?.name || '系统板块'}</span>
      </div>

      <div className={cx(styles.r_7660b450, styles.r_e2eedc57)}>
        {data.map((b) => {
          const href = b.linkPath || `/board/${b.slug}`;
          const isActive = pathname === href || pathname?.startsWith(href + '/');
          const isImageIcon = typeof b.icon === 'string' && b.icon.startsWith('http');
          return (
            <Link
              key={b.id}
              href={href}
              className={cn(cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_d5eab218, styles.r_03b4dd7f, styles.r_0c5e9137, styles.r_fc7473ca, styles.r_ceb69a6b),

              isActive ? cx(styles.r_f2b23104, styles.r_2689f395, styles.r_e7eab4cb) : cx(styles.r_399e11a5, styles.r_5756b7b4, styles.r_9825203a)


              )}>

              {isImageIcon ?
              <img src={b.icon} width={20} height={20} alt="" className={cx(styles.r_b1104f41, styles.r_012fbd12)} /> :
              b.icon ?
              <span className={cx(styles.r_4ee73492, styles.r_012fbd12)}>{b.icon}</span> :

              <span className={cx(styles.r_4ee73492, styles.r_012fbd12)}>📌</span>
              }
              <span className={styles.r_f283ea9b}>{b.name}</span>
              {b.posts > 0 &&
              <span className={cx(styles.r_fb56d9cf, styles.r_012fbd12, styles.r_1dc571a3, styles.r_4d094717)}>{b.posts}</span>
              }
            </Link>);

        })}
      </div>
    </div>);

}