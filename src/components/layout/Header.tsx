'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { VipBadge } from '@/components/ui/VipBadge';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';
import { ColorThemeSwitcher } from '@/components/ui/ColorThemeSwitcher';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { useI18n } from '@/i18n/I18nContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/client-api';
import type { Notification, Conversation } from '@/lib/types';

export function Header({ onToggleMobileNav }: { onToggleMobileNav?: () => void }) {
  const { user, logout, vip, equip, pointsBalance } = useAuth();
  const { t } = useI18n();
  const { subscribe } = useRealtime();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    // 兜底 60s 轮询(和 SSE 同时在,离线时也能对齐)
    const t = setInterval(fetchCounts, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [user]);

  // 实时:收到通知/私信时 + 1
  useEffect(() => {
    if (!user) return;
    const un1 = subscribe('notification', () => setUnreadNotifs((n) => n + 1));
    const un2 = subscribe('message', () => setUnreadMsgs((n) => n + 1));
    const un3 = subscribe('notification.read', () => setUnreadNotifs(0));
    const un4 = subscribe('message.read', () => setUnreadMsgs((n) => Math.max(0, n - 1)));
    return () => { un1(); un2(); un3(); un4(); };
  }, [user, subscribe]);

  return (
    <header className="sticky top-0 z-30 border-b border-leaf-100/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4">
        <button
          type="button"
          className="-ml-1 grid h-9 w-9 place-items-center rounded-lg text-leaf-700 hover:bg-leaf-50 lg:hidden"
          aria-label={t('nav.openMenu')}
          onClick={onToggleMobileNav}
        >
          <Icon name="menu" size={20} />
        </button>

        <Logo />

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          <HeaderLink href="/" icon="home">{t('nav.home')}</HeaderLink>
          <HeaderLink href="/board" icon="board">{t('nav.board')}</HeaderLink>
          <HeaderLink href="/market" icon="star">{t('nav.market')}</HeaderLink>
          <HeaderLink href="/auction" icon="star">{t('nav.auction')}</HeaderLink>
          <HeaderLink href="/plants" icon="plants">{t('nav.plants')}</HeaderLink>
          <HeaderLink href="/tasks" icon="check">{t('nav.tasks')}</HeaderLink>
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
              placeholder={t('nav.search')}
              aria-label={t('common.search')}
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {user ? (
            <>
              <Link
                href="/points"
                className="hidden md:inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2.5 py-1 text-xs text-leaf-700 hover:bg-leaf-100"
                title={t('nav.myPoints')}
              >
                💎 {pointsBalance}
              </Link>
              <IconButton href="/messages" icon="message" badge={unreadMsgs} label={t('nav.messages')} />
              <IconButton href="/notifications" icon="bell" badge={unreadNotifs} label={t('nav.notifications')} />
              <ColorThemeSwitcher />
              <LocaleSwitcher className="hidden md:block" />
              <Link
                href="/editor"
                className="hidden sm:inline-flex btn-primary h-9 !px-3 text-xs"
              >
                <Icon name="plus" size={14} />
                {t('nav.newPost')}
              </Link>
              <div
                className="relative"
                onMouseEnter={() => {
                  if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                  setMenuOpen(true);
                }}
                onMouseLeave={() => {
                  // 给点延迟,避免鼠标快速划过菜单边缘时闪烁
                  if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                  closeTimerRef.current = setTimeout(() => setMenuOpen(false), 150);
                }}
              >
                <button
                  type="button"
                  className="ml-1 flex items-center gap-2 rounded-full p-0.5 hover:bg-leaf-50"
                  // 移动端兜底:点击也能开关
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <UserAvatar
                    src={user.avatar}
                    alt={user.name}
                    size={32}
                    pendant={equip.pendant ?? null}
                    isVip={vip.isVip}
                  />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-xl">
                      {/* 顶部用户卡片 — 跳到个人主页 */}
                      <Link
                        href={`/user/${user.id}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 border-b border-leaf-50 bg-gradient-to-br from-leaf-50/60 to-white p-4 transition-colors hover:from-leaf-100/60"
                      >
                        <Avatar src={user.avatar} alt={user.name} size={44} ring />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'truncate text-sm font-semibold',
                                vip.isVip
                                  ? 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 bg-clip-text text-transparent'
                                  : ''
                              )}
                            >
                              {user.name}
                            </span>
                            {vip.isVip && <VipBadge size="xs" lifetime={vip.lifetime} />}
                          </div>
                          <div className="mt-0.5 text-[11px] text-leaf-600/80">
                            Lv.{user.level} · 💎 {pointsBalance}
                          </div>
                        </div>
                        <Icon name="arrow-right" size={14} className="text-leaf-500" />
                      </Link>

                      {/* 我的主页(快速跳转) */}
                      <RowItem
                        href={`/user/${user.id}`}
                        icon="home"
                        label="我的主页"
                        onClose={() => setMenuOpen(false)}
                      />

                      <div className="border-t border-leaf-50" />

                      {/* 设置 / 登出 */}
                      <div className="flex">
                        <Link
                          href="/settings"
                          onClick={() => setMenuOpen(false)}
                          className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-ink-700 transition-colors hover:bg-leaf-50"
                        >
                          <Icon name="settings" size={14} />
                          {t('nav.settings')}
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            setMenuOpen(false);
                            await logout();
                          }}
                          className="flex flex-1 items-center justify-center gap-1.5 border-l border-leaf-50 px-3 py-2.5 text-xs text-rose-600 transition-colors hover:bg-rose-50"
                        >
                          <Icon name="logout" size={14} />
                          {t('nav.logout')}
                        </button>
                      </div>
                    </div>
                )}
              </div>
            </>
          ) : (
            <>
              <ColorThemeSwitcher />
              <LocaleSwitcher className="mr-1" />
              <Link href="/login" className="btn-ghost h-9 text-xs">
                {t('nav.login')}
              </Link>
              <Link href="/register" className="btn-primary h-9 text-xs">
                {t('nav.register')}
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

/** 用户菜单顶部 4 格图标按钮(发帖/私信/通知/VIP)。 */
function QuickItem({
  href,
  emoji,
  label,
  badge,
  onClose,
}: {
  href: string;
  emoji: string;
  label: string;
  badge?: number;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="relative flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] text-ink-700 transition-colors hover:bg-white"
    >
      <span className="text-lg leading-none">{emoji}</span>
      <span className="leading-tight">{label}</span>
      {badge && badge > 0 ? (
        <span className="absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

/** 用户菜单中段一行式菜单(订单/地址/积分等)。 */
function RowItem({
  href,
  icon,
  label,
  suffix,
  onClose,
}: {
  href: string;
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  suffix?: string;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex w-full items-center gap-2 px-4 py-2 text-xs text-ink-800 transition-colors hover:bg-leaf-50"
    >
      <Icon name={icon} size={14} className="text-leaf-600" />
      <span className="flex-1">{label}</span>
      {suffix && <span className="text-[10px] text-ink-500">{suffix}</span>}
    </Link>
  );
}
