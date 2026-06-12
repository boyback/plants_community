'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { ColorThemeSwitcher } from '@/components/ui/ColorThemeSwitcher';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/HoverCard';
import { MobileTabBar } from '@/components/layout/MobileTabBar';
import { SwipeBack } from '@/components/ui/SwipeBack';
import { FestivalBanner } from '@/theme/FestivalBanner';
import { FestivalParticles } from '@/theme/FestivalParticles';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { api } from "@/lib/client-api";
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import type { Conversation, Notification, SkinItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import styles from './AppShell.module.scss';
import { cx } from '@/lib/style-utils';



type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

const primaryNav: NavItem[] = [
{ href: '/', label: '首页', icon: 'home' },
{ href: "/plant-archives", label: '植物档案', icon: 'plants' },
{ href: '/ranking', label: '排行榜', icon: 'trophy' },
{ href: '/plants/favorites', label: '收藏夹', icon: 'heart' },
{ href: '/user/me', label: '关注列表', icon: 'heart' }];


const spaceNav: NavItem[] = [
{ href: '/user/me', label: '我的帖子', icon: 'edit' },
{ href: '/user/me?tab=comments', label: '我的评论', icon: 'comment' },
{ href: '/orders', label: '我的订单', icon: 'package' },
{ href: '/user/me', label: '我的勋章', icon: 'diamond' },
{ href: '/settings', label: '设置', icon: 'settings' }];


const topNav = [
{ href: '/board', label: '板块' },
{ href: '/plants', label: '图鉴' },
{ href: '/market', label: '交易' },
{ href: "/ai-care", label: 'AI 养护' },
{ href: '/shaitu', label: '晒图广场' }
// { href: '/contests', label: '活动' },
];

export function AppShell({
  children,
  rightRail,
  aiRail,
  className,
  showFloatingAi = false,
  hideNavOnScrollDown = false








}: {children: React.ReactNode;rightRail?: React.ReactNode;aiRail?: React.ReactNode;className?: string;showFloatingAi?: boolean;showLeftRail?: boolean;hideNavOnScrollDown?: boolean;}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={cx(styles.r_793346c7, styles.r_dcb79003, styles.r_4ddaa618)}>
      <SwipeBack />
      <FestivalParticles />
      <FestivalBanner />
      <AppMobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className={styles.r_793346c7}>
        <div className={styles.r_7e0b7cdf}>
          <TopBar
            onOpenMobile={() => setMobileOpen(true)}
            hideOnScrollDown={hideNavOnScrollDown} />

          <div
            className={cn(cx(styles.r_0e12dc7d, styles.r_f3c543ad, styles.r_6da6a3c3, styles.r_f38d6f75, styles.r_b39e60c3, styles.r_f0faeb26, styles.r_e10354c6, styles.r_2499ab8d),

            rightRail && aiRail ? cx(styles.r_7c927cc9, styles.r_27fe57b6) :

            rightRail || aiRail ? styles.r_8fe321a7 :

            '',
            className
            )}>

            <main className={styles.r_7e0b7cdf}>{children}</main>
            {rightRail &&
            <aside className={cx(styles.r_99d72c7f, styles.r_7e0b7cdf, styles.r_b43b4c08, styles.r_f271783c, styles.r_4391c352, styles.r_c830740d, styles.r_f93aca47, styles.r_90b8aaf3)}>
                {rightRail}
              </aside>
            }
            {aiRail &&
            <aside
              className={cn(cx(styles.r_99d72c7f, styles.r_7e0b7cdf, styles.r_b43b4c08, styles.r_f271783c, styles.r_4391c352, styles.r_f93aca47, styles.r_90b8aaf3),

              rightRail ? styles.r_c9bea4b4 : styles.r_c830740d
              )}>

                {aiRail}
              </aside>
            }
          </div>
        </div>
      </div>

      {showFloatingAi && !rightRail && !aiRail && <FloatingAiToolbox />}
      <div className={cx(styles.r_acaee621, styles.r_e477a6af)} aria-hidden />
      <MobileTabBar />
    </div>);

}

