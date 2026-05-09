'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { api } from '@/lib/client-api';
import type { Board } from '@/lib/types';

const mainNav: { href: string; labelKey: string; icon: IconName }[] = [
  { href: '/', labelKey: 'nav.home', icon: 'home' },
  { href: '/board', labelKey: 'nav.sidebar.allBoards', icon: 'board' },
  { href: '/plants', labelKey: 'nav.sidebar.plants', icon: 'plants' },
  { href: '/orders', labelKey: 'nav.myOrders', icon: 'check' },
  { href: '/addresses', labelKey: 'nav.shippingAddress', icon: 'board' },
  { href: '/settings/privacy', labelKey: 'nav.sidebar.privacySettings', icon: 'settings' },
  { href: '/points', labelKey: 'nav.pointsCenter', icon: 'star' },
  { href: '/tasks', labelKey: 'nav.activityCenter', icon: 'check' },
  { href: '/vip', labelKey: 'nav.vipCenter', icon: 'star' },
  { href: '/messages', labelKey: 'nav.messages', icon: 'message' },
  { href: '/notifications', labelKey: 'nav.notifications', icon: 'bell' },
  { href: '/about', labelKey: 'nav.about', icon: 'info' },
];

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [boards, setBoards] = useState<Board[]>([]);

  useEffect(() => {
    if (open && boards.length === 0) {
      api.get<Board[]>('/api/boards').then(setBoards).catch(() => null);
    }
  }, [open, boards.length]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink-900/40 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[80vw] flex-col bg-white shadow-xl transition-transform lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-leaf-100 px-4">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-leaf-700 hover:bg-leaf-50"
            aria-label={t('nav.closeMenu')}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        {user && (
          <div className="flex items-center gap-3 border-b border-leaf-100 px-4 py-4">
            <Avatar src={user.avatar} alt={user.name} size={44} ring />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="text-xs text-leaf-600">{t('nav.sidebar.userMeta', { level: user.level, posts: user.posts })}</div>
            </div>
          </div>
        )}
        <nav className="space-y-0.5 p-3">
          {mainNav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={onClose}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-leaf-50"
            >
              <Icon name={n.icon} size={18} />
              {t(n.labelKey)}
            </Link>
          ))}
          <Link
            href="/editor"
            onClick={onClose}
            className="mt-3 flex items-center gap-2 rounded-lg bg-leaf-500 px-3 py-2.5 text-sm text-white"
          >
            <Icon name="plus" size={18} />
            {t('nav.sidebar.newPost')}
          </Link>
        </nav>
        <div className="mt-2 px-3">
          <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-leaf-600/70">
            {t('nav.sidebar.hotBoards')}
          </div>
          <div className="space-y-0.5 pb-6">
            {boards.map((b) => (
              <Link
                key={b.id}
                href={`/board/${b.slug}`}
                onClick={onClose}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-leaf-50"
              >
                <span className="flex items-center gap-2">
                  <span>{b.icon}</span>
                  {b.name}
                </span>
                <span className="text-[11px] text-leaf-600/70">{(b.posts / 1000).toFixed(1)}k</span>
              </Link>
            ))}
          </div>
        </div>
        {!user && (
          <div className="mt-auto flex gap-2 border-t border-leaf-100 p-4">
            <Link
              href="/login"
              onClick={onClose}
              className="btn-ghost flex-1 justify-center"
            >
              {t('nav.login')}
            </Link>
            <Link
              href="/register"
              onClick={onClose}
              className="btn-primary flex-1 justify-center"
            >
              {t('nav.register')}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
