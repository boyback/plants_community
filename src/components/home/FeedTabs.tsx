'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cn, timeAgo, boardUrl } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { PostCard } from '@/components/post/PostCard';
import { PostCardSkeleton } from '@/components/post/PostCardSkeleton';
import { STAGE_META } from '@/lib/journal';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { usePullToRefresh, PullIndicator } from '@/lib/hooks/usePullToRefresh';
import { ConfirmDialog, PromptDialog } from '@/components/ui/Dialog';
import type { Post, PostType } from '@/lib/types';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const TAB_DEFS = [
  { key: 'recommend', labelKey: 'home.feedTabs.recommend' },
  { key: 'latest', labelKey: 'home.feedTabs.latest' },
  { key: 'hot', labelKey: 'home.feedTabs.hot' },
  { key: 'following', labelKey: 'home.feedTabs.following' },
] as const;

type TabKey = (typeof TAB_DEFS)[number]['key'];
type FollowingSubTab = 'posts' | 'users' | 'species';

interface FeedResponse {
  items: Post[];
  nextCursor: string | null;
}

interface FollowedUser {
  id: string;
  handle?: string;
  name: string;
  avatar: string | null;
  bio?: string;
  posts: number;
  followers: number;
  following: number;
}

interface FollowedSpecies {
  id: string;
  name: string;
  slug: string;
  cover: string | null;
  path?: { level: string; slug: string; name: string }[];
}