function AppMobileNav({ open, onClose }: {open: boolean;onClose: () => void;}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  useBodyScrollLock(open);

  return (
    <>
      <div
        className={cn(cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_4802bd5b, styles.r_02dfb416, styles.r_67d6184a, styles.r_a327049c),

        open ? styles.r_3972e98d : cx(styles.r_a4326536, styles.r_7065497e)
        )}
        onClick={onClose} />

      <aside
        className={cn(cx(styles.r_7bc55599, styles.r_5f89f14a, styles.r_c78facc7, styles.r_181b2866, styles.r_60fbb771, styles.r_92e13d14, styles.r_747731c4, styles.r_8dddea07, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_a739868a, styles.r_eadef238, styles.r_a327049c),

        open ? styles.r_850292e4 : styles.r_1da5fad4
        )}>

        <div className={cx(styles.r_fb88ccaa, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <Link href="/" onClick={onClose} className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
            <span className={cx(styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_67d66567, styles.r_a217b4ea, styles.r_6bceb016, styles.r_72a4c7cd)}>
              <Icon name="plants" size={20} />
            </span>
            <span>
              <span className={cx(styles.r_0214b4b3, styles.r_42536e69, styles.r_69450ef1, styles.r_4ddaa618)}>PlantNet</span>
              <span className={cx(styles.r_0214b4b3, styles.r_d058ca6d, styles.r_69335b95)}>多肉植物百科社区</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className={cx(styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_67d66567, styles.r_a217b4ea, styles.r_02eb621e, styles.r_5756b7b4)}
            aria-label="关闭菜单">

            <Icon name="close" size={18} />
          </button>
        </div>

        {user &&
        <Link href={`/user/${user.id}`} onClick={onClose} className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_68f2db62, styles.r_7ebecbb6, styles.r_eb6e8b88)}>
              <UserAvatar src={user.avatar} alt={user.name} size={42} />
            <span className={styles.r_7e0b7cdf}>
              <span className={cx(styles.r_0214b4b3, styles.r_f283ea9b, styles.r_fc7473ca, styles.r_e83a7042, styles.r_4ddaa618)}>{user.name}</span>
              <span className={cx(styles.r_0214b4b3, styles.r_359090c2, styles.r_69335b95)}>Lv.{user.level} 重生玩家</span>
            </span>
          </Link>
        }

        <nav className={cx(styles.r_da7c36cd, styles.r_92bf82f4)}>
          {[...primaryNav, ...spaceNav].map((item) =>
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            onClick={onClose}
            className={cx(styles.r_60fbb771, styles.r_f82f0c25, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_a217b4ea, styles.r_0e17f2bd, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_5756b7b4, styles.r_81be6435)}>

              <Icon name={item.icon} size={17} className={styles.r_7b89cd85} />
              {item.label}
            </Link>
          )}
        </nav>

        {user ?
        <div className={cx(styles.r_9953408a, styles.r_b950dda2, styles.r_88b684d2, styles.r_173fa8f0)}>
            <button
            type="button"
            onClick={async () => {
              await logout();
              onClose();
              router.push('/');
              router.refresh();
            }}
            className={cx(styles.r_60fbb771, styles.r_f82f0c25, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_86843cf1, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_3d496065, styles.r_5e10cdb8, styles.r_fc7473ca, styles.r_e83a7042, styles.r_595fceba, styles.r_56bf8ae8, styles.r_85cfcc24)}>

              <Icon name="logout" size={16} />
              退出登录
            </button>
          </div> :

        <div className={cx(styles.r_9953408a, styles.r_f3c543ad, styles.r_8e75e3db, styles.r_77a2a20e, styles.r_b950dda2, styles.r_88b684d2, styles.r_173fa8f0)}>
            <Link href="/login" onClick={onClose} className={cx(styles.r_a217b4ea, styles.r_7ebecbb6, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_e83a7042, styles.r_e7eab4cb)}>
              登录
            </Link>
            <Link href="/register" onClick={onClose} className={cx(styles.r_a217b4ea, styles.r_6bceb016, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_e83a7042, styles.r_72a4c7cd)}>
              注册
            </Link>
          </div>
        }
      </aside>
    </>);

}

