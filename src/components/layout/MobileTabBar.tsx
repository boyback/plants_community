'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

const items: { href: string; label: string; icon: IconName; match?: (p: string) => boolean }[] = [
  { href: '/', label: '首页', icon: 'home', match: (p) => p === '/' },
  { href: '/board', label: '板块', icon: 'board', match: (p) => p.startsWith('/board') },
  { href: '/editor', label: '发布', icon: 'plus' },
  { href: '/messages', label: '私信', icon: 'message', match: (p) => p.startsWith('/messages') },
  { href: '/plants', label: '图鉴', icon: 'plants', match: (p) => p.startsWith('/plants') },
];

/** 仅在 lg 以下显示的底部 Tabbar */
export function MobileTabBar() {
  const pathname = usePathname();

  // 登录页、详情页等不显示
  const hidden = ['/login', '/register'].includes(pathname);
  if (hidden) return null;

  return (
    <>
      <div className="h-16 lg:hidden" aria-hidden />
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-leaf-100 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-2xl items-stretch">
          {items.map((it) => {
            const active = it.match ? it.match(pathname) : pathname === it.href;
            const isCenter = it.label === '发布';
            if (isCenter) {
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className="relative flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px]"
                >
                  <span className="grid h-11 w-11 -translate-y-3 place-items-center rounded-2xl bg-gradient-to-br from-leaf-400 to-leaf-600 text-white shadow-md">
                    <Icon name="plus" size={20} />
                  </span>
                  <span className="-mt-2 text-leaf-700">{it.label}</span>
                </Link>
              );
            }
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px]',
                  active ? 'text-leaf-700 font-medium' : 'text-ink-700/60'
                )}
              >
                <Icon name={it.icon} size={20} />
                {it.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