/** 4 个 tab 共用一个客户端组件,各自维护 items + cursor 状态 */
export function FeedTabs({ initial }: { initial: Post[] }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('recommend');
  const [followingSubTab, setFollowingSubTab] = useState<FollowingSubTab>('posts');

  // 每 tab 的状态分开存,切回去时不丢
  const stateRef = useRef<Record<TabKey, { items: Post[]; cursor: string | null; loaded: boolean; err: string | null }>>({
    recommend: { items: initial, cursor: null, loaded: true, err: null },
    latest: { items: [], cursor: null, loaded: false, err: null },
    hot: { items: [], cursor: null, loaded: false, err: null },
    following: { items: [], cursor: null, loaded: false, err: null },
  });
  const [, force] = useState(0);
  const rerender = () => force((x) => x + 1);

  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  const load = useCallback(async (t: TabKey, more: boolean) => {
    const s = stateRef.current[t];
    if (more && !s.cursor && s.loaded) return; // 没有更多
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const cursor = more ? s.cursor : null;
      const url = `/api/feed?tab=${t}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const r = await api.get<FeedResponse>(url);
      stateRef.current[t] = {
        items: more ? [...s.items, ...r.items] : r.items,
        cursor: r.nextCursor,
        loaded: true,
        err: null,
      };
    } catch (e) {
      stateRef.current[t] = {
        ...s,
        err: e instanceof ApiError ? e.message : 'load failed',
        loaded: true,
      };
    } finally {
      loadingRef.current = false;
      setLoading(false);
      rerender();
    }
  }, []);

  // tab 变化时如果还没拉过,自动拉
  useEffect(() => {
    if (!stateRef.current[tab].loaded) {
      void load(tab, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // 用户切换(登录/登出)时重置 following + recommend 的缓存
  useEffect(() => {
    stateRef.current.recommend.loaded = false;
    stateRef.current.following.loaded = false;
    if (tab === 'recommend' || tab === 'following') void load(tab, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const cur = stateRef.current[tab];

  // 下拉刷新当前 tab
  const { bind, status, progress } = usePullToRefresh(async () => {
    stateRef.current[tab].loaded = false;
    await load(tab, false);
  });

  // 哨兵:接近视口时自动拉下一页
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cur.cursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) void load(tab, true);
        }
      },
      { rootMargin: '0px 0px 600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur.cursor, tab]);

  // m 端列数偏好:1 或 2,默认 2(localStorage 持久化)
  const [mobileCols, setMobileCols] = useState<1 | 2>(2);
  // PC 端列数偏好:3 或 4,默认 3(localStorage 持久化)
  const [desktopCols, setDesktopCols] = useState<3 | 4>(3);
  // 布局模式:grid(瀑布流) 或 list(列表),默认列表
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('list');
  const [initialized, setInitialized] = useState(false);
  // 回到顶部按钮
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [backToTopVisible, setBackToTopVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedM = Number(localStorage.getItem('rouyou.feed.mobileCols'));
    if (savedM === 1 || savedM === 2) setMobileCols(savedM as 1 | 2);
    const savedD = Number(localStorage.getItem('rouyou.feed.desktopCols'));
    if (savedD === 3 || savedD === 4) setDesktopCols(savedD as 3 | 4);
    const savedLayout = localStorage.getItem('rouyou.feed.layout');
    if (savedLayout === 'grid' || savedLayout === 'list') setLayoutMode(savedLayout);
    setInitialized(true);
  }, []);

  // 滚动监听：超过一屏显示回到顶部
  useEffect(() => {
    const onScroll = () => {
      const shouldShow = window.scrollY > window.innerHeight;
      if (shouldShow !== showBackToTop) {
        setShowBackToTop(shouldShow);
        // 延迟一帧让 CSS transition 生效
        requestAnimationFrame(() => setBackToTopVisible(shouldShow));
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [showBackToTop]);

  const scrollToTop = () => {
    setBackToTopVisible(false);
    // 重力加速度：先慢后快
    const start = window.scrollY;
    const startTime = performance.now();
    const duration = Math.min(800, start / 3); // 越高越快
    const ease = (t: number) => 1 - (1 - t) * (1 - t); // easeOutQuad
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, start * (1 - ease(progress)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const updateMobileCols = (n: 1 | 2) => {
    setMobileCols(n);
    try {
      localStorage.setItem('rouyou.feed.mobileCols', String(n));
    } catch {}
  };
  const updateDesktopCols = (n: 3 | 4) => {
    setDesktopCols(n);
    try {
      localStorage.setItem('rouyou.feed.desktopCols', String(n));
    } catch {}
  };
  const updateLayoutMode = (mode: 'grid' | 'list') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('rouyou.feed.layout', mode);
    } catch {}
  };

  // m 端 column class:1 或 2;md+ 按用户偏好 3 或 4
  const mobileColClass = mobileCols === 1 ? 'columns-1' : 'columns-2';
  const desktopColClass = desktopCols === 4 ? 'md:columns-4' : 'md:columns-3';

  // 还没从 localStorage 读取完，不渲染内容避免闪烁
  if (!initialized) {
    return <div className="h-96" />;
  }

  return (
    <div {...bind}>
      <PullIndicator status={status} progress={progress} />
      <TabHeader
        tab={tab}
        setTab={setTab}
        mobileCols={mobileCols}
        onMobileColsChange={updateMobileCols}
        desktopCols={desktopCols}
        onDesktopColsChange={updateDesktopCols}
        layoutMode={layoutMode}
        onLayoutModeChange={updateLayoutMode}
      />

      {/* 关注 tab 的子 tab */}
      {tab === 'following' && user && (
        <div className="mt-3 flex items-center gap-2 border-b border-leaf-100/60">
          {(['posts', 'users', 'species'] as const).map((subTab) => (
            <button
              key={subTab}
              onClick={() => setFollowingSubTab(subTab)}
              className={cn(
                'relative px-3 py-2 text-xs font-medium transition-colors',
                followingSubTab === subTab ? 'text-leaf-700' : 'text-ink-700/60 hover:text-leaf-700'
              )}
            >
              {subTab === 'posts' ? '动态' : subTab === 'users' ? '关注的人' : '关注的品种'}
              {followingSubTab === subTab && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-leaf-500" />
              )}
            </button>
          ))}
        </div>
      )}

      {tab === 'following' && !user ? (
        <div className="mt-6 rounded-xl border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
          登录后查看你关注的肉友的最新动态
        </div>
      ) : tab === 'following' && followingSubTab === 'users' ? (
        <FollowedUsersList />
      ) : tab === 'following' && followingSubTab === 'species' ? (
        <FollowedSpeciesList />
      ) : cur.err ? (
        <div className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {cur.err}
        </div>
      ) : !cur.loaded ? (
        layoutMode === 'list' ? (
          <ListFeedSkeleton />
        ) : (
          <FeedSkeleton mobileCols={mobileCols} desktopCols={desktopCols} />
        )
      ) : cur.items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
          暂时没有内容
        </div>
      ) : (
        <>
          {layoutMode === 'list' ? (
            /* 列表模式：所有卡片在一个大卡片中，用线隔开 */
            <div className="mt-4 rounded-xl border border-leaf-100 bg-white">
              {cur.items.map((p, i) => (
                <div key={p.id}>
                  <FeedListCard post={p} source={tabToSource(tab)} />
                  {i < cur.items.length - 1 && (
                    <div className="mx-4 border-t border-leaf-100" />
                  )}
                </div>
              ))}
              {loading &&
                cur.items.length > 0 &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={`sk-${i}`}>
                    <div className="h-32 animate-pulse bg-leaf-50" />
                    <div className="mx-4 border-t border-leaf-100" />
                  </div>
                ))}
            </div>
          ) : (
            /* 瀑布流模式 */
            <>
              {/* CSS columns 瀑布流:m 端按用户偏好 1/2,sm=2,md+ 按用户偏好 3/4 */}
              {/* data-cols 用于 CSS 在 4 列时缩小卡片字号 */}
              <div
                data-cols={desktopCols}
                className={`feed-grid mt-4 ${mobileColClass} gap-3 sm:columns-2 ${desktopColClass} [column-fill:_balance]`}
              >
                {cur.items.map((p) => (
                  <div key={p.id} className="mb-3 break-inside-avoid">
                    <FeedCard post={p} source={tabToSource(tab)} />
                  </div>
                ))}
                {/* 加载下一页时插入骨架屏占位 */}
                {loading &&
                  cur.items.length > 0 &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={`sk-${i}`} className="mb-3 break-inside-avoid">
                      <PostCardSkeleton variant={i} />
                    </div>
                  ))}
              </div>
            </>
          )}
          {/* 哨兵 */}
          {cur.cursor && (
            <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
          )}
          {!cur.cursor && cur.items.length > 0 && (
            <div className="py-6 text-center text-xs text-leaf-700/60">
              — 没有更多了 —
            </div>
          )}
        </>
      )}

      {/* 回到顶部按钮 — 多肉风格 */}
      {showBackToTop && (
        <div
          className="fixed right-6 z-40 flex flex-col items-center"
          style={{ bottom: backToTopVisible ? '24px' : '-80px', transition: `bottom ${backToTopVisible ? '0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : '0.3s ease-in'}` }}
        >
          {/* 连接线 */}
          <div
            className="w-0.5 bg-gradient-to-b from-leaf-300 to-leaf-500 rounded-full"
            style={{
              height: backToTopVisible ? '40px' : '0px',
              transition: `height ${backToTopVisible ? '0.3s ease-out 0.2s' : '0.15s ease-in'}`,
            }}
          />
          {/* 多肉按钮 */}
          <button
            type="button"
            onClick={scrollToTop}
            title="回到顶部"
            className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-leaf-400 to-leaf-600 text-white shadow-lg shadow-leaf-500/30 hover:shadow-xl hover:shadow-leaf-500/40 hover:scale-110 active:scale-95 transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
              <path d="M8 8c-1-1-2.5-0.5-3 0.5" opacity="0.5" />
              <path d="M16 8c1-1 2.5-0.5 3 0.5" opacity="0.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/** 包一层 PostCard,进入视口时上报 PV */
function FeedCard({
  post,
  source,
}: {
  post: Post;
  source: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sentRef = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || sentRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (sentRef.current) return;
        for (const e of entries) {
          if (e.isIntersecting) {
            sentRef.current = true;
            // fire-and-forget
            void api.post(`/api/posts/${post.id}/view`, { source }).catch(() => null);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [post.id, source]);
  return (
    <div ref={ref}>
      <PostCard post={post} />
    </div>
  );
}

/** 嵌套 Link — stopPropagation 让点击不触发父级卡片跳转 */
function NestedLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className={className}
    >
      {children}
    </Link>
  );
}

/** 投票预览(只读):展示问题 + top 3 选项进度条 */
function VotePreview({ post }: { post: Post }) {
  if (!post.vote) return null;
  const total = post.vote.options.reduce((s, o) => s + o.votes, 0);
  const top = [...post.vote.options].sort((a, b) => b.votes - a.votes).slice(0, 3);
  return (
    <div className="space-y-1.5 rounded-lg bg-amber-50/60 p-2.5 text-amber-900 mb-2">
      <div className="line-clamp-1 text-sm font-medium">🗳️ {post.vote.question}</div>
      {top.map((o) => {
        const pct = total ? Math.round((o.votes / total) * 100) : 0;
        return (
          <div
            key={o.id}
            className="relative overflow-hidden rounded bg-white/70 px-2 py-1 text-xs"
          >
            <div
              className="absolute inset-y-0 left-0 bg-amber-200/70"
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex justify-between">
              <span className="truncate">{o.label}</span>
              <span className="ml-2 tabular-nums">{pct}%</span>
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between text-xs text-amber-700/80">
        <span>{total} 人参与</span>
        <span>
          {new Date(post.vote.deadline).getTime() < Date.now() ? '已截止' : '进行中'}
        </span>
      </div>
    </div>
  );
}

/** 活动预览(只读):位置 + 时间 + 已报名人数 */
function EventPreview({ post }: { post: Post }) {
  if (!post.event) return null;
  return (
    <div className="rounded-lg bg-violet-50/80 p-2 text-[11px] text-violet-900 mb-2">
      <div className="flex items-center gap-1">
        <span>📍</span>
        <span className="truncate">{post.event.location}</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between">
        <span className="text-violet-800/80">
          🕘 {new Date(post.event.startAt).toLocaleDateString()}
        </span>
        <span className="text-violet-700">{post.event.attendees} 人已报名</span>
      </div>
    </div>
  );
}

/** 时间线预览(只读):显示前 3 条事件 */
function JournalPreview({ post }: { post: Post }) {
  if (!post.journal) return null;
  const j = post.journal;
  const shown = j.entries ?? [];

  return (
    <div className="rounded-lg bg-emerald-50/60 p-2.5 mb-2">
      <div className="mb-1.5 flex items-center justify-between text-xs text-emerald-700/80">
        <span className="truncate font-medium">📖 {j.subjectName}</span>
        <span>第 {j.daysSinceStart} 天 · 共 {j.entriesCount} 条</span>
      </div>

      <div className="relative">
        <ol className="space-y-2">
          {shown.slice(0, 3).map((e) => {
            const meta = STAGE_META[e.stage];
            return (
              <li key={e.id} className="flex items-start gap-2">
                <span className="mt-1 block h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-ink-800">
                      {new Date(e.entryDate).toLocaleDateString()}
                    </span>
                    <span className={cn('rounded px-1.5 py-0.5 text-[11px] border', meta.color)}>
                      {meta.emoji} {meta.zh}
                    </span>
                  </div>
                  {e.note && (
                    <p className="line-clamp-1 text-xs text-ink-600/80 mt-0.5">{e.note}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {j.entriesCount > 3 && (
          <div className="mt-1.5 text-xs text-emerald-700/60">
            + {j.entriesCount - 3} 条更多...
          </div>
        )}
      </div>
    </div>
  );
}

/** 列表模式卡片 — 一行一个，参考交易广场风格 */
function FeedListCard({
  post,
  source,
}: {
  post: Post;
  source: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const sentRef = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || sentRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (sentRef.current) return;
        for (const e of entries) {
          if (e.isIntersecting) {
            sentRef.current = true;
            void api.post(`/api/posts/${post.id}/view`, { source }).catch(() => null);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [post.id, source]);

  const cover = post.cover ?? post.images?.[0];
  const images = post.images || (post.cover ? [post.cover] : []);
  const displayImages = images.slice(0, 5);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/api/posts/${post.id}/like`);
    } catch {}
  };

  const handleAdminAction = async (action: string, extra?: Record<string, unknown>) => {
    try {
      const result = await api.post(`/api/posts/${post.id}/admin`, { action, ...extra });
      // 刷新页面或更新状态
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败');
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/api/users/${post.author.id}/follow`);
    } catch {}
  };

  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBanPrompt, setShowBanPrompt] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState('7');

  const handleAdminDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    await handleAdminAction('delete');
  };

  const handlePin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await handleAdminAction(post.pinned ? 'unpin' : 'pin');
  };

  const handleLock = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await handleAdminAction(post.locked ? 'unlock' : 'lock');
  };

  const handleBanUser = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBanReason('');
    setBanDays('7');
    setShowBanPrompt(true);
  };

  const confirmBan = async () => {
    if (!banReason.trim()) return;
    setShowBanPrompt(false);
    await handleAdminAction('ban_user', { 
      userId: post.author.id, 
      duration: Number(banDays), 
      reason: banReason 
    });
  };

  // 权限判断
  const isAuthor = user?.id === post.author.id;
  const isSuperAdmin = user?.isSuperAdmin === true;
  const isModerator = user?.role === 'moderator';
  const isAdmin = user?.role === 'admin';

  // 发帖人：编辑、删除
  // 板块管理员：删除、移贴、置顶、锁定（不能编辑他人帖子）
  // 超级管理员：继承以上全部 + 封禁用户、审核
  const canEdit = isAuthor; // 只有作者可编辑
  const canDelete = isAuthor || isModerator || isAdmin || isSuperAdmin;
  const canMove = isModerator || isAdmin || isSuperAdmin;
  const canPin = isModerator || isAdmin || isSuperAdmin;
  const canLock = isModerator || isAdmin || isSuperAdmin;
  const canBan = isSuperAdmin;
  const showMenu = canEdit || canDelete || canMove || canPin || canLock || canBan;

  return (
    <div ref={ref} className="p-4 transition-colors hover:bg-leaf-50/50">
      {/* 第一行：用户头像 + 昵称 + 关注按钮 + 管理员按钮 */}
      <div className="flex items-center gap-2 mb-3">
        <Link
          href={`/user/${post.author.id}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Avatar src={post.author.avatar} alt={post.author.name} size={28} />
          <span className="font-medium text-[13px] text-ink-800">{post.author.name}</span>
        </Link>
        {post.type !== 'rich' && (
          <PostTypeBadge type={post.type} />
        )}
        {user && user.id !== post.author.id && (
          <button
            type="button"
            onClick={handleFollow}
            className="text-[11px] px-2.5 py-1 rounded-full border border-leaf-500 text-leaf-600 hover:bg-leaf-500 hover:text-white transition-colors"
          >
            +关注
          </button>
        )}
        <div className="flex-1" />
        {/* 管理按钮 - 根据权限显示 */}
        {user && showMenu && (
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setAdminMenuOpen(true)}
              onMouseLeave={() => setAdminMenuOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition-colors"
              title="管理"
            >
              <Icon name="settings" size={16} />
            </button>
            {adminMenuOpen && (
              <div 
                className="absolute right-1/2 translate-x-1/2 top-full z-50 pt-2"
                onMouseEnter={() => setAdminMenuOpen(true)}
                onMouseLeave={() => setAdminMenuOpen(false)}
              >
                <div className="relative w-16 rounded-lg border border-leaf-100 bg-white shadow-xl py-1">
                  <div className="absolute left-1/2 -translate-x-1/2 -top-[6px] w-3 h-3 bg-white border-l border-t border-leaf-100 transform rotate-45" />

                  {/* 作者：编辑 */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/post/${post.id}/edit`);
                      }}
                      className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                    >
                      编辑
                    </button>
                  )}

                  {/* 管理员：移贴 */}
                  {canMove && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('移贴功能开发中');
                      }}
                      className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                    >
                      移贴
                    </button>
                  )}

                  {/* 管理员：置顶 */}
                  {canPin && (
                    <button
                      type="button"
                      onClick={handlePin}
                      className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                    >
                      {post.pinned ? '取消置顶' : '置顶'}
                    </button>
                  )}

                  {/* 管理员：锁定 */}
                  {canLock && (
                    <button
                      type="button"
                      onClick={handleLock}
                      className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                    >
                      {post.locked ? '解锁' : '锁定'}
                    </button>
                  )}

                  {/* 超管：封禁用户（不能封禁自己） */}
                  {canBan && !isAuthor && (
                    <button
                      type="button"
                      onClick={handleBanUser}
                      className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                    >
                      封禁用户
                    </button>
                  )}

                  {/* 分割线 */}
                  {canDelete && <div className="border-t border-leaf-50 my-0.5" />}

                  {/* 发帖人 + 管理员：删除 */}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={handleAdminDelete}
                      className="w-full px-2 py-1.5 text-[11px] text-rose-600 hover:bg-rose-50 text-center"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 第二行：标题 + 置顶/锁定标识 */}
      <Link href={`/post/${post.id}`}>
        <div className="flex items-start gap-2 mb-2">
          <h3 className="text-[15px] font-semibold text-ink-800 flex-1 hover:text-leaf-700 transition-colors">
            {post.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {post.pinned && (
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                <Icon name="pin" size={10} />
                置顶
              </span>
            )}
            {post.locked && (
              <span className="inline-flex items-center gap-0.5 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-600">
                <Icon name="lock" size={10} />
                锁定
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* 第三行：描述 */}
      {(post.type === 'short' || post.type === 'rich' || post.type === 'help') &&
        (post.contentText || post.content) && (
          <Link href={`/post/${post.id}`}>
            <p className="text-[14px] text-ink-600 leading-relaxed mb-2 line-clamp-2">
              {post.contentText || stripHtml(post.content)}
            </p>
          </Link>
        )}

      {/* 投票预览 */}
      {post.type === 'vote' && post.vote && <VotePreview post={post} />}

      {/* 活动预览 */}
      {post.type === 'event' && post.event && <EventPreview post={post} />}

      {/* 时间线预览 */}
      {post.type === 'journal' && post.journal && <JournalPreview post={post} />}

      {/* 视频标识 */}
      {post.type === 'video' && (
        <Link href={`/post/${post.id}`} className="flex items-center gap-2 mb-2 text-sm text-ink-600">
          <Icon name="video" size={16} />
          <span>视频内容</span>
        </Link>
      )}

      {/* 第四行：话题标签 */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.slice(0, 5).map((tag, i) => (
            <Link
              key={i}
              href={`/topic/${encodeURIComponent(tag)}`}
              className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-100 transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {/* 第五行：图片 - 最多显示5张，均分宽度 */}
      {displayImages.length > 0 && (
        <Link href={`/post/${post.id}`} className="block mb-3">
          <div className="grid grid-cols-5 gap-1.5">
            {displayImages.slice(0, 5).map((img, i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-lg bg-leaf-50"
              >
                <Image src={img} alt="" fill className="object-cover" unoptimized />
                {/* 第5张且有剩余 */}
                {i === 4 && images.length > 5 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-lg font-bold text-white">+{images.length - 5}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Link>
      )}

      {/* 最后一行：板块 + 时间 + 统计 */}
      <div className="flex items-center justify-between text-[11px]">
        <NestedLink
          href={boardUrl(post.board)}
          className="inline-flex items-center gap-1.5 rounded-full bg-leaf-50 px-2.5 py-1 text-[12px] font-medium text-leaf-700 hover:bg-leaf-100"
        >
          {post.board.icon && (post.board.icon.startsWith('http') || post.board.icon.startsWith('/')) ? (
            <img src={post.board.icon} alt="" className="h-5 w-5 rounded object-cover" />
          ) : (
            <span className="text-sm">{post.board.icon || '🌿'}</span>
          )}
          <span className="truncate max-w-[120px]">{post.board.name}</span>
        </NestedLink>
        <div className="flex items-center gap-3 text-[13px] text-ink-500">
          <span className="text-ink-400">{formatDateTime(post.createdAt)}</span>
          <Link href={`/post/${post.id}`} className="flex items-center gap-1 hover:text-leaf-600 transition-colors">
            <Icon name="eye" size={14} />
            {formatCount(post.views)}
          </Link>
          <button
            type="button"
            onClick={handleLike}
            className="flex items-center gap-1 hover:text-rose-500 transition-colors"
          >
            <Icon name="heart" size={14} />
            {formatCount(post.likes)}
          </button>
          <Link href={`/post/${post.id}`} className="flex items-center gap-1 hover:text-leaf-600 transition-colors">
            <Icon name="comment" size={14} />
            {formatCount(post.comments)}
          </Link>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="确认删除"
        message="确定要删除这篇帖子吗？此操作无法撤销。"
        confirmText="确认删除"
        danger={true}
      />

      {/* 封禁用户对话框 */}
      {showBanPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-ink-800 mb-4">封禁用户</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">
                  封禁原因
                </label>
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full px-3 py-2 border border-leaf-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-leaf-500"
                  placeholder="请输入封禁原因"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">
                  封禁天数
                </label>
                <input
                  type="number"
                  value={banDays}
                  onChange={(e) => setBanDays(e.target.value)}
                  className="w-full px-3 py-2 border border-leaf-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-leaf-500"
                  placeholder="7"
                  min="1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowBanPrompt(false)}
                className="px-4 py-2 text-sm text-ink-600 hover:bg-ink-50 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmBan}
                disabled={!banReason.trim()}
                className="px-4 py-2 text-sm bg-rose-500 text-white hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认封禁
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedSkeleton({
  mobileCols = 2,
  desktopCols = 3,
}: {
  mobileCols?: 1 | 2;
  desktopCols?: 3 | 4;
}) {
  const colClass = mobileCols === 1 ? 'columns-1' : 'columns-2';
  const dColClass = desktopCols === 4 ? 'md:columns-4' : 'md:columns-3';
  return (
    <div className={`mt-4 ${colClass} gap-3 sm:columns-2 ${dColClass}`}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="mb-3 break-inside-avoid">
          <PostCardSkeleton variant={i} />
        </div>
      ))}
    </div>
  );
}

/** 列表模式骨架屏 */
function ListFeedSkeleton() {
  return (
    <div className="mt-4 rounded-xl border border-leaf-100 bg-white overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}>
          <div className="p-4 animate-pulse">
            {/* 第一行：头像 + 昵称 */}
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-full bg-leaf-100" />
              <div className="h-4 w-20 rounded bg-leaf-100" />
              <div className="ml-auto h-3 w-16 rounded bg-leaf-100" />
            </div>
            {/* 标题 */}
            <div className="h-5 w-3/4 rounded bg-leaf-100 mb-2" />
            {/* 描述 */}
            <div className="space-y-1.5 mb-3">
              <div className="h-4 w-full rounded bg-leaf-100" />
              <div className="h-4 w-2/3 rounded bg-leaf-100" />
            </div>
            {/* 图片 - 5张 */}
            <div className="flex gap-1.5 mb-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-28 w-28 rounded-lg bg-leaf-100" />
              ))}
            </div>
            {/* 底部 */}
            <div className="flex items-center justify-between">
              <div className="h-5 w-16 rounded-full bg-leaf-100" />
              <div className="flex gap-3">
                <div className="h-4 w-10 rounded bg-leaf-100" />
                <div className="h-4 w-10 rounded bg-leaf-100" />
                <div className="h-4 w-10 rounded bg-leaf-100" />
              </div>
            </div>
          </div>
          {i < 4 && <div className="mx-4 border-t border-leaf-100" />}
        </div>
      ))}
    </div>
  );
}

function tabToSource(t: TabKey): string {
  return {
    recommend: 'feed_recommend',
    following: 'feed_following',
    hot: 'feed_hot',
    latest: 'feed_latest',
  }[t];
}

function TabHeader({
  tab,
  setTab,
  mobileCols,
  onMobileColsChange,
  desktopCols,
  onDesktopColsChange,
  layoutMode,
  onLayoutModeChange,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  mobileCols: 1 | 2;
  onMobileColsChange: (n: 1 | 2) => void;
  desktopCols: 3 | 4;
  onDesktopColsChange: (n: 3 | 4) => void;
  layoutMode: 'grid' | 'list';
  onLayoutModeChange: (mode: 'grid' | 'list') => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center border-b border-leaf-100">
      {/* 左侧：Tab 切换 */}
      <div className="flex items-center gap-1">
        {TAB_DEFS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              tab === tabItem.key ? 'text-leaf-700' : 'text-ink-700/60 hover:text-leaf-700'
            )}
          >
            {t(tabItem.labelKey)}
            {tab === tabItem.key && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-leaf-500" />
            )}
          </button>
        ))}
      </div>

      {/* 右侧：布局模式切换 */}
      <div className="ml-auto flex items-center gap-0.5 rounded-lg bg-leaf-50/60 p-0.5">
        <button
          type="button"
          onClick={() => onLayoutModeChange('list')}
          title="列表"
          className={cn(
            'grid h-7 w-8 place-items-center rounded transition-colors',
            layoutMode === 'list'
              ? 'bg-white text-leaf-700 shadow-sm'
              : 'text-ink-500 hover:text-leaf-700'
          )}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="0" y="1" width="14" height="3" rx="1" />
            <rect x="0" y="5.5" width="14" height="3" rx="1" />
            <rect x="0" y="10" width="14" height="3" rx="1" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => { onLayoutModeChange('grid'); onDesktopColsChange(3); }}
          title="3列瀑布流"
          className={cn(
            'grid h-7 w-8 place-items-center rounded transition-colors',
            layoutMode === 'grid' && desktopCols === 3
              ? 'bg-white text-leaf-700 shadow-sm'
              : 'text-ink-500 hover:text-leaf-700'
          )}
        >
          <ColsIcon n={3} />
        </button>
        <button
          type="button"
          onClick={() => { onLayoutModeChange('grid'); onDesktopColsChange(4); }}
          title="4列瀑布流"
          className={cn(
            'grid h-7 w-8 place-items-center rounded transition-colors',
            layoutMode === 'grid' && desktopCols === 4
              ? 'bg-white text-leaf-700 shadow-sm'
              : 'text-ink-500 hover:text-leaf-700'
          )}
        >
          <ColsIcon n={4} />
        </button>
      </div>
    </div>
  );
}