function TopBar({
  onOpenMobile,
  hideOnScrollDown = false



}: {onOpenMobile: () => void;hideOnScrollDown?: boolean;}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, vip, equip } = useAuth();
  const { subscribe } = useRealtime();
  const [q, setQ] = useState('');
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const showWhenScrollLocked = () => {
      if (document.documentElement.dataset.scrollLocked !== 'true') return;
      setHidden(false);
      document.documentElement.style.setProperty(
        '--app-board-filter-top',
        `${window.innerWidth >= 1024 ? 112 : 64}px`
      );
    };

    showWhenScrollLocked();
    window.addEventListener('body-scroll-lock-change', showWhenScrollLocked);
    return () => window.removeEventListener('body-scroll-lock-change', showWhenScrollLocked);
  }, []);

  useEffect(() => {
    if (!hideOnScrollDown) {
      setHidden(false);
      document.documentElement.style.removeProperty('--app-board-filter-top');
      return;
    }

    let lastY = window.scrollY;
    let ticking = false;

    const expandedTop = () => window.innerWidth >= 1024 ? 112 : 64;
    const applyStickyTop = (isHidden: boolean) => {
      document.documentElement.style.setProperty(
        '--app-board-filter-top',
        isHidden ? '0px' : `${expandedTop()}px`
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
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener("resize", onResize);
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
        api.get<{items: Notification[];unread: number;}>('/api/notifications').catch(() => ({ items: [], unread: 0 }))]
        );
        if (cancelled) return;
        setUnreadMsgs(convs.reduce((sum, item) => sum + item.unread, 0));
        setUnreadNotifs(notifs.unread ?? 0);
      } catch {










        // ignore count refresh failures
      }};void fetchCounts();const timer = setInterval(fetchCounts, 60_000);return () => {cancelled = true;clearInterval(timer);};}, [user]);useEffect(() => {
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
      className={cn(cx(styles.appHeader, styles.r_3e0fd166, styles.r_2167406b, styles.r_0f2fff0a, styles.r_65fdbade, styles.r_23d3773a, styles.r_6c21de57, styles.r_44a26d40, styles.r_344e3719, styles.r_eadef238, styles.r_625a4c3f, styles.r_d905a812),

      hideOnScrollDown && hidden && styles.r_9978b778
      )}>

      <div className={cx(styles.r_0e12dc7d, styles.r_60fbb771, styles.r_acaee621, styles.r_6da6a3c3, styles.r_cfea6243, styles.r_3960ffc2, styles.r_0c3bc985, styles.r_f0faeb26, styles.r_2499ab8d)}>
        <button
          type="button"
          onClick={onOpenMobile}
          className={cx(styles.r_f3c543ad, styles.r_426b8b75, styles.r_d854e569, styles.r_67d66567, styles.r_a217b4ea, styles.r_eb6abb1f, styles.r_5756b7b4, styles.r_a327049c)}
          aria-label="打开菜单">

          <Icon name="menu" size={18} />
        </button>

        <Link href="/" className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_3960ffc2, styles.r_1004c0c3)}>
          <span className={cx(styles.r_f3c543ad, styles.r_426b8b75, styles.r_d854e569, styles.r_012fbd12, styles.r_67d66567, styles.r_a217b4ea, styles.r_6bceb016, styles.r_72a4c7cd, styles.r_438b2237)}>
            <Icon name="plants" size={22} />
          </span>
          <span className={cx(styles.r_99d72c7f, styles.r_7e0b7cdf, styles.r_676c91de)}>
            <span className={cx(styles.r_0214b4b3, styles.r_d5c9b000, styles.r_69450ef1, styles.r_e9fadafb, styles.r_4ddaa618)}>PlantNet</span>
            <span className={cx(styles.r_0214b4b3, styles.r_f283ea9b, styles.r_359090c2, styles.r_69335b95)}>多肉植物百科社区</span>
          </span>
        </Link>

        <div className={cx(styles.r_99d72c7f, styles.r_36e579c0, styles.r_3960ffc2, styles.r_86843cf1, styles.r_ec0c1358, styles.r_d0f1400f)}>
          <form onSubmit={submit} className={cx(styles.r_d89972fe, styles.r_06950372, styles.r_012fbd12)}>
            <Icon name="search" size={16} className={cx(styles.r_da4dbfbc, styles.r_b2e7cc55, styles.r_d694ba66, styles.r_36b381be, styles.r_66a36c90)} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className={cx(styles.r_426b8b75, styles.r_6da6a3c3, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_838fc455, styles.r_ab82c25c, styles.r_fc7473ca, styles.r_df37b1fd, styles.r_56bf8ae8, styles.r_df4824ca, styles.r_5c6a615b, styles.r_3bc80e52)}
              placeholder="搜索植物、品种、用户、内容..." />

            <span className={cx(styles.r_da4dbfbc, styles.r_5a438c30, styles.r_d694ba66, styles.r_36b381be, styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_66a36c90)}>
              ⌘K
            </span>
          </form>

          <nav className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1500488a)}>
            {topNav.map((item) => {
              const active = item.href === '/board' ? isCommunityActive(pathname) : isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(cx(styles.r_d89972fe, styles.r_c9b99cd9, styles.r_fc7473ca, styles.r_e83a7042, styles.r_ceb69a6b),

                  active ? styles.r_e7eab4cb : cx(styles.r_399e11a5, styles.r_9825203a)
                  )}>

                  {item.label}
                  {active && <span className={cx(styles.r_da4dbfbc, styles.r_189f036c, styles.r_c78facc7, styles.r_d8cdcad2, styles.r_0e12dc7d, styles.r_10db0d55, styles.r_cbbf90f9, styles.r_ac204c10, styles.r_6bceb016)} />}
                </Link>);

            })}
          </nav>
        </div>

        <div className={cx(styles.r_fb56d9cf, styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e)}>
          <ColorThemeSwitcher />
          <Link
            href="/editor"
            className={cx(styles.r_99d72c7f, styles.r_e7a768f9, styles.r_3960ffc2, styles.r_58284b4e, styles.r_5f22e64f, styles.r_6bceb016, styles.r_e0d9cc7f, styles.r_359090c2, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_438b2237, styles.r_56bf8ae8, styles.r_e269e58c, styles.r_e3fd07f9)}>

            <Icon name="plus" size={14} />
            发帖
          </Link>
          <Link
            href="/market/sell"
            className={cx(styles.r_99d72c7f, styles.r_e7a768f9, styles.r_3960ffc2, styles.r_58284b4e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_e0d9cc7f, styles.r_359090c2, styles.r_e83a7042, styles.r_5f6a59f1, styles.r_438b2237, styles.r_56bf8ae8, styles.r_a5c39c39, styles.r_5756b7b4, styles.r_e3fd07f9)}>

            <Icon name="shop" size={14} />
            出售
          </Link>
          {user ?
          <AccountMenu
            user={user}
            pendant={equip.pendant ?? null}
            isVip={vip.isVip} /> :


          <Link href="/login" className={cx(styles.r_a217b4ea, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_e83a7042, styles.r_e7eab4cb, styles.r_5756b7b4)}>
              登录
            </Link>
          }
        </div>
      </div>
      <div className={cx(styles.r_99d72c7f, styles.r_b950dda2, styles.r_5ff6a729, styles.r_d0ce7c24)}>
        <div className={cx(styles.r_0e12dc7d, styles.r_60fbb771, styles.r_6da6a3c3, styles.r_c29323cc, styles.r_3960ffc2, styles.r_f0faeb26, styles.r_660d2eff, styles.r_2499ab8d)}>
          <nav className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_1384f66f, styles.r_b70fd23f)}>
            {primaryNav.map((item) => {
              const active = item.href === '/board' ? isCommunityActive(pathname) : isActive(pathname, item.href);
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={cn(cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_60fbb771, styles.r_426b8b75, styles.r_012fbd12, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_e0d9cc7f, styles.r_fc7473ca, styles.r_e83a7042, styles.r_ceb69a6b),

                  active ? cx(styles.r_7ebecbb6, styles.r_e7eab4cb) : cx(styles.r_eb6abb1f, styles.r_5756b7b4, styles.r_81be6435)
                  )}>

                  <Icon name={item.icon} size={16} className={active ? styles.r_5f6a59f1 : cx(styles.r_7b89cd85, styles.r_0eb80431)} />
                  <span>{item.label}</span>
                  {active && <span className={cx(styles.r_da4dbfbc, styles.r_b6027879, styles.r_189f036c, styles.r_10db0d55, styles.r_ac204c10, styles.r_6bceb016)} />}
                </Link>);

            })}
          </nav>
          <div className={cx(styles.r_f242aff2, styles.r_60fbb771, styles.r_012fbd12, styles.r_3960ffc2, styles.r_58284b4e)}>
            {user ?
            <NotificationBell
              unreadCount={unreadNotifs + unreadMsgs}
              onReadAll={() => setUnreadNotifs(0)} /> :


            <NavActionIcon href="/login" icon="bell" label="通知" />
            }
            <NavActionIcon href={user ? '/messages' : '/login'} icon="mail" label="私信" />
            <NavActionIcon href={user ? `/user/${user.id}` : '/login'} icon="user" label="个人主页" />
          </div>
        </div>
      </div>
    </header>);

}

