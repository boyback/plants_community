'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ColorThemeSwitcher } from '@/components/ui/ColorThemeSwitcher';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { SwipeBack } from '@/components/ui/SwipeBack';
import { FestivalBanner } from '@/theme/FestivalBanner';
import { FestivalParticles } from '@/theme/FestivalParticles';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { api } from '@/lib/client-api';
import type { Conversation, Notification } from '@/lib/types';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

const primaryNav: NavItem[] = [
  { href: '/', label: '首页', icon: 'home' },
  { href: '/plant-archives', label: '植物档案', icon: 'plants' },
  { href: '/ranking', label: '排行榜', icon: 'trophy' },
  { href: '/plants/favorites', label: '收藏夹', icon: 'heart' },
  { href: '/user/me', label: '关注列表', icon: 'heart' },
];

const spaceNav: NavItem[] = [
  { href: '/user/me', label: '我的帖子', icon: 'edit' },
  { href: '/user/me?tab=comments', label: '我的评论', icon: 'comment' },
  { href: '/orders', label: '我的订单', icon: 'package' },
  { href: '/user/me', label: '我的勋章', icon: 'diamond' },
  { href: '/settings', label: '设置', icon: 'settings' },
];

const topNav = [
  { href: '/board', label: '板块' },
  { href: '/plants', label: '图鉴' },
  { href: '/market', label: '交易' },
  { href: '/ai-care', label: 'AI 养护' },
  { href: '/shaitu', label: '晒图广场' },
  // { href: '/contests', label: '活动' },
];

export function AppShell({
  children,
  rightRail,
  aiRail,
  className,
  showFloatingAi = false,
  hideNavOnScrollDown = false,
}: {
  children: React.ReactNode;
  rightRail?: React.ReactNode;
  aiRail?: React.ReactNode;
  className?: string;
  showFloatingAi?: boolean;
  showLeftRail?: boolean;
  hideNavOnScrollDown?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-ink-900">
      <SwipeBack />
      <FestivalParticles />
      <FestivalBanner />
      <AppMobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="min-h-screen">
        <div className="min-w-0">
          <TopBar
            onOpenMobile={() => setMobileOpen(true)}
            hideOnScrollDown={hideNavOnScrollDown}
          />
          <div
            className={cn(
              'mx-auto grid w-full max-w-[1180px] gap-5 px-4 pb-8 lg:px-6',
              rightRail && aiRail
                ? 'xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_300px_340px]'
                : rightRail || aiRail
                  ? 'xl:grid-cols-[minmax(0,1fr)_340px]'
                  : '',
              className,
            )}
          >
            <main className="min-w-0">{children}</main>
            {rightRail && (
              <aside className="hidden min-w-0 space-y-5 xl:sticky xl:top-[136px] xl:block xl:h-[calc(100vh-152px)] xl:overflow-y-auto">
                {rightRail}
              </aside>
            )}
            {aiRail && (
              <aside
                className={cn(
                  'hidden min-w-0 space-y-5 xl:sticky xl:top-[136px] xl:h-[calc(100vh-152px)] xl:overflow-y-auto',
                  rightRail ? '2xl:block' : 'xl:block',
                )}
              >
                {aiRail}
              </aside>
            )}
          </div>
        </div>
      </div>

      {showFloatingAi && !rightRail && !aiRail && <FloatingAiToolbox />}
      <div className="h-16 md:hidden" aria-hidden />
      <MobileTabBar />
    </div>
  );
}

function AppMobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-ink-900/35 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82vw] flex-col bg-white p-4 shadow-xl transition-transform lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <Link href="/" onClick={onClose} className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-leaf-600 text-white">
              <Icon name="plants" size={20} />
            </span>
            <span>
              <span className="block text-lg font-bold text-ink-900">PlantNet</span>
              <span className="block text-[11px] text-leaf-700/70">多肉植物百科社区</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-ink-600 hover:bg-leaf-50"
            aria-label="关闭菜单"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {user && (
          <Link href={`/user/${user.id}`} onClick={onClose} className="mb-4 flex items-center gap-3 rounded-2xl bg-leaf-50 p-3">
              <UserAvatar src={user.avatar} alt={user.name} size={42} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink-900">{user.name}</span>
              <span className="block text-xs text-leaf-700/70">Lv.{user.level} 重生玩家</span>
            </span>
          </Link>
        )}

        <nav className="space-y-1 overflow-y-auto">
          {[...primaryNav, ...spaceNav].map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              onClick={onClose}
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink-700 hover:bg-leaf-50 hover:text-leaf-800"
            >
              <Icon name={item.icon} size={17} className="text-ink-500" />
              {item.label}
            </Link>
          ))}
        </nav>

        {!user && (
          <div className="mt-auto grid grid-cols-2 gap-2 border-t border-leaf-100 pt-4">
            <Link href="/login" onClick={onClose} className="rounded-xl bg-leaf-50 px-4 py-2 text-center text-sm font-semibold text-leaf-800">
              登录
            </Link>
            <Link href="/register" onClick={onClose} className="rounded-xl bg-leaf-600 px-4 py-2 text-center text-sm font-semibold text-white">
              注册
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

function TopBar({
  onOpenMobile,
  hideOnScrollDown = false,
}: {
  onOpenMobile: () => void;
  hideOnScrollDown?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, vip, equip } = useAuth();
  const { subscribe } = useRealtime();
  const [q, setQ] = useState('');
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!hideOnScrollDown) {
      setHidden(false);
      document.documentElement.style.removeProperty('--app-board-filter-top');
      return;
    }

    let lastY = window.scrollY;
    let ticking = false;

    const expandedTop = () => (window.innerWidth >= 1024 ? 112 : 64);
    const applyStickyTop = (isHidden: boolean) => {
      document.documentElement.style.setProperty(
        '--app-board-filter-top',
        isHidden ? '0px' : `${expandedTop()}px`,
      );
    };

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      const nextHidden = y > 120 && delta > 4;
      const nextShown = y < 80 || delta < -4;

      if (nextHidden) {
        setHidden(true);
        applyStickyTop(true);
      } else if (nextShown) {
        setHidden(false);
        applyStickyTop(false);
      }

      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    const onResize = () => applyStickyTop(hidden);

    applyStickyTop(hidden);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.documentElement.style.removeProperty('--app-board-filter-top');
    };
  }, [hideOnScrollDown, hidden]);

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
        setUnreadMsgs(convs.reduce((sum, item) => sum + item.unread, 0));
        setUnreadNotifs(notifs.unread ?? 0);
      } catch {
        // ignore count refresh failures
      }
    };
    void fetchCounts();
    const timer = setInterval(fetchCounts, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const un1 = subscribe('notification', () => setUnreadNotifs((n) => n + 1));
    const un2 = subscribe('message', () => setUnreadMsgs((n) => n + 1));
    const un3 = subscribe('notification.read', () => setUnreadNotifs(0));
    const un4 = subscribe('message.read', () => setUnreadMsgs((n) => Math.max(0, n - 1)));
    return () => {
      un1();
      un2();
      un3();
      un4();
    };
  }, [subscribe, user]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-leaf-100/80 bg-white/90 shadow-[0_8px_24px_rgba(15,20,25,0.04)] backdrop-blur-xl transition-transform duration-200 ease-out',
        hideOnScrollDown && hidden && '-translate-y-full',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-4 px-4 lg:px-6">
        <button
          type="button"
          onClick={onOpenMobile}
          className="grid h-10 w-10 place-items-center rounded-xl text-ink-700 hover:bg-leaf-50 lg:hidden"
          aria-label="打开菜单"
        >
          <Icon name="menu" size={18} />
        </button>

        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf-600 text-white shadow-sm">
            <Icon name="plants" size={22} />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block text-xl font-bold leading-tight text-ink-900">PlantNet</span>
            <span className="block truncate text-xs text-leaf-700/70">多肉植物百科社区</span>
          </span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-7 xl:flex">
          <form onSubmit={submit} className="relative w-[300px] shrink-0">
            <Icon name="search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-10 w-full rounded-full border border-leaf-100 bg-white pl-11 pr-12 text-sm outline-none transition focus:border-leaf-300 focus:ring-4 focus:ring-leaf-100/70"
              placeholder="搜索植物、品种、用户、内容..."
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md border border-leaf-100 px-1.5 py-0.5 text-[10px] text-ink-400">
              ⌘K
            </span>
          </form>

          <nav className="flex items-center gap-8">
            {topNav.map((item) => {
              const active = item.href === '/board' ? isCommunityActive(pathname) : isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative py-5 text-sm font-semibold transition-colors',
                    active ? 'text-leaf-800' : 'text-ink-800 hover:text-leaf-700',
                  )}
                >
                  {item.label}
                  {active && <span className="absolute bottom-0 left-0 right-0 mx-auto h-0.5 w-7 rounded-full bg-leaf-600" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <ColorThemeSwitcher />
          <Link
            href="/editor"
            className="hidden h-9 items-center gap-1.5 rounded-lg bg-leaf-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-leaf-700 sm:inline-flex"
          >
            <Icon name="plus" size={14} />
            发帖
          </Link>
          <Link
            href="/market/sell"
            className="hidden h-9 items-center gap-1.5 rounded-lg border border-leaf-200 bg-white px-3.5 text-xs font-semibold text-leaf-700 shadow-sm transition hover:border-leaf-300 hover:bg-leaf-50 sm:inline-flex"
          >
            <Icon name="shop" size={14} />
            出售
          </Link>
          {user ? (
            <Link href={`/user/${user.id}`} className="ml-1 flex items-center gap-3 rounded-full px-1 py-1 hover:bg-leaf-50">
              <UserAvatar src={user.avatar} alt={user.name} size={40} pendant={equip.pendant ?? null} isVip={vip.isVip} />
              <span className="hidden min-w-0 xl:block">
                <span className="block truncate text-sm font-semibold text-ink-900">{user.name}</span>
                <span className="block text-xs text-leaf-700/70">Lv.{user.level} 重生玩家</span>
              </span>
            </Link>
          ) : (
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-leaf-800 hover:bg-leaf-50">
              登录
            </Link>
          )}
        </div>
      </div>
      <div className="hidden border-t border-leaf-50 lg:block">
        <div className="mx-auto flex w-full max-w-[1360px] items-center px-4 py-1 lg:px-6">
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden">
            {primaryNav.map((item) => {
              const active = item.href === '/board' ? isCommunityActive(pathname) : isActive(pathname, item.href);
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={cn(
                    'group relative flex h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors',
                    active ? 'bg-leaf-50 text-leaf-800' : 'text-ink-700 hover:bg-leaf-50 hover:text-leaf-800',
                  )}
                >
                  <Icon name={item.icon} size={16} className={active ? 'text-leaf-700' : 'text-ink-500 group-hover:text-leaf-700'} />
                  <span>{item.label}</span>
                  {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-leaf-600" />}
                </Link>
              );
            })}
          </nav>
          <div className="ml-4 flex shrink-0 items-center gap-1.5">
            {user ? (
              <NotificationBell
                unreadCount={unreadNotifs + unreadMsgs}
                onReadAll={() => setUnreadNotifs(0)}
              />
            ) : (
              <NavActionIcon href="/login" icon="bell" label="通知" />
            )}
            <NavActionIcon href={user ? '/messages' : '/login'} icon="mail" label="私信" />
            <NavActionIcon href={user ? `/user/${user.id}` : '/login'} icon="user" label="个人主页" />
          </div>
        </div>
      </div>
    </header>
  );
}

