'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';

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

function parseMenuIcon(icon: string): { image?: string; emoji?: string } {
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

export function SystemBoardsCard({ location = 'sidebar_left' }: { location?: 'sidebar_left' | 'sidebar_right' }) {
  const pathname = usePathname();
  const { systemMenus } = useFeatureFlags() as any;
  const [data, setData] = useState<SystemBoardLite[] | null>(cachedBoards);

  // 从 systemMenus 取卡片本身的标题/图标(管理员后台可改)
  const menuRow = systemMenus?.find(
    (m: SystemMenuItem) => m.cardKey === 'card:system_boards' && m.location === location,
  );
  const headerIcon = menuRow ? parseMenuIcon(menuRow.icon) : null;

  useEffect(() => {
    if (cachedBoards) {
      setData(cachedBoards);
      return;
    }
    if (!cachePromise) {
      cachePromise = api
        .get<SystemBoardLite[]>('/api/boards?kind=system')
        .then((list) => {
          cachedBoards = list || [];
          return cachedBoards;
        })
        .catch(() => {
          cachedBoards = [];
          return [];
        })
        .finally(() => {
          cachePromise = null;
        });
    }
    cachePromise.then((list) => setData(list));
  }, []);

  if (!data || data.length === 0) return null;

  return (
    <div className="rounded-none border border-leaf-100 bg-white overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-2.5 border-b border-leaf-100/60">
        {headerIcon?.image ? (
          <img src={headerIcon.image} width={32} height={32} alt="" className="object-contain shrink-0" />
        ) : headerIcon?.emoji ? (
          <span className="text-base shrink-0">{headerIcon.emoji}</span>
        ) : null}
        <span className="text-base font-bold text-ink-800">{menuRow?.name || '系统板块'}</span>
      </div>

      <div className="p-2 space-y-0.5">
        {data.map((b) => {
          const href = b.linkPath || `/board/${b.slug}`;
          const isActive = pathname === href || pathname?.startsWith(href + '/');
          const isImageIcon = typeof b.icon === 'string' && b.icon.startsWith('http');
          return (
            <Link
              key={b.id}
              href={href}
              className={cn(
                'flex items-center gap-2 px-2 py-2 rounded-none text-sm transition-colors',
                isActive
                  ? 'bg-leaf-100 font-medium text-leaf-800'
                  : 'text-ink-800 hover:bg-leaf-50 hover:text-leaf-700',
              )}
            >
              {isImageIcon ? (
                <img src={b.icon} width={20} height={20} alt="" className="object-contain shrink-0" />
              ) : b.icon ? (
                <span className="text-base shrink-0">{b.icon}</span>
              ) : (
                <span className="text-base shrink-0">📌</span>
              )}
              <span className="truncate">{b.name}</span>
              {b.posts > 0 && (
                <span className="ml-auto shrink-0 text-[10px] text-leaf-700/40">{b.posts}</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
