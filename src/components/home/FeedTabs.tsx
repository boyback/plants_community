'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { cn, formatFollowers, timeAgo, boardUrl } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { PostCard } from '@/components/post/PostCard';
import { PostAdminMenu } from '@/components/post/PostAdminMenu';
import { PostCardSkeleton } from '@/components/post/PostCardSkeleton';
import { TopicTag } from '@/components/ui/TopicTag';
import { Tooltip } from '@/components/ui/Tooltip';
import { STAGE_META } from '@/lib/journal';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { usePullToRefresh, PullIndicator } from '@/lib/hooks/usePullToRefresh';
import { toast } from '@/components/ui/Toast';
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

  // 投票更新回调
  const onVoteUpdate = useCallback((
    postId: string,
    options: { id: string; label: string; votes: number }[],
    total: number,
    voted: boolean,
    votedOptionIds: string[]
  ) => {
    stateRef.current[tab].items = stateRef.current[tab].items.map(p =>
      p.id === postId && p.vote
        ? { ...p, vote: { ...p.vote, options, total, voted, votedOptionIds } }
        : p
    );
    rerender();
  }, [tab]);

  const onPostChanged = useCallback((updatedPost: Post) => {
    (Object.keys(stateRef.current) as TabKey[]).forEach((key) => {
      stateRef.current[key].items = stateRef.current[key].items.map((p) =>
        p.id === updatedPost.id ? updatedPost : p
      );
    });
    rerender();
  }, []);

  const onPostDeleted = useCallback((postId: string) => {
    (Object.keys(stateRef.current) as TabKey[]).forEach((key) => {
      stateRef.current[key].items = stateRef.current[key].items.filter((p) => p.id !== postId);
    });
    rerender();
  }, []);

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
  const updateLayoutMode = (mode: 'grid' | 'list') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('rouyou.feed.layout', mode);
    } catch {}
  };

  // m 端 column class:1 或 2;md+ 固定 3 列
  const mobileColClass = mobileCols === 1 ? 'columns-1' : 'columns-2';
  const desktopColClass = 'md:columns-3';

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
        <div className="mt-6 rounded-none border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
          登录后查看你关注的肉友的最新动态
        </div>
      ) : tab === 'following' && followingSubTab === 'users' ? (
        <FollowedUsersList />
      ) : tab === 'following' && followingSubTab === 'species' ? (
        <FollowedSpeciesList />
      ) : cur.err ? (
        <div className="mt-6 rounded-none bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {cur.err}
        </div>
      ) : !cur.loaded ? (
        layoutMode === 'list' ? (
          <ListFeedSkeleton />
        ) : (
          <FeedSkeleton mobileCols={mobileCols} />
        )
      ) : cur.items.length === 0 ? (
        <div className="mt-6 rounded-none border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
          暂时没有内容
        </div>
      ) : (
        <>
          {layoutMode === 'list' ? (
            /* 列表模式：所有卡片在一个大卡片中，用线隔开 */
            <div className="mt-4 rounded-none border border-leaf-100 bg-white">
              {cur.items.map((p, i) => (
                <div key={p.id}>
                  <FeedListCard post={p} source={tabToSource(tab)} onVoteUpdate={onVoteUpdate} onPostChanged={onPostChanged} onPostDeleted={onPostDeleted} />
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
              {/* CSS columns 瀑布流:m 端按用户偏好 1/2,sm=2,md+ 固定 3 列 */}
              <div className={`feed-grid mt-4 ${mobileColClass} gap-3 sm:columns-2 ${desktopColClass} [column-fill:_balance]`}>
                {cur.items.map((p) => (
                  <div key={p.id} className="mb-3 break-inside-avoid">
                    <FeedCard post={p} source={tabToSource(tab)} onVoteUpdate={onVoteUpdate} onPostChanged={onPostChanged} onPostDeleted={onPostDeleted} />
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
  onVoteUpdate,
  onPostChanged,
  onPostDeleted,
}: {
  post: Post;
  source: string;
  onVoteUpdate?: (postId: string, options: { id: string; label: string; votes: number }[], total: number, voted: boolean, votedOptionIds: string[]) => void;
  onPostChanged?: (post: Post) => void;
  onPostDeleted?: (postId: string) => void;
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
      <PostCard post={post} onVoteUpdate={onVoteUpdate} onPostChanged={onPostChanged} onPostDeleted={onPostDeleted} />
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

/** 投票预览(只读):展示问题 + 所有选项进度条 + 精确百分比 */
function VotePreview({ post, onVoteUpdate }: { post: Post; onVoteUpdate?: (postId: string, options: { id: string; label: string; votes: number }[], total: number, voted: boolean, votedOptionIds: string[]) => void }) {
  if (!post.vote) return null;
  const total = post.vote.options.reduce((s, o) => s + o.votes, 0);
  const deadlinePassed = new Date(post.vote.deadline).getTime() < Date.now();
  const hasVoted = post.vote.voted;
  const votedOptionIds = post.vote.votedOptionIds ?? [];
  const canVote = !deadlinePassed && !hasVoted;
  const [selectedOptions, setSelectedOptions] = useState<string[]>(hasVoted ? votedOptionIds : []);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSelect = (optionId: string) => {
    if (!canVote) return;
    setSelectedOptions(prev => {
      if (post.vote?.multi) {
        return prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId];
      } else {
        return prev.includes(optionId) ? [] : [optionId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    if (selectedOptions.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIds: selectedOptions }),
      });
      const data = await res.json();
      if (!data.ok) {
        const msg = data.error?.message || data.code || '投票失败';
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      toast.success('投票成功');
      onVoteUpdate?.(post.id, data.data.options, data.data.total, true, selectedOptions);
    } catch (err) {
      console.error('投票失败:', err);
      toast.error('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 rounded-none bg-leaf-50/60 p-2 mb-3" onClick={(e) => e.stopPropagation()}>
      {/* 问题 */}
      <div className="flex items-center gap-2">
        <Link
          href={`/post/${post.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0"
        >
          <Tooltip content={post.vote.question} className="max-w-[200px]">
            <div className="line-clamp-1 text-[13px] font-medium text-leaf-800 hover:text-leaf-600 transition-colors">
              🗳️ {post.vote.question}
            </div>
          </Tooltip>
        </Link>
        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[11px] ${deadlinePassed ? 'bg-leaf-100 text-leaf-600' : 'bg-leaf-200 text-leaf-800'}`}>
          {deadlinePassed ? '已截止' : '进行中'}
        </span>
        <span className="shrink-0 text-[11px] text-leaf-600">{post.vote.multi ? '多选' : '单选'}</span>
      </div>

      {/* 选项列表 */}
      <div className="space-y-1.5">
        {post.vote.options.map((o, idx) => {
          let pct: number;
          if (total === 0) {
            pct = 0;
          } else if (idx === post.vote!.options.length - 1) {
            const sumBefore = post.vote!.options.slice(0, idx).reduce((s, opt) => s + opt.votes, 0);
            pct = Number(((total - sumBefore) / total * 100).toFixed(1));
          } else {
            pct = Number((o.votes / total * 100).toFixed(1));
          }

          const isSelectable = canVote;
          const isSelected = selectedOptions.includes(o.id);
          return (
            <div
              key={o.id}
              onClick={(e) => {
                e.stopPropagation();
                if (!isSelectable) return;
                handleSelect(o.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => {
                e.stopPropagation();
                if (!isSelectable) return;
                handleSelect(o.id);
              }}
              onTouchMove={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onPointerCancel={(e) => e.stopPropagation()}
              className={cn(
                'relative overflow-hidden rounded px-1 py-1 transition-all',
                isSelectable && 'cursor-pointer hover:bg-leaf-100 hover:shadow-sm active:bg-leaf-200',
                isSelected && 'bg-leaf-200/40',
                !isSelectable && !isSelected && 'bg-white/70'
              )}
            >
              {/* 进度条 */}
              <div
                className="absolute inset-y-0 left-0 bg-leaf-200"
                style={{ width: `${pct}%` }}
              />
              {/* 内容 */}
              <div className="relative flex items-center justify-between gap-1 text-[11px]">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span className="w-[10px] text-center text-leaf-600 font-bold shrink-0">
                    {isSelected ? '✓' : ''}
                  </span>
                  <span className="truncate text-leaf-900">{o.label}</span>
                </div>
                <span className="shrink-0 tabular-nums text-leaf-700">
                  {pct}% <span className="text-leaf-600">({o.votes}票)</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部统计 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-leaf-700/80">{total} 票</span>
        {canVote && (
          <button
            type="button"
            className="px-3 py-1 rounded bg-leaf-500 text-white text-[10px] font-medium hover:bg-leaf-600 transition-colors disabled:opacity-50"
            disabled={selectedOptions.length === 0 || submitting}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
          >
            {submitting ? '提交中...' : '提交投票'}
          </button>
        )}
        {hasVoted && (
          <span className="px-3 py-1 rounded bg-leaf-200/60 text-leaf-700 text-[10px] font-medium">
            已投票
          </span>
        )}
        {!canVote && !hasVoted && deadlinePassed && (
          <span className="px-3 py-1 rounded bg-leaf-100 text-leaf-600 text-[10px] font-medium">
            已截止
          </span>
        )}
      </div>
    </div>
  );
}

/** 活动预览(只读):位置 + 时间 + 已报名人数 */
function EventPreview({ post }: { post: Post }) {
  if (!post.event) return null;
  return (
    <div className="rounded-none bg-violet-50/80 p-2 text-[11px] text-violet-900 mb-2">
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

/**
 * 时间线预览(只读):
 *  - 记录 > 4 条：显示前 3 条 + 中间提示 + 最后 1 条
 *  - 记录 ≤ 4 条：全部显示
 */
function JournalPreview({ post }: { post: Post }) {
  if (!post.journal) return null;
  const j = post.journal;
  const shown = j.entries ?? [];
  const totalCount = j.entriesCount ?? shown.length;

  // 超过 4 条时：前 3 条 + 中间提示 + 最后 1 条
  const showCompact = totalCount > 4;
  const first3 = shown.slice(0, 3);
  const lastEntry = shown[shown.length - 1];
  const middleCount = totalCount - 4;

  return (
    <div className="mb-2 rounded-none bg-leaf-50/60 p-2">
      <div className="mb-1 flex items-center justify-between text-xs text-leaf-700/80">
        <span className="truncate font-semibold">📖 {j.subjectName}</span>
        <span className="text-[11px]">第 {j.daysSinceStart} 天 · 共 {j.entriesCount} 条</span>
      </div>

      <div className="relative">
        <ol className="space-y-1.5">
          {first3.map((e) => {
            const meta = STAGE_META[e.stage] || STAGE_META.other;
            return (
              <li key={e.id} className="space-y-1">
                <EntryItem entry={e} meta={meta} />
              </li>
            );
          })}

          {/* 中间省略提示 */}
          {showCompact && (
            <li className="pl-4 text-[10px] text-leaf-700/60">
              + {middleCount} 条更多...
            </li>
          )}

          {/* 最后 1 条 */}
          {showCompact && lastEntry && (
            <li key={lastEntry.id} className="space-y-1">
              <EntryItem entry={lastEntry} meta={STAGE_META[lastEntry.stage] || STAGE_META.other} />
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}

/** 单条时间线记录项 */
function EntryItem({ entry, meta }: { entry: any; meta: any }) {
  const d = new Date(entry.entryDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <span className="mt-1 block h-2 w-2 shrink-0 rounded-full bg-leaf-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-medium text-ink-800">{yyyy}/{mm}/{dd}</span>
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] border', meta.color)}>
              {meta.emoji} {meta.zh}
            </span>
          </div>
          {entry.note && (
            <Tooltip content={entry.note}>
              <p className="mt-0.5 line-clamp-2 text-xs text-ink-600/80">{entry.note}</p>
            </Tooltip>
          )}
          {entry.images && entry.images.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {entry.images.slice(0, 3).map((img: string, idx: number) => (
                <div key={idx} className="relative h-8 w-8 overflow-hidden rounded bg-white/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
              {entry.images.length > 3 && (
                <div className="relative flex h-8 w-8 items-center justify-center rounded bg-black/40 text-[10px] text-white">
                  +{entry.images.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 列表模式卡片 — 一行一个，参考交易广场风格 */
function FeedListCard({
  post,
  source,
  onVoteUpdate,
  onPostChanged,
  onPostDeleted,
}: {
  post: Post;
  source: string;
  onVoteUpdate?: (postId: string, options: { id: string; label: string; votes: number }[], total: number, voted: boolean, votedOptionIds: string[]) => void;
  onPostChanged?: (post: Post) => void;
  onPostDeleted?: (postId: string) => void;
}) {
  const { user } = useAuth();
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

  // 封面图 + 内容图片，最多显示5张
  const displayImages: string[] = [];
  if (post.cover) displayImages.push(post.cover);
  if (post.images) {
    post.images.slice(0, 5 - displayImages.length).forEach(img => {
      if (!displayImages.includes(img)) displayImages.push(img);
    });
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/api/posts/${post.id}/like`);
    } catch {}
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.post(`/api/users/${post.author.id}/follow`);
    } catch {}
  };

  return (
    <div ref={ref} className="p-4 transition-colors hover:bg-leaf-50/50">
      {/* 第一行：用户头像 + 昵称 + 关注按钮 + 管理员按钮 */}
      <div className="flex items-center gap-2.5 mb-3">
        <Link
          href={`/user/${post.author.id}`}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <UserAvatar
            src={post.author.avatar}
            alt={post.author.name}
            size={36}
            pendant={post.author.equip?.pendant ?? null}
            ring={false}
            showFestival={false}
          />
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-medium text-[13px] text-ink-800">{post.author.name}</span>
            <span className="block text-[10px] font-normal text-leaf-700/60">
              {formatFollowers(post.author.followers)} 粉丝
            </span>
          </span>
          <AuthorBadgeIcons post={post} />
        </Link>
        <PostTypeBadge type={post.type} />
        {user && user.id !== post.author.id && (
          <button
            type="button"
            onClick={handleFollow}
            className="text-[10px] px-2 py-0.5 rounded-full border border-leaf-500 text-leaf-600 hover:bg-leaf-500 hover:text-white transition-colors"
          >
            +关注
          </button>
        )}
        <div className="flex-1" />
        {/* 管理按钮 - 根据权限显示 */}
        <PostAdminMenu
          post={post}
          user={user}
          align="center"
          onPostChanged={onPostChanged}
          onPostDeleted={onPostDeleted}
        />
      </div>

      {/* 第二行：标题 + 置顶/锁定标识 */}
      <Link href={`/post/${post.id}`}>
        <div className="flex items-start gap-2 mb-2">
          <h3 className="text-[15px] font-semibold text-ink-800 flex-1 hover:text-leaf-700 transition-colors">
            {post.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            {post.pinState?.any && (
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

      {/* 记录贴：成长线 + 封面 */}
      {post.type === 'journal' && post.journal && <JournalPreview post={post} />}

      {/* 投票预览 */}
      {post.type === 'vote' && post.vote && <VotePreview post={post} onVoteUpdate={onVoteUpdate} />}

      {/* 活动预览 */}
      {post.type === 'event' && post.event && <EventPreview post={post} />}

      {/* 第四行：话题标签 */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.slice(0, 5).map((tag, i) => (
            <TopicTag
              key={i}
              tag={tag}
              href={`/topic/${encodeURIComponent(tag)}`}
              size="md"
            />
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
                className="relative aspect-square overflow-hidden rounded-none bg-leaf-50"
              >
                <Image src={img} alt="" fill className="object-cover" unoptimized />
                {/* 视频播放图标 - 只在第一张图上显示 */}
                {post.type === 'video' && i === 0 && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white">
                      <Icon name="video" size={20} fill="currentColor" />
                    </div>
                  </div>
                )}
                {/* 第5张且有剩余 */}
                {i === 4 && ((post.cover ? 1 : 0) + (post.images?.length ?? 0)) > 5 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-lg font-bold text-white">+{((post.cover ? 1 : 0) + (post.images?.length ?? 0)) - 5}</span>
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
    </div>
  );
}

function FeedSkeleton({
  mobileCols = 2,
}: {
  mobileCols?: 1 | 2;
}) {
  const colClass = mobileCols === 1 ? 'columns-1' : 'columns-2';
  return (
    <div className={`mt-4 ${colClass} gap-3 sm:columns-2 md:columns-3`}>
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="mb-3 break-inside-avoid">
          <PostCardSkeleton variant={i} />
        </div>
      ))}
    </div>
  );
}

/** 列表模式骨架屏 */
function AuthorBadgeIcons({ post }: { post: Post }) {
  const badges = post.author.badges.filter((badge) => badge.obtained).slice(0, 2);
  if (badges.length === 0) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {badges.map((badge) => (
        <span
          key={badge.id}
          title={badge.name}
          className="inline-grid h-4 w-4 place-items-center rounded-full border border-leaf-100 bg-white text-[9px] shadow-sm"
        >
          {badge.icon}
        </span>
      ))}
    </span>
  );
}

function ListFeedSkeleton() {
  return (
    <div className="mt-4 rounded-none border border-leaf-100 bg-white overflow-hidden">
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
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="aspect-square rounded-none bg-leaf-100" />
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
  layoutMode,
  onLayoutModeChange,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  mobileCols: 1 | 2;
  onMobileColsChange: (n: 1 | 2) => void;
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
      <div className="ml-auto flex items-center gap-0.5 rounded-none bg-leaf-50/60 p-0.5">
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
          onClick={() => onLayoutModeChange('grid')}
          title="3列瀑布流"
          className={cn(
            'grid h-7 w-8 place-items-center rounded transition-colors',
            layoutMode === 'grid'
              ? 'bg-white text-leaf-700 shadow-sm'
              : 'text-ink-500 hover:text-leaf-700'
          )}
        >
          <ColsIcon n={3} />
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
      <div className="mt-6 rounded-none border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
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
      <div className="mt-6 rounded-none border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
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