function NotificationBell({
  unreadCount,
  onReadAll,
}: {
  unreadCount: number;
  onReadAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [notifications, conversations] = await Promise.all([
        api.get<{ items: Notification[]; unread: number }>('/api/notifications?limit=20').catch(() => ({ items: [], unread: 0 })),
        api.get<Conversation[]>('/api/conversations').catch(() => [] as Conversation[]),
      ]);
      setItems(Array.isArray(notifications.items) ? notifications.items : []);
      setConvs(Array.isArray(conversations) ? conversations.slice(0, 10) : []);
      if ((notifications.unread ?? 0) === 0) onReadAll();
    } finally {
      setLoading(false);
    }
  };

  const openPanel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!open) {
      setOpen(true);
      void load();
    }
  };

  const closePanelLater = () => {
    timerRef.current = setTimeout(() => setOpen(false), 150);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load();
  };

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative" onMouseEnter={openPanel} onMouseLeave={closePanelLater}>
      <button
        type="button"
        onClick={toggle}
        className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-700 transition hover:bg-leaf-50 hover:text-leaf-800"
        aria-label="消息通知"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="bell" size={17} />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-lg border border-leaf-100/80 bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-leaf-100/50 px-4 py-2.5">
            <span className="text-sm font-semibold text-ink-800">消息通知</span>
            <Link
              href="/settings/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-leaf-700 transition-colors hover:text-leaf-800"
            >
              设置
            </Link>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-leaf-700/70">加载中...</div>
            ) : (
              <>
                {convs.map((conversation) => (
                  <Link
                    key={conversation.id}
                    href={`/messages?to=${conversation.user.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 border-b border-leaf-50 px-3 py-2.5 transition-colors hover:bg-leaf-50/60"
                  >
                    <UserAvatar src={conversation.user.avatar} alt={conversation.user.name} size={32} />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="mb-0.5 flex items-center justify-between">
                        <span className="truncate text-xs font-medium text-ink-800">私信 · {conversation.user.name}</span>
                        {conversation.unread > 0 && <span className="ml-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                      </div>
                      <p className="truncate text-[11px] text-leaf-700/80">{conversation.lastMessage}</p>
                      <span className="text-[10px] text-leaf-700/60">{timeShort(conversation.lastAt)}</span>
                    </div>
                  </Link>
                ))}

                {items.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.link ?? '#'}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-start gap-2.5 border-b border-leaf-50 px-3 py-2.5 transition-colors hover:bg-leaf-50/60',
                      !notification.read && 'bg-leaf-50/40',
                    )}
                  >
                    {notification.fromUser ? (
                      <img
                        src={notification.fromUser.avatar || '/default-avatar.svg'}
                        alt={notification.fromUser.name}
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf-100 text-sm">
                        {iconForType(notification.type)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="mb-0.5 flex items-center gap-1.5">
                        {notification.fromUser && (
                          <span className="truncate text-xs font-medium text-ink-800">{notification.fromUser.name}</span>
                        )}
                        {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                      </div>
                      <p className="line-clamp-2 text-[11px] leading-[1.4] text-ink-700">{notification.text}</p>
                      <span className="text-[10px] text-leaf-700/60">{timeShort(notification.createdAt)}</span>
                    </div>
                  </Link>
                ))}

                {items.length === 0 && convs.length === 0 && (
                  <div className="py-8 text-center text-sm text-leaf-700/60">暂无消息</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function iconForType(type: Notification['type']): string {
  switch (type) {
    case 'like':
      return '♥';
    case 'comment':
      return '聊';
    case 'follow':
      return '+';
    case 'mention':
      return '@';
    case 'system':
      return '告';
    default:
      return '•';
  }
}

function timeShort(iso: string): string {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

function NavActionIcon({ href, icon, label, badge }: { href: string; icon: IconName; label: string; badge?: number }) {
  return (
    <Link href={href} aria-label={label} className="relative grid h-9 w-9 place-items-center rounded-lg text-ink-700 transition hover:bg-leaf-50 hover:text-leaf-800">
      <Icon name={icon} size={17} />
      {badge ? (
        <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  );
}

export function FloatingAiToolbox() {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-8 right-8 z-40 hidden h-16 w-16 place-items-center rounded-full bg-white shadow-xl ring-1 ring-leaf-100 lg:grid"
        aria-label="打开 AI 助手"
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-leaf-50 text-xl">🤖</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 z-40 hidden w-[320px] rounded-2xl border border-leaf-100 bg-white/96 p-5 shadow-[0_20px_56px_rgba(15,20,25,0.12)] backdrop-blur lg:block 2xl:right-10">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-lg font-bold text-ink-950">AI 助手</div>
        <button type="button" onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-full text-ink-500 hover:bg-leaf-50" aria-label="关闭">
          <Icon name="close" size={14} />
        </button>
      </div>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-leaf-50 text-2xl">🤖</span>
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-0.5 text-[11px] font-semibold text-leaf-800">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf-600" />
            在线
          </span>
          <p className="mt-2 text-sm font-semibold text-ink-900">有什么植物问题都可以问我</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {['叶片发软怎么办', '夏天如何浇水', '推荐新手多肉'].map((q) => (
          <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className="block rounded-xl border border-leaf-100 bg-sand-50 px-3 py-2.5 text-sm text-ink-700 hover:bg-leaf-50">
            {q}
          </Link>
        ))}
      </div>
    </div>
  );
}

function isCommunityActive(pathname: string) {
  return pathname.startsWith('/board') || pathname.startsWith('/editor') || pathname.startsWith('/post');
}

function isActive(pathname: string, href: string) {
  const path = href.split('?')[0];
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}
