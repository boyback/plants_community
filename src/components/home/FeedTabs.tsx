'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { PostCard } from '@/components/post/PostCard';
import { PostCardSkeleton } from '@/components/post/PostCardSkeleton';
import { useI18n } from '@/i18n/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { usePullToRefresh, PullIndicator } from '@/lib/hooks/usePullToRefresh';
import type { Post } from '@/lib/types';

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

  // 列数(1-4),用户偏好存 localStorage
  const [cols, setCols] = useState<1 | 2 | 3 | 4>(2);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = Number(localStorage.getItem('rouyou.feed.cols'));
    if (saved >= 1 && saved <= 4) setCols(saved as 1 | 2 | 3 | 4);
  }, []);
  const updateCols = (n: 1 | 2 | 3 | 4) => {
    setCols(n);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rouyou.feed.cols', String(n));
    }
  };

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

  return (
    <div {...bind}>
      <PullIndicator status={status} progress={progress} />
      <TabHeader tab={tab} setTab={setTab} cols={cols} setCols={updateCols} />

      {tab === 'following' && !user ? (
        <div className="mt-6 rounded-xl border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
          登录后查看你关注的肉友的最新动态
        </div>
      ) : cur.err ? (
        <div className="mt-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {cur.err}
        </div>
      ) : !cur.loaded ? (
        <FeedSkeleton cols={cols} />
      ) : cur.items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-leaf-200 bg-white/60 py-12 text-center text-sm text-leaf-700/70">
          暂时没有内容
        </div>
      ) : (
        <>
          {/*
            瀑布流:每张卡 break-inside-avoid 保证不被切;
            CSS columns 类用 colsToClass 映射(Tailwind 不支持动态拼接)
          */}
          <div className={`mt-4 gap-3 ${colsToClass(cols)}`}>
            {cur.items.map((p) => (
              <FeedCard key={p.id} post={p} source={tabToSource(tab)} />
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
function FeedCard({ post, source }: { post: Post; source: string }) {
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
    // mb-3 提供瀑布流间距,break-inside-avoid 防止 column 把卡切两半
    <div ref={ref} className="mb-3 break-inside-avoid">
      <PostCard post={post} />
    </div>
  );
}

function FeedSkeleton({ cols }: { cols: 1 | 2 | 3 | 4 }) {
  return (
    <div className={`mt-4 gap-3 ${colsToClass(cols)}`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="mb-3 break-inside-avoid">
          <PostCardSkeleton variant={i} />
        </div>
      ))}
    </div>
  );
}

/**
 * 根据用户选择的列数返回 tailwind class。
 * 注意必须是字面量字符串(Tailwind 编译时能扫到才会生成对应 CSS)。
 */
function colsToClass(cols: 1 | 2 | 3 | 4): string {
  switch (cols) {
    case 1: return 'columns-1';
    case 2: return 'columns-2';
    case 3: return 'columns-3';
    case 4: return 'columns-4';
  }
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
  cols,
  setCols,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  cols: 1 | 2 | 3 | 4;
  setCols: (n: 1 | 2 | 3 | 4) => void;
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

      {/* 列数切换 — 桌面显示 4 个,移动端只显示 1/2 列 */}
      <div className="ml-auto flex items-center gap-0.5 rounded-lg bg-leaf-50/60 p-0.5 text-[10px]">
        {([1, 2, 3, 4] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCols(n)}
            title={`${n} 列`}
            className={cn(
              'grid h-6 w-7 place-items-center rounded transition-colors',
              n > 2 && 'hidden md:grid', // 3/4 列在移动端不太合适,只在 md+ 显示
              cols === n
                ? 'bg-white text-leaf-700 shadow-sm font-semibold'
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

/** 列数图标:N 个垂直短条 */
function ColsIcon({ n }: { n: 1 | 2 | 3 | 4 }) {
  return (
    <span className="flex items-end gap-[2px] h-3">
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="block w-[3px] bg-current rounded-sm" style={{ height: '100%' }} />
      ))}
    </span>
  );
}
