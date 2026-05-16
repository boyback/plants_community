'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nContext';

const items: { href: string; labelKey: string; icon: IconName; center?: boolean; match?: (p: string) => boolean }[] = [
  { href: '/', labelKey: 'nav.home', icon: 'home', match: (p) => p === '/' },
  { href: '/board', labelKey: 'nav.board', icon: 'board', match: (p) => p.startsWith('/board') },
  { href: '/editor', labelKey: 'nav.mobileTabEditor', icon: 'plus', center: true },
  { href: '/plants', labelKey: 'nav.plants', icon: 'plants', match: (p) => p.startsWith('/plants') },
  { href: '/tasks', labelKey: 'nav.tasks', icon: 'check', match: (p) => p.startsWith('/tasks') },
];

/** 仅在 lg 以下显示的底部 Tabbar */
export function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useI18n();

  const hidden = ['/login', '/register'].includes(pathname);
  if (hidden) return null;

  return (
    <>
      <div className="h-16 lg:hidden" aria-hidden />
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-leaf-100 bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-2xl items-stretch">
          {items.map((it) => {
            const active = it.match ? it.match(pathname) : pathname === it.href;
            const label = t(it.labelKey);
            if (it.center) {
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className="relative flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px]"
                >
                  <span className="grid h-12 w-12 -translate-y-3.5 place-items-center rounded-none bg-gradient-to-br from-leaf-400 to-leaf-600 text-white shadow-lg shadow-leaf-500/30 transition-transform duration-200 active:scale-90">
                    <Icon name="plus" size={22} />
                  </span>
                  <span className="-mt-2.5 text-leaf-700">{label}</span>
                </Link>
              );
            }
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors',
                  active ? 'text-leaf-700 font-medium' : 'text-ink-700/60'
                )}
              >
                <Icon
                  name={it.icon}
                  size={20}
                  className={cn(
                    'transition-transform duration-200',
                    active && 'scale-110'
                  )}
                />
                {label}
                {active && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-leaf-500" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
