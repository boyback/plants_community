'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { BoardsTreeMenu } from '@/components/layout/BoardsTreeMenu';

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
    <header className="sticky top-0 z-40 border-b border-leaf-100/70 bg-white shadow-sm dark:bg-leaf-50">
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
          <BoardsDropdown />
          <HeaderLink href="/plants" icon="plants">{t('nav.plants')}</HeaderLink>
          <HeaderLink href="/market" icon="shop">交易广场</HeaderLink>
        </nav>

        <div className="ml-auto hidden flex-1 max-w-md md:block">
          <HeaderSearch />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {user ? (
            <>
              <Link
                href="/editor"
                className="hidden sm:inline-flex btn-primary h-9 !px-3 text-xs"
              >
                <Icon name="plus" size={14} />
                {t('nav.newPost')}
              </Link>
              <ColorThemeSwitcher />
              <LocaleSwitcher className="hidden md:block" />
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
                  <div className="absolute right-0 z-20 mt-2 w-36 overflow-visible rounded-xl border border-leaf-100 bg-white py-1 shadow-xl">
                    {/* 1. 消息(hover 右侧展开 7 类) */}
                    <MessagesSubmenu
                      unreadTotal={unreadNotifs + unreadMsgs}
                      onClose={() => setMenuOpen(false)}
                      onReadAll={() => setUnreadNotifs(0)}
                    />

                    {/* 2. 设置(hover 右侧展开二级菜单) */}
                    <SettingsSubmenu onNavigate={() => setMenuOpen(false)} />

                    {/* 3. 个人主页 */}
                    <Link
                      href={`/user/${user.id}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-ink-800 hover:bg-leaf-50"
                    >
                      <Icon name="home" size={14} />
                      <span>个人主页</span>
                    </Link>

                    <div className="my-1 border-t border-leaf-50" />

                    {/* 4. 退出 */}
                    <button
                      type="button"
                      onClick={async () => {
                        setMenuOpen(false);
                        await logout();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <Icon name="logout" size={14} />
                      <span>{t('nav.logout')}</span>
                    </button>
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

/**
 * 设置二级菜单:hover 触发,从主项右侧弹出
 * 列出所有子设置项,点击直接跳页 + 关闭整个用户菜单
 */
function SettingsSubmenu({ onNavigate }: { onNavigate: () => void }) {
  // hook 必须 import,但本文件已 import Link/Icon,这里 inline 用 useState
  // 保持简洁 — 不引入额外 hook 依赖
  const [open, setOpen] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const onEnter = () => {
    if (timer) {
      clearTimeout(timer);
      setTimer(null);
    }
    setOpen(true);
  };
  const onLeave = () => {
    const t = setTimeout(() => setOpen(false), 150);
    setTimer(t);
  };

  const items: { href: string; icon: IconName; label: string }[] = [
    { href: '/settings/profile', icon: 'user', label: '个人资料' },
    { href: '/settings/appearance', icon: 'palette', label: '外观与语言' },
    { href: '/settings/privacy', icon: 'lock', label: '隐私设置' },
    { href: '/orders', icon: 'package', label: '我的订单' },
    { href: '/addresses', icon: 'mail', label: '收件地址' },
    { href: '/vip', icon: 'crown', label: '大会员' },
    { href: '/points', icon: 'diamond', label: '积分中心' },
  ];

  return (
    <div
      className="relative"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <Link
        href="/settings"
        onClick={onNavigate}
        className="flex items-center gap-2 px-3 py-2 text-sm text-ink-800 hover:bg-leaf-50"
      >
        <Icon name="settings" size={14} />
        <span className="flex-1">设置</span>
        <span className="text-leaf-500">▸</span>
      </Link>

      {open && (
        <div className="absolute right-full top-0 z-30 mr-1 w-52 overflow-hidden rounded-xl border border-leaf-100 bg-white py-1 shadow-xl">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={onNavigate}
              className="flex items-center gap-2 px-3 py-2 text-sm text-ink-800 hover:bg-leaf-50"
            >
              <Icon name={it.icon} size={16} className="text-leaf-700" />
              <span>{it.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 消息子菜单(用户下拉中的一级项,hover 右侧弹出消息分类下拉)
 * - 复用 NotificationDropdown 的核心逻辑
 * - 不再走头部独立按钮,而是嵌入头像菜单
 */
function MessagesSubmenu({
  unreadTotal,
  onClose,
  onReadAll,
}: {
  unreadTotal: number;
  onClose: () => void;
  onReadAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const onEnter = () => {
    if (timer) clearTimeout(timer);
    setOpen(true);
  };
  const onLeave = () => {
    const tt = setTimeout(() => setOpen(false), 150);
    setTimer(tt);
  };

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <Link
        href="/notifications"
        onClick={onClose}
        className="flex items-center gap-2 px-3 py-2 text-sm text-ink-800 hover:bg-leaf-50"
      >
        <Icon name="bell" size={14} />
        <span className="flex-1">消息</span>
        {unreadTotal > 0 && (
          <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadTotal > 99 ? '99+' : unreadTotal}
          </span>
        )}
        <span className="text-leaf-500">▸</span>
      </Link>
      {open && (
        <div className="absolute right-full top-0 z-30 mr-1">
          <NotificationDropdownInline
            onClose={() => {
              setOpen(false);
              onClose();
            }}
            onReadAll={onReadAll}
          />
        </div>
      )}
    </div>
  );
}

/** 内联版下拉:不带触发按钮,直接渲染面板内容 */
function NotificationDropdownInline({
  onClose,
  onReadAll,
}: {
  onClose: () => void;
  onReadAll: () => void;
}) {
  const [tab, setTab] = useState<
    'all' | 'comment' | 'like' | 'mention' | 'follow' | 'system' | 'message'
  >('all');
  const [items, setItems] = useState<Notification[]>([]);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api
        .get<{ items: Notification[]; unread: number }>('/api/notifications?limit=20')
        .catch(() => ({ items: [], unread: 0 })),
      api.get<Conversation[]>('/api/conversations').catch(() => [] as Conversation[]),
    ])
      .then(([n, c]) => {
        setItems(Array.isArray(n.items) ? n.items : []);
        setConvs(Array.isArray(c) ? c.slice(0, 10) : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const TABS = [
    { key: 'all', label: '全部' },
    { key: 'comment', label: '评论' },
    { key: 'like', label: '点赞' },
    { key: 'mention', label: '@我' },
    { key: 'follow', label: '关注' },
    { key: 'system', label: '系统' },
    { key: 'message', label: '私信' },
  ] as const;

  const filtered =
    tab === 'all' ? items : tab === 'message' ? [] : items.filter((n) => n.type === tab);
  const showConvs = tab === 'all' || tab === 'message';

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/read', { all: true });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      onReadAll();
    } catch {}
  };

  return (
    <div className="w-[280px] overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-leaf-100 px-3 py-2">
        <span className="text-sm font-semibold text-ink-800">消息</span>
        <button
          type="button"
          onClick={markAllRead}
          className="text-[11px] text-leaf-700 hover:underline"
        >
          全部已读
        </button>
      </div>

      <div className="flex gap-0.5 overflow-x-auto border-b border-leaf-50 px-1.5 py-1.5">
        {TABS.map((tt) => (
          <button
            key={tt.key}
            type="button"
            onClick={() => setTab(tt.key)}
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[11px] transition-colors',
              tab === tt.key
                ? 'bg-leaf-500 text-white'
                : 'text-leaf-700 hover:bg-leaf-50'
            )}
          >
            {tt.label}
          </button>
        ))}
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-xs text-leaf-700/70">加载中…</div>
        ) : (
          <>
            {showConvs &&
              convs.map((c) => (
                <Link
                  key={c.id}
                  href={`/messages?to=${c.user.id}`}
                  onClick={onClose}
                  className="flex items-start gap-2 border-b border-leaf-50 px-3 py-2 hover:bg-leaf-50/60"
                >
                  <UserAvatar src={c.user.avatar} alt={c.user.name} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs font-medium text-ink-800">
                        💬 {c.user.name}
                      </span>
                      <span className="ml-2 shrink-0 text-[10px] text-leaf-700/60">
                        {timeShort(c.lastAt)}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-[11px] text-leaf-700/80">
                      {c.lastMessage}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                  )}
                </Link>
              ))}

            {tab !== 'message' &&
              filtered.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? '#'}
                  onClick={onClose}
                  className={cn(
                    'flex items-start gap-2 border-b border-leaf-50 px-3 py-2 hover:bg-leaf-50/60',
                    !n.read && 'bg-leaf-50/30'
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf-50 text-base">
                    {iconForType(n.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[11px] leading-5 text-ink-800">
                      {n.text}
                    </p>
                    <span className="text-[10px] text-leaf-700/60">
                      {timeShort(n.createdAt)}
                    </span>
                  </div>
                  {!n.read && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                  )}
                </Link>
              ))}

            {filtered.length === 0 && (!showConvs || convs.length === 0) && (
              <div className="py-8 text-center text-xs text-leaf-700/60">
                没有相关消息
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex border-t border-leaf-100 text-[12px]">
        <Link
          href="/notifications"
          onClick={onClose}
          className="flex-1 py-2 text-center text-leaf-700 hover:bg-leaf-50"
        >
          全部通知
        </Link>
        <Link
          href="/messages"
          onClick={onClose}
          className="flex-1 border-l border-leaf-100 py-2 text-center text-leaf-700 hover:bg-leaf-50"
        >
          全部私信
        </Link>
      </div>
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
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

// ============================================================
// 板块下拉菜单
// ============================================================
function BoardsDropdown() {
  const [open, setOpen] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const active = pathname.startsWith('/board');

  const onEnter = () => {
    if (timer) clearTimeout(timer);
    setOpen(true);
  };

  const onLeave = () => {
    const t = setTimeout(() => setOpen(false), 150);
    setTimer(t);
  };

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
          active
            ? 'bg-leaf-100 font-medium text-leaf-700'
            : 'text-ink-800 hover:bg-leaf-50 hover:text-leaf-700'
        }`}
      >
        <span className="text-base">🌿</span>
        <span>板块</span>
        <span className="text-[10px] text-leaf-500">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 w-64 overflow-hidden rounded-xl border border-leaf-100 bg-white shadow-card">
          <div className="max-h-[60vh] overflow-y-auto p-2">
            <BoardsTreeMenu onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
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
      <form onSubmit={submit} className="relative flex items-center gap-1">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-leaf-400"
            size={16}
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
            className="input pl-9 pr-3"
            placeholder="搜索帖子、品种、用户、板块"
            aria-label="搜索"
            autoComplete="off"
          />
        </div>
        <button
          type="submit"
          className="btn-primary h-9 px-3 text-xs shrink-0"
          aria-label="搜索"
        >
          搜索
        </button>
      </form>

      {/* 下拉:输入空时显示历史+热词;有输入时显示「搜索 xxx」 */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-leaf-100 bg-white shadow-card">
          {q.trim().length > 0 ? (
            <button
              type="button"
              onClick={() => go(q)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink-800 hover:bg-leaf-50"
            >
              <Icon name="search" size={14} className="text-leaf-500" />
              <span>
                搜索 <b>「{q}」</b>
              </span>
            </button>
          ) : (
            <>
              {/* 搜索历史 */}
              {history.length > 0 && (
                <>
                  <div className="flex items-center justify-between border-b border-leaf-50 px-3 py-2 text-[11px]">
                    <span className="text-leaf-700/60">🕒 搜索历史</span>
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="text-leaf-700/70 hover:text-leaf-700"
                    >
                      清空
                    </button>
                  </div>
                  <div className="border-b border-leaf-50 px-3 py-2">
                    {history.map((h, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => go(h)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-ink-800 hover:bg-leaf-50"
                      >
                        <Icon name="search" size={12} className="text-leaf-400" />
                        <span className="flex-1 truncate">{h}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* 热门搜索 */}
              <div className="flex items-center justify-between border-b border-leaf-50 px-3 py-2 text-[11px]">
                <span className="text-leaf-700/60">🔥 热门搜索</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void fetchHot(true);
                  }}
                  disabled={hotRefreshing}
                  className="text-leaf-700/70 hover:text-leaf-700 disabled:opacity-50"
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
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] transition-colors ${
                      h.kind === 'species'
                        ? 'bg-leaf-50 text-leaf-700 hover:bg-leaf-100'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {h.kind === 'species' ? h.q : `#${h.q}`}
                    {h.count !== undefined && h.count > 0 && (
                      <span className="ml-1 text-[10px] text-leaf-700/50">{h.count}</span>
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