function ColsIcon({ n }: { n: 1 | 2 | 3 | 4 }) {
  const grid = n === 1 ? 'grid-cols-1' : n === 2 ? 'grid-cols-2' : n === 3 ? 'grid-cols-3' : 'grid-cols-4';
  return (
    <span className={`grid h-3.5 w-4 gap-[1.5px] ${grid}`}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="block rounded-[1px] bg-current" />
      ))}
    </span>
  );
}

/** 关注的用户列表 */
function FollowedUsersList() {
  const { user } = useAuth();
  const [users, setUsers] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ items: FollowedUser[] }>(`/api/users/${user.id}/following`)
      .then((data) => setUsers(data.items || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="flex items-center gap-3 p-4">
              <div className="h-12 w-12 rounded-full bg-leaf-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-leaf-100" />
                <div className="h-3 w-48 rounded bg-leaf-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
        还没有关注任何人
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {users.map((u) => (
        <Link
          key={u.id}
          href={`/user/${u.id}`}
          className="card card-hoverable group"
        >
          <div className="flex items-center gap-3 p-4">
            {u.avatar ? (
              <img
                src={u.avatar}
                alt={u.name}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-leaf-100 group-hover:ring-leaf-300 transition-all"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-leaf-100 flex items-center justify-center text-leaf-600 text-lg">
                {u.name[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-ink-800 truncate">{u.name}</div>
              {u.handle && <div className="text-xs text-ink-500 truncate">@{u.handle}</div>}
              <div className="mt-1 flex items-center gap-3 text-[10px] text-ink-400">
                <span>{u.posts} 帖</span>
                <span>{u.followers} 粉丝</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** 关注的品种列表 */
function FollowedSpeciesList() {
  const [species, setSpecies] = useState<FollowedSpecies[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<FollowedSpecies[]>('/api/boards/followed')
      .then((list) => setSpecies((list || []).filter((f) => f)))
      .catch(() => setSpecies([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="aspect-square bg-leaf-100 rounded-t-xl" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-24 rounded bg-leaf-100" />
              <div className="h-3 w-32 rounded bg-leaf-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (species.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
        还没有关注任何品种
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {species.map((s) => {
        const catPath = s.path?.find((p) => p.level === 'category');
        const genusPath = s.path?.find((p) => p.level === 'genus');
        const href =
          catPath && genusPath
            ? `/board/${catPath.slug}/${genusPath.slug}/${s.slug}`
            : `/board/${s.slug}`;
        return (
          <Link
            key={s.id}
            href={href}
            className="card card-hoverable group overflow-hidden"
          >
            <div className="relative aspect-square bg-leaf-50">
              {s.cover ? (
                <img
                  src={s.cover}
                  alt={s.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl text-leaf-300">
                  🌱
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <div className="text-xs font-medium text-white truncate">{s.name}</div>
              </div>
            </div>
            <div className="p-3">
              <div className="text-sm font-medium text-ink-800 truncate">{s.name}</div>
              {catPath && genusPath && (
                <div className="mt-1 text-[10px] text-ink-400 truncate">
                  {catPath.name} · {genusPath.name}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