function NotificationBell({
  unreadCount,
  onReadAll



}: {unreadCount: number;onReadAll: () => void;}) {
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
      api.get<{items: Notification[];unread: number;}>('/api/notifications?limit=20').catch(() => ({ items: [], unread: 0 })),
      api.get<Conversation[]>('/api/conversations').catch(() => [] as Conversation[])]
      );
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
    <div ref={containerRef} className={styles.r_d89972fe} onMouseEnter={openPanel} onMouseLeave={closePanelLater}>
      <button
        type="button"
        onClick={toggle}
        className={cx(styles.r_d89972fe, styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_67d66567, styles.r_5f22e64f, styles.r_eb6abb1f, styles.r_56bf8ae8, styles.r_5756b7b4, styles.r_81be6435)}
        aria-label="消息通知"
        aria-haspopup="menu"
        aria-expanded={open}>

        <Icon name="bell" size={17} />
        {unreadCount > 0 &&
        <span className={cx(styles.r_da4dbfbc, styles.r_26de51ee, styles.r_1af92b74, styles.r_f3c543ad, styles.r_11e59c6d, styles.r_69aaf726, styles.r_67d66567, styles.r_ac204c10, styles.r_45a732a4, styles.r_d8e0e382, styles.r_e0988086, styles.r_69450ef1, styles.r_c2385a46, styles.r_72a4c7cd)}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        }
      </button>

      {open &&
      <div className={cx(styles.r_da4dbfbc, styles.r_d8cdcad2, styles.r_5e8a03e0, styles.r_181b2866, styles.r_50d0d216, styles.r_06950372, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_23d3773a, styles.r_5e10cdb8, styles.r_06bbb431, styles.r_40137e89, styles.r_a691d502, styles.r_806f9340, styles.r_625a4c3f)}>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_65fdbade, styles.r_34de1d8f, styles.r_f0faeb26, styles.r_e7ee55ac)}>
            <span className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>消息通知</span>
            <Link
            href="/settings/notifications"
            onClick={() => setOpen(false)}
            className={cx(styles.r_359090c2, styles.r_5f6a59f1, styles.r_ceb69a6b, styles.r_81be6435)}>

              设置
            </Link>
          </div>

          <div className={cx(styles.r_d725a161, styles.r_92bf82f4)}>
            {loading ?
          <div className={cx(styles.r_a1f611f0, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_69335b95)}>加载中...</div> :

          <>
                {convs.map((conversation) =>
            <Link
              key={conversation.id}
              href={`/messages?to=${conversation.user.id}`}
              onClick={() => setOpen(false)}
              className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_7e9a2a25, styles.r_65fdbade, styles.r_5ff6a729, styles.r_0e17f2bd, styles.r_e7ee55ac, styles.r_ceb69a6b, styles.r_80751c7f)}>

                    <UserAvatar src={conversation.user.avatar} alt={conversation.user.name} size={32} />
                    <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_2cd02d11)}>
                      <div className={cx(styles.r_166af870, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
                        <span className={cx(styles.r_f283ea9b, styles.r_359090c2, styles.r_2689f395, styles.r_399e11a5)}>私信 · {conversation.user.name}</span>
                        {conversation.unread > 0 && <span className={cx(styles.r_c68af998, styles.r_2f2a842e, styles.r_940924b6, styles.r_012fbd12, styles.r_ac204c10, styles.r_45a732a4)} />}
                      </div>
                      <p className={cx(styles.r_f283ea9b, styles.r_d058ca6d, styles.r_21d33c50)}>{conversation.lastMessage}</p>
                      <span className={cx(styles.r_1dc571a3, styles.r_6c4cc49e)}>{timeShort(conversation.lastAt)}</span>
                    </div>
                  </Link>
            )}

                {items.map((notification) =>
            <Link
              key={notification.id}
              href={notification.link ?? '#'}
              onClick={() => setOpen(false)}
              className={cn(cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_7e9a2a25, styles.r_65fdbade, styles.r_5ff6a729, styles.r_0e17f2bd, styles.r_e7ee55ac, styles.r_ceb69a6b, styles.r_80751c7f),

              !notification.read && styles.r_efb55408
              )}>

                    {notification.fromUser ?
              <img
                src={notification.fromUser.avatar || "/default-avatar.svg"}
                alt={notification.fromUser.name}
                className={cx(styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_012fbd12, styles.r_ac204c10, styles.r_7d85d0c2)} /> :


              <span className={cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_012fbd12, styles.r_67d66567, styles.r_ac204c10, styles.r_f2b23104, styles.r_fc7473ca)}>
                        {iconForType(notification.type)}
                      </span>
              }
                    <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_2cd02d11)}>
                      <div className={cx(styles.r_166af870, styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e)}>
                        {notification.fromUser &&
                  <span className={cx(styles.r_f283ea9b, styles.r_359090c2, styles.r_2689f395, styles.r_399e11a5)}>{notification.fromUser.name}</span>
                  }
                        {!notification.read && <span className={cx(styles.r_2f2a842e, styles.r_940924b6, styles.r_012fbd12, styles.r_ac204c10, styles.r_45a732a4)} />}
                      </div>
                      <p className={cx(styles.r_054cb4e3, styles.r_d058ca6d, styles.r_64d9fa1b, styles.r_eb6abb1f)}>{notification.text}</p>
                      <span className={cx(styles.r_1dc571a3, styles.r_6c4cc49e)}>{timeShort(notification.createdAt)}</span>
                    </div>
                  </Link>
            )}

                {items.length === 0 && convs.length === 0 &&
            <div className={cx(styles.r_a1f611f0, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>暂无消息</div>
            }
              </>
          }
          </div>
        </div>
      }
    </div>);

}

