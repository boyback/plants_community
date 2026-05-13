'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PostCard } from '@/components/post/PostCard';
import { PostCardSkeleton } from '@/components/post/PostCardSkeleton';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { usePullToRefresh, PullIndicator } from '@/lib/hooks/usePullToRefresh';
import type { Post, PostType } from '@/lib/types';

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
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedM = Number(localStorage.getItem('rouyou.feed.mobileCols'));
    if (savedM === 1 || savedM === 2) setMobileCols(savedM as 1 | 2);
    const savedD = Number(localStorage.getItem('rouyou.feed.desktopCols'));
    if (savedD === 3 || savedD === 4) setDesktopCols(savedD as 3 | 4);
  }, []);
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

  // m 端 column class:1 或 2;md+ 按用户偏好 3 或 4
  const mobileColClass = mobileCols === 1 ? 'columns-1' : 'columns-2';
  const desktopColClass = desktopCols === 4 ? 'md:columns-4' : 'md:columns-3';

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
        <FeedSkeleton mobileCols={mobileCols} desktopCols={desktopCols} />
      ) : cur.items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
          暂时没有内容
        </div>
      ) : (
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
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  mobileCols: 1 | 2;
  onMobileColsChange: (n: 1 | 2) => void;
  desktopCols: 3 | 4;
  onDesktopColsChange: (n: 3 | 4) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1 border-b border-leaf-100">
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

      {/* m 端 1/2 列切换(sm+ 自动隐藏) */}
      <div className="ml-auto flex sm:hidden items-center gap-0.5 rounded-lg bg-leaf-50/60 p-0.5">
        {([1, 2] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onMobileColsChange(n)}
            title={`${n} 列`}
            className={cn(
              'grid h-7 w-8 place-items-center rounded transition-colors',
              mobileCols === n
                ? 'bg-white text-leaf-700 shadow-sm'
                : 'text-ink-500 hover:text-leaf-700'
            )}
          >
            <ColsIcon n={n} />
          </button>
        ))}
      </div>

      {/* PC 端 3/4 列切换(m 端隐藏,md+ 显示) */}
      <div className="ml-auto hidden md:flex items-center gap-0.5 rounded-lg bg-leaf-50/60 p-0.5">
        {([3, 4] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onDesktopColsChange(n)}
            title={`${n} 列`}
            className={cn(
              'grid h-7 w-9 place-items-center rounded transition-colors',
              desktopCols === n
                ? 'bg-white text-leaf-700 shadow-sm'
                : 'text-ink-500 hover:text-leaf-700'
            )}
          >
            <ColsIcon n={n} />
          </button>
        ))}
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
