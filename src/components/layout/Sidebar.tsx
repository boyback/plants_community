'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/client-api';
import type { Board } from '@/lib/types';

const mainNav: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: '首页', icon: 'home' },
  { href: '/board', label: '全部板块', icon: 'board' },
  { href: '/plants', label: '多肉图鉴', icon: 'plants' },
  { href: '/messages', label: '私信', icon: 'message' },
  { href: '/notifications', label: '通知', icon: 'bell' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);

  useEffect(() => {
    api.get<Board[]>('/api/boards').then(setBoards).catch(() => null);
  }, []);

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
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-wider text-leaf-600/70">
          热门板块
        </div>
        <div className="space-y-0.5">
          {boards.slice(0, 6).map((b) => {
            const active = pathname === `/board/${b.slug}`;
            return (
              <Link
                key={b.id}
                href={`/board/${b.slug}`}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                  active
                    ? 'bg-leaf-100 text-leaf-800 font-medium'
                    : 'text-ink-800 hover:bg-leaf-50'
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{b.icon}</span>
                  {b.name}
                </span>
                <span className="text-[11px] text-leaf-600/70">
                  {(b.posts / 1000).toFixed(1)}k
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {user && (
        <div className="mt-6 rounded-2xl border border-leaf-100 bg-gradient-to-br from-leaf-50 to-white p-4">
          <div className="mb-1 text-xs text-leaf-700/80">当前账号</div>
          <div className="text-sm font-medium">{user.name}</div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-leaf-700">
            <span>Lv.{user.level}</span>
            <span>{user.posts} 帖</span>
            <span>{user.followers} 粉</span>
          </div>
        </div>
      )}

      <div className="mt-6 mb-2 px-3 text-[11px] text-leaf-600/60">
        © {new Date().getFullYear()} 肉友社
      </div>
    </aside>
  );
}