function AccountMenu({
  user,
  pendant,
  isVip




}: {user: NonNullable<ReturnType<typeof useAuth>['user']>;pendant: SkinItem | null;isVip: boolean;}) {
  const router = useRouter();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <div className={styles.r_f58b0257}>
      <HoverCard>
        <HoverCardTrigger>
          <button
            type="button"
            className={cx(styles.r_60fbb771, styles.r_f82f0c25, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_ac204c10, styles.r_45d82811, styles.r_fafb9e0b, styles.r_2eba0d65, styles.r_56bf8ae8, styles.r_5756b7b4, styles.r_55d048eb, styles.r_5c6a615b, styles.r_37eb6d91)}
            aria-label="打开用户菜单">

            <UserAvatar src={user.avatar} alt={user.name} size={40} pendant={pendant} isVip={isVip} />
            <span className={cx(styles.r_99d72c7f, styles.r_7e0b7cdf, styles.r_c830740d)}>
              <span className={cx(styles.r_0214b4b3, styles.r_d3f6ecda, styles.r_f283ea9b, styles.r_fc7473ca, styles.r_e83a7042, styles.r_4ddaa618)}>{user.name}</span>
              <span className={cx(styles.r_0214b4b3, styles.r_359090c2, styles.r_69335b95)}>Lv.{user.level} 重生玩家</span>
            </span>
          </button>
        </HoverCardTrigger>

        <HoverCardContent
          className={cx(styles.r_6ca62528, styles.r_2cd02d11)}
          role="menu">

          <Link
            href={`/user/${user.id}`}
            className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_65fdbade, styles.r_38748e06, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_56bf8ae8, styles.r_c514d9e0)}
            role="menuitem">

            <UserAvatar src={user.avatar} alt={user.name} size={38} pendant={pendant} isVip={isVip} />
            <span className={styles.r_7e0b7cdf}>
              <span className={cx(styles.r_0214b4b3, styles.r_f283ea9b, styles.r_fc7473ca, styles.r_e83a7042, styles.r_4ddaa618)}>{user.name}</span>
              <span className={cx(styles.r_0214b4b3, styles.r_359090c2, styles.r_69335b95)}>查看个人主页</span>
            </span>
          </Link>

          <div className={styles.r_ec0091ee}>
            <AccountMenuLink href="/settings/profile" icon="settings" label="账号设置" />
            <AccountMenuLink href="/orders" icon="package" label="我的订单" />
            <AccountMenuLink href="/points" icon="diamond" label="积分与会员" />
          </div>

          <div className={cx(styles.r_b950dda2, styles.r_38748e06, styles.r_cd009d7d)}>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className={cx(styles.r_60fbb771, styles.r_426b8b75, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_7e9a2a25, styles.r_5f22e64f, styles.r_0e17f2bd, styles.r_fc7473ca, styles.r_e83a7042, styles.r_595fceba, styles.r_56bf8ae8, styles.r_85cfcc24, styles.r_5f533b3a, styles.r_d463b664)}
              role="menuitem">

              <Icon name="logout" size={16} />
              {loggingOut ? '退出中...' : '退出登录'}
            </button>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>);

}

