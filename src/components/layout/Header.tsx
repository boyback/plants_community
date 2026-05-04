'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/client-api';
import type { Notification, Conversation } from '@/lib/types';

export function Header({ onToggleMobileNav }: { onToggleMobileNav?: () => void }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadMsgs(0);
      setUnreadNotifs(0);
      return;
    }
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const [convs, notifs] = await Promise.all([
          api.get<Conversation[]>('/api/conversations').catch(() => []),
          api.get<{ items: Notification[]; unread: number }>('/api/notifications').catch(() => ({ items: [], unread: 0 })),
        ]);
        if (cancelled) return;
        setUnreadMsgs(convs.reduce((s, c) => s + c.unread, 0));
        setUnreadNotifs(notifs.unread);
      } catch {
        // ignore
      }
    };
    fetchCounts();
    const t = setInterval(fetchCounts, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user]);

  return (
    <header className="sticky top-0 z-30 border-b border-leaf-100/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4">
        <button
          type="button"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-lg text-leaf-700 hover:bg-leaf-50 lg:hidden"
          aria-label="打开导航"
          onClick={onToggleMobileNav}
        >
          <Icon name="menu" size={20} />
        </button>

        <Logo />

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          <HeaderLink href="/" icon="home">
            首页
          </HeaderLink>
          <HeaderLink href="/board" icon="board">
            板块
          </HeaderLink>
          <HeaderLink href="/plants" icon="plants">
            多肉图鉴
          </HeaderLink>
          <HeaderLink href="/about" icon="info">
            关于
          </HeaderLink>
        </nav>

        <div className="ml-auto hidden flex-1 max-w-md md:block">
          <div className="relative">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-leaf-400"
              size={16}
            />
            <input
              className="input pl-9"
              placeholder="搜索帖子、板块、用户..."
              aria-label="搜索"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {user ? (
            <>
              <IconButton href="/messages" icon="message" badge={unreadMsgs} label="私信" />
              <IconButton href="/notifications" icon="bell" badge={unreadNotifs} label="通知" />
              <Link
                href="/editor"
                className="hidden sm:inline-flex btn-primary h-9 !px-3 text-xs"
              >
                <Icon name="plus" size={14} />
                发帖
              </Link>
              <div className="relative">
                <button
                  type="button"
                  className="ml-1 flex items-center gap-2 rounded-full p-0.5 hover:bg-leaf-50"
                  onClick={() => setMenuOpen((o) => !o)}
                >
                  <Avatar src={user.avatar} alt={user.name} size={32} ring />
                </button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-leaf-100 bg-white shadow-lg">
                      <div className="border-b border-leaf-50 px-3 py-3">
                        <div className="text-sm font-medium">{user.name}</div>
                        <div className="text-xs text-leaf-600">Lv.{user.level}</div>
                      </div>
                      <MenuItem href={`/user/${user.id}`} icon="user" onClick={() => setMenuOpen(false)}>
                        个人主页
                      </MenuItem>
                      <MenuItem href="/editor" icon="edit" onClick={() => setMenuOpen(false)}>
                        发布新帖
                      </MenuItem>
                      <MenuItem
                        icon="logout"
                        onClick={async () => {
                          setMenuOpen(false);
                          await logout();
                        }}
                      >
                        退出登录
                      </MenuItem>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost h-9 text-xs">
                登录
              </Link>
              <Link href="/register" className="btn-primary h-9 text-xs">
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon: Parameters<typeof Icon>[0]['name'];
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-ink-800 hover:bg-leaf-50 hover:text-leaf-700"
    >
      <Icon name={icon} size={16} />
      {children}
    </Link>
  );
}

function IconButton({
  href,
  icon,
  badge,
  label,
}: {
  href: string;
  icon: Parameters<typeof Icon>[0]['name'];
  badge?: number;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="relative grid h-9 w-9 place-items-center rounded-lg text-leaf-700 hover:bg-leaf-50"
    >
      <Icon name={icon} size={18} />
      {badge ? (
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-medium text-white'
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

function MenuItem({
  href,
  icon,
  onClick,
  children,
}: {
  href?: string;
  icon: Parameters<typeof Icon>[0]['name'];
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const content = (
    <>
      <Icon name={icon} size={15} className="text-leaf-600" />
      <span>{children}</span>
    </>
  );
  const cls = 'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-leaf-50 text-ink-800';
  if (href) {
    return (
      <Link href={href} className={cls} onClick={onClick}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  );
}
