'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

interface FeedResponse {
  items: Post[];
  nextCursor: string | null;
}

/** 4 个 tab 共用一个客户端组件,各自维护 items + cursor 状态 */
export function FeedTabs({ initial }: { initial: Post[] }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>('recommend');

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
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = Number(localStorage.getItem('rouyou.feed.mobileCols'));
    if (saved === 1 || saved === 2) setMobileCols(saved);
  }, []);
  const updateMobileCols = (n: 1 | 2) => {
    setMobileCols(n);
    try {
      localStorage.setItem('rouyou.feed.mobileCols', String(n));
    } catch {}
  };

  // m 端 column class:1 或 2(sm+ 总是 2,md+ 总是 3)
  const mobileColClass = mobileCols === 1 ? 'columns-1' : 'columns-2';

  return (
    <div {...bind}>
      <PullIndicator status={status} progress={progress} />
      <TabHeader
        tab={tab}
        setTab={setTab}
        mobileCols={mobileCols}
        onMobileColsChange={updateMobileCols}
      />

      {tab === 'following' && !user ? (
        <div className="mt-6 rounded-xl border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
          登录后查看你关注的肉友的最新动态
        </div>
      ) : cur.err ? (
        <div className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {cur.err}
        </div>
      ) : !cur.loaded ? (
        <FeedSkeleton mobileCols={mobileCols} />
      ) : cur.items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
          暂时没有内容
        </div>
      ) : (
        <>
          {/* CSS columns 瀑布流:m 端按用户偏好 1/2,sm=2,md+=3 */}
          <div className={`mt-4 ${mobileColClass} gap-3 sm:columns-2 md:columns-3 [column-fill:_balance]`}>
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

function FeedSkeleton({ mobileCols = 2 }: { mobileCols?: 1 | 2 }) {
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
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  mobileCols: 1 | 2;
  onMobileColsChange: (n: 1 | 2) => void;
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
    </div>
  );
}

function ColsIcon({ n }: { n: 1 | 2 }) {
  return (
    <span className={`grid h-3.5 w-4 gap-[1.5px] ${n === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="block rounded-[1px] bg-current" />
      ))}
    </span>
  );
}