function AccountMenuLink({
  href,
  icon,
  label




}: {href: string;icon: IconName;label: string;}) {
  return (
    <Link
      href={href}
      className={cx(styles.r_60fbb771, styles.r_426b8b75, styles.r_3960ffc2, styles.r_7e9a2a25, styles.r_0e17f2bd, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_56bf8ae8, styles.r_5756b7b4, styles.r_81be6435)}
      role="menuitem">

      <Icon name={icon} size={16} className={styles.r_7b89cd85} />
      {label}
    </Link>);

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

function NavActionIcon({ href, icon, label, badge }: {href: string;icon: IconName;label: string;badge?: number;}) {
  return (
    <Link href={href} aria-label={label} className={cx(styles.r_d89972fe, styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_67d66567, styles.r_5f22e64f, styles.r_eb6abb1f, styles.r_56bf8ae8, styles.r_5756b7b4, styles.r_81be6435)}>
      <Icon name={icon} size={17} />
      {badge ?
      <span className={cx(styles.r_da4dbfbc, styles.r_26de51ee, styles.r_1af92b74, styles.r_f3c543ad, styles.r_11e59c6d, styles.r_69aaf726, styles.r_67d66567, styles.r_ac204c10, styles.r_45a732a4, styles.r_d8e0e382, styles.r_e0988086, styles.r_69450ef1, styles.r_c2385a46, styles.r_72a4c7cd)}>
          {badge > 99 ? '99+' : badge}
        </span> :
      null}
    </Link>);

}

export function FloatingAiToolbox() {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(styles.r_7bc55599, styles.r_feae0ce8, styles.r_9b7c19ad, styles.r_4802bd5b, styles.r_99d72c7f, styles.r_acaee621, styles.r_baceed34, styles.r_67d66567, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_a739868a, styles.r_3daca9af, styles.r_52c47100, styles.r_f5f3481f)}
        aria-label="打开 AI 助手">

        <span className={cx(styles.r_f3c543ad, styles.r_508ebf85, styles.r_e7e37107, styles.r_67d66567, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5c9b000)}>🤖</span>
      </button>);

  }

  return (
    <div className={cx(styles.r_7bc55599, styles.r_feae0ce8, styles.r_9b7c19ad, styles.r_4802bd5b, styles.r_99d72c7f, styles.r_57f3afcd, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_82f636e1, styles.r_c07e54fd, styles.r_c90460ef, styles.r_0b2e8c28, styles.r_d0ce7c24, styles.r_3b35a807)}>
      <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <div className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_6d623258)}>AI 助手</div>
        <button type="button" onClick={() => setOpen(false)} className={cx(styles.r_f3c543ad, styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_67d66567, styles.r_ac204c10, styles.r_7b89cd85, styles.r_5756b7b4)} aria-label="关闭">
          <Icon name="close" size={14} />
        </button>
      </div>
      <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_1004c0c3)}>
        <span className={cx(styles.r_f3c543ad, styles.r_f82f0c25, styles.r_edaba517, styles.r_012fbd12, styles.r_67d66567, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_3febee09)}>🤖</span>
        <div className={styles.r_7e0b7cdf}>
          <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_f2b23104, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_e83a7042, styles.r_e7eab4cb)}>
            <span className={cx(styles.r_095acb27, styles.r_c696a089, styles.r_ac204c10, styles.r_6bceb016)} />
            在线
          </span>
          <p className={cx(styles.r_50d0d216, styles.r_fc7473ca, styles.r_e83a7042, styles.r_4ddaa618)}>有什么植物问题都可以问我</p>
        </div>
      </div>
      <div className={cx(styles.r_0ab86672, styles.r_6f7e013d)}>
        {['叶片发软怎么办', '夏天如何浇水', '推荐新手多肉'].map((q) =>
        <Link key={q} href={`/search?q=${encodeURIComponent(q)}`} className={cx(styles.r_0214b4b3, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_c1ebae4b, styles.r_0e17f2bd, styles.r_e7ee55ac, styles.r_fc7473ca, styles.r_eb6abb1f, styles.r_5756b7b4)}>
            {q}
          </Link>
        )}
      </div>
    </div>);

}

function isCommunityActive(pathname: string) {
  return pathname.startsWith('/board') || pathname.startsWith('/editor') || pathname.startsWith('/post');
}

function isActive(pathname: string, href: string) {
  const path = href.split('?')[0];
  if (path === '/') return pathname === '/';
  return pathname === path || pathname.startsWith(`${path}/`);
}
