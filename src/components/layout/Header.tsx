'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

import { ColorThemeSwitcher } from '@/components/ui/ColorThemeSwitcher';

import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';
import { useI18n } from '@/i18n/I18nContext';
import { cn } from '@/lib/utils';
import { api } from '@/lib/client-api';
import type { Notification, Conversation } from '@/lib/types';

export function Header({ onToggleMobileNav }: { onToggleMobileNav?: () => void }) {
  const { user, logout, vip, equip, pointsBalance } = useAuth();
  const { t } = useI18n();
  const { subscribe } = useRealtime();
  const featureFlags = useFeatureFlags();
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
    <header className="sticky top-0 z-40 border-b border-leaf-100/50 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="flex h-14 items-center gap-6">
          {/* 左侧 - Logo + 导航 */}
          <div className="flex items-center gap-8 shrink-0">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="-ml-2 grid h-8 w-8 place-items-center rounded-none text-leaf-700 hover:bg-leaf-50/80 hover:scale-105 active:scale-95 transition-all duration-200 lg:hidden"
                aria-label={t('nav.openMenu')}
                onClick={onToggleMobileNav}
              >
                <Icon name="menu" size={16} />
              </button>
              <Logo />
            </div>

            {/* 社区导航 - 桌面端显示 */}
            <nav className="hidden lg:flex items-center gap-1">
              <HeaderLink href="/" icon="home" image="https://cdn.plantcommunity.cn/cmoz85oi8000ay601io2nm9iv/202605/mp847ljxfg8euq.png">首页</HeaderLink>
              {featureFlags['feature.market.enabled'] && (
                <HeaderLink href="/market" icon="shop" image="https://cdn.plantcommunity.cn/cmoz85oi8000ay601io2nm9iv/202605/mp83lwfvv697m6.png">交易中心</HeaderLink>
              )}
              {featureFlags['feature.shaitu.enabled'] && (
                <HeaderLink href="/shaitu" icon="image" image="https://cdn.plantcommunity.cn/cmoz85oi8000ay601io2nm9iv/202605/mp83ned8nzzm7w.png">晒图广场</HeaderLink>
              )}
              {featureFlags['feature.contests.enabled'] && (
                <HeaderLink href="/contests" icon="trophy">摄影大赛</HeaderLink>
              )}
            </nav>
          </div>

          {/* 中间 - 搜索框 */}
          <div className="hidden lg:flex flex-1 justify-center">
            <div className="w-full max-w-[480px]">
              <HeaderSearch />
            </div>
          </div>

          {/* 右侧 - 操作按钮 */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* 主题切换 */}
            <div className="hidden lg:block">
              <ColorThemeSwitcher />
            </div>

            {/* 移动端搜索图标 */}
            <Link href="/search" className="lg:hidden grid h-8 w-8 place-items-center rounded-none text-leaf-700 hover:bg-leaf-50/80 hover:scale-105 active:scale-95 transition-all duration-200">
              <Icon name="search" size={16} />
            </Link>

            {user ? (
              <>
                {/* 发帖按钮 */}
                <Link
                  href="/editor"
                  className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-none bg-leaf-600 text-white text-xs font-medium hover:bg-leaf-700 active:scale-95 transition-all duration-200"
                >
                  <Icon name="plus" size={13} />
                  发帖
                </Link>

                {/* 出售按钮 */}
                <Link
                  href="/market/sell"
                  className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-none border border-leaf-200 text-leaf-700 text-xs font-medium hover:bg-leaf-50 hover:border-leaf-300 active:scale-95 transition-all duration-200"
                >
                  <Icon name="shop" size={13} />
                  出售
                </Link>

                {/* 通知铃铛 */}
                <NotificationBell unreadCount={unreadNotifs + unreadMsgs} onReadAll={() => setUnreadNotifs(0)} />

                {/* 用户菜单 */}
                <div
                  className="relative"
                  onMouseEnter={() => {
                    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                    setMenuOpen(true);
                  }}
                  onMouseLeave={() => {
                    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                    closeTimerRef.current = setTimeout(() => setMenuOpen(false), 150);
                  }}
                >
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full p-0.5 hover:bg-leaf-50/80 active:scale-95 transition-all duration-200"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <UserAvatar
                      src={user.avatar}
                      alt={user.name}
                      size={30}
                      pendant={equip.pendant ?? null}
                      isVip={vip.isVip}
                    />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 z-20 mt-2 w-52 overflow-visible rounded-none border border-leaf-100/80 bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* 用户信息 */}
                      <Link
                        href={`/user/${user.id}`}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-leaf-50/50 transition-colors rounded-t-xl"
                      >
                        <UserAvatar
                          src={user.avatar}
                          alt={user.name}
                          size={38}
                          pendant={equip.pendant ?? null}
                          isVip={vip.isVip}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-ink-800 truncate">{user.name}</div>
                          <div className="text-xs text-ink-500 truncate">@{user.id.slice(0, 8)}</div>
                        </div>
                      </Link>

                      <div className="border-t border-leaf-50" />

                      {/* 后台管理 */}
                      {(user.role === 'moderator' || user.role === 'admin' || user.isSuperAdmin) && (
                        <Link
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-800 hover:bg-leaf-50/50 transition-colors"
                        >
                          <Icon name="settings" size={15} />
                          <span>管理</span>
                        </Link>
                      )}

                      {/* 我的订单 */}
                      <Link
                        href="/orders"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-800 hover:bg-leaf-50/50 transition-colors"
                      >
                        <Icon name="package" size={15} />
                        <span>我的订单</span>
                      </Link>

                      {/* 大会员 */}
                      <Link
                        href="/vip"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-800 hover:bg-leaf-50/50 transition-colors"
                      >
                        <Icon name="crown" size={15} />
                        <span>大会员</span>
                      </Link>

                      {/* 积分兑换 */}
                      <Link
                        href="/points"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-800 hover:bg-leaf-50/50 transition-colors"
                      >
                        <Icon name="diamond" size={15} />
                        <span>积分兑换</span>
                      </Link>

                      <div className="border-t border-leaf-50" />

                      {/* 设置 */}
                      <Link
                        href="/settings"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-800 hover:bg-leaf-50/50 transition-colors"
                      >
                        <Icon name="settings" size={15} />
                        <span>设置</span>
                      </Link>

                      {/* 退出 */}
                      <button
                        type="button"
                        onClick={async () => {
                          setMenuOpen(false);
                          await logout();
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50/50 transition-colors rounded-b-xl"
                      >
                        <Icon name="logout" size={15} />
                        <span>退出</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="h-8 px-3 rounded-none text-xs font-medium text-leaf-700 hover:bg-leaf-50/80 active:scale-95 transition-all duration-200 inline-flex items-center">
                  {t('nav.login')}
                </Link>
                <Link href="/register" className="h-8 px-3 rounded-none bg-leaf-600 text-white text-xs font-medium hover:bg-leaf-700 active:scale-95 transition-all duration-200 inline-flex items-center">
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderLink({
  href,
  children,
  icon,
  image
}: {
  href: string;
  children: React.ReactNode;
  icon: Parameters<typeof Icon>[0]['name'];
  image:string;
}) {
  const pathname = usePathname();
  const active =
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-leaf-100 font-medium text-leaf-700'
          : 'text-ink-800 hover:bg-leaf-50 hover:text-leaf-700'
      }`}
    >
      {image?<img src={image} width={28} />:<Icon name="plus" size={16} />}
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
      className="relative grid h-9 w-9 place-items-center rounded-none text-leaf-700 hover:bg-leaf-50"
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
      className="relative flex flex-col items-center gap-0.5 rounded-none px-2 py-2 text-[10px] text-ink-700 transition-colors hover:bg-white"
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

/**
 * 设置二级菜单:hover 触发,从主项右侧弹出
 * 列出所有子设置项,点击直接跳页 + 关闭整个用户菜单
 */
/**
 * 通知铃铛 — hover / click 显示通知面板，不进行 tab 分类
 */
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
      const [n, c] = await Promise.all([
        api.get<{ items: Notification[]; unread: number }>('/api/notifications?limit=20').catch(() => ({ items: [], unread: 0 })),
        api.get<Conversation[]>('/api/conversations').catch(() => [] as Conversation[]),
      ]);
      setItems(Array.isArray(n.items) ? n.items : []);
      setConvs(Array.isArray(c) ? c.slice(0, 10) : []);
    } finally {
      setLoading(false);
    }
  };

  const onEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!open) { setOpen(true); load(); }
  };

  const onLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 150);
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        type="button"
        onClick={toggle}
        className="relative grid h-8 w-8 place-items-center rounded-none text-leaf-700 hover:bg-leaf-50/80 hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <Icon name="bell" size={16} />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white animate-in zoom-in duration-300">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-none border border-leaf-100/80 bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-leaf-100/50 px-4 py-2.5">
            <span className="text-sm font-semibold text-ink-800">消息通知</span>
            <Link href="/settings/notifications" onClick={() => setOpen(false)} className="text-xs text-leaf-700 hover:text-leaf-800 transition-colors">
              设置
            </Link>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-sm text-leaf-700/70">加载中…</div>
            ) : (
              <>
                {/* 私信 */}
                {convs.map((c) => (
                  <Link
                    key={c.id}
                    href={`/messages?to=${c.user.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 border-b border-leaf-50 px-3 py-2.5 hover:bg-leaf-50/60 transition-colors"
                  >
                    <UserAvatar src={c.user.avatar} alt={c.user.name} size={32} />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="truncate text-xs font-medium text-ink-800">💬 {c.user.name}</span>
                        {c.unread > 0 && <span className="ml-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                      </div>
                      <p className="truncate text-[11px] text-leaf-700/80">{c.lastMessage}</p>
                      <span className="text-[10px] text-leaf-700/60">{timeShort(c.lastAt)}</span>
                    </div>
                  </Link>
                ))}

                {/* 通知 */}
                {items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link ?? '#'}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-start gap-2.5 border-b border-leaf-50 px-3 py-2.5 hover:bg-leaf-50/60 transition-colors',
                      !n.read && 'bg-leaf-50/40',
                    )}
                  >
                    {n.fromUser ? (
                      <img
                        src={n.fromUser.avatar || '/default-avatar.svg'}
                        alt={n.fromUser.name}
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf-100 text-sm">
                        {iconForType(n.type)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {n.fromUser && (
                          <span className="text-xs font-medium text-ink-800 truncate">{n.fromUser.name}</span>
                        )}
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                      </div>
                      <p className="line-clamp-2 text-[11px] leading-[1.4] text-ink-700">{n.text}</p>
                      <span className="text-[10px] text-leaf-700/60">{timeShort(n.createdAt)}</span>
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

function iconForType(t: Notification['type']): string {
  switch (t) {
    case 'like': return '❤️';
    case 'comment': return '💬';
    case 'follow': return '➕';
    case 'mention': return '@';
    case 'system': return '📢';
    default: return '🔔';
  }
}

function timeShort(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ============================================================
// 顶部搜索框(form + Enter 跳 /search?q=xxx)
// ============================================================

interface HotItem {
  q: string;
  kind: 'species' | 'topic';
  count?: number;
}

function HeaderSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp?.get('q') || '');
  const [open, setOpen] = useState(false);
  const [hot, setHot] = useState<HotItem[]>([]);
  const [hotRefreshing, setHotRefreshing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // 从 localStorage 加载搜索历史
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('search.history');
        if (saved) {
          setHistory(JSON.parse(saved));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // 切换路由后同步 input(从 /search 跳走时清空)
  useEffect(() => {
    setQ(sp?.get('q') || '');
  }, [sp]);

  const fetchHot = async (shuffle = false) => {
    setHotRefreshing(true);
    try {
      const r = await fetch(`/api/search/hot${shuffle ? '?shuffle=1' : ''}`);
      const data = await r.json();
      if (data?.data?.hot) setHot(data.data.hot);
    } catch {
      // ignore
    } finally {
      setHotRefreshing(false);
    }
  };

  // 首次焦点时拉热词
  const ensureHot = async () => {
    if (hot.length > 0) return;
    void fetchHot();
  };

  // 点外部关闭
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const saveToHistory = (term: string) => {
    const v = term.trim();
    if (!v) return;
    
    // 更新历史记录（去重，最新的放前面，最多保留10条）
    const newHistory = [v, ...history.filter((h) => h !== v)].slice(0, 10);
    setHistory(newHistory);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('search.history', JSON.stringify(newHistory));
    }
  };

  const clearHistory = () => {
    setHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('search.history');
    }
  };

  const go = (term: string) => {
    const v = term.trim();
    if (!v) return;
    saveToHistory(v);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    go(q);
  };

  return (
    <div ref={containerRef} className="relative">
      <form onSubmit={submit} className="relative">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-leaf-500 transition-colors"
          size={14}
        />
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            setOpen(true);
            void ensureHot();
          }}
          className="w-full h-8 pl-8 pr-3 rounded-none border border-leaf-200/80 bg-leaf-50/30 text-xs text-ink-800 placeholder:text-leaf-600/60 focus:border-leaf-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-leaf-200/50 transition-all duration-200"
          placeholder="搜索帖子、品种、用户、板块"
          aria-label="搜索"
          autoComplete="off"
        />
      </form>

      {/* 下拉:输入空时显示历史+热词;有输入时显示「搜索 xxx」 */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-none border border-leaf-100/80 bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          {q.trim().length > 0 ? (
            <button
              type="button"
              onClick={() => go(q)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink-800 hover:bg-leaf-50/60 transition-colors"
            >
              <Icon name="search" size={14} className="text-leaf-600" />
              <span>
                搜索 <b className="font-semibold">「{q}」</b>
              </span>
            </button>
          ) : (
            <>
              {/* 搜索历史 */}
              {history.length > 0 && (
                <>
                  <div className="flex items-center justify-between border-b border-leaf-50 px-3 py-2 text-xs">
                    <span className="font-medium text-leaf-700/70">🕒 搜索历史</span>
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="text-leaf-700/70 hover:text-leaf-800 transition-colors"
                    >
                      清空
                    </button>
                  </div>
                  <div className="border-b border-leaf-50 px-2 py-1.5">
                    {history.map((h, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => go(h)}
                        className="flex w-full items-center gap-2 rounded-none px-2.5 py-1.5 text-left text-xs text-ink-800 hover:bg-leaf-50/60 transition-colors"
                      >
                        <Icon name="search" size={12} className="text-leaf-500" />
                        <span className="flex-1 truncate">{h}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* 热门搜索 */}
              <div className="flex items-center justify-between border-b border-leaf-50 px-3 py-2 text-xs">
                <span className="font-medium text-leaf-700/70">🔥 热门搜索</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void fetchHot(true);
                  }}
                  disabled={hotRefreshing}
                  className="text-leaf-700/70 hover:text-leaf-800 disabled:opacity-50 transition-colors"
                >
                  {hotRefreshing ? '换一换…' : '换一换 ↻'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 p-3">
                {hot.length === 0 && (
                  <div className="px-1 text-xs text-leaf-700/50">加载中…</div>
                )}
                {hot.map((h) => (
                  <button
                    key={`${h.kind}-${h.q}`}
                    type="button"
                    onClick={() => go(h.q)}
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium hover:scale-105 active:scale-95 transition-all duration-200',
                      h.kind === 'species'
                        ? 'bg-leaf-100 text-leaf-700 hover:bg-leaf-200'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    )}
                  >
                    {h.kind === 'species' ? h.q : `#${h.q}`}
                    {h.count !== undefined && h.count > 0 && (
                      <span className="ml-1 text-[10px] text-leaf-700/60">{h.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
