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

  // 列数:m 端 1/2(默认 2),PC 端 3/4(默认 3),分别存偏好
  // 响应式判断当前是否 mobile(<768px)
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [colsMobile, setColsMobile] = useState<1 | 2>(2);
  const [colsDesktop, setColsDesktop] = useState<3 | 4>(3);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener('change', apply);

    const sm = Number(localStorage.getItem('rouyou.feed.cols.mobile'));
    if (sm === 1 || sm === 2) setColsMobile(sm);
    const sd = Number(localStorage.getItem('rouyou.feed.cols.desktop'));
    if (sd === 3 || sd === 4) setColsDesktop(sd);

    return () => mql.removeEventListener('change', apply);
  }, []);

  const cols: 1 | 2 | 3 | 4 = isMobile ? colsMobile : colsDesktop;

  const updateCols = (n: 1 | 2 | 3 | 4) => {
    if (isMobile) {
      if (n !== 1 && n !== 2) return;
      setColsMobile(n);
      try {
        localStorage.setItem('rouyou.feed.cols.mobile', String(n));
      } catch {}
    } else {
      if (n !== 3 && n !== 4) return;
      setColsDesktop(n);
      try {
        localStorage.setItem('rouyou.feed.cols.desktop', String(n));
      } catch {}
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
            CSS Grid 布局:支持 colSpan,journal/vote 等大卡可横跨 2 列
            cols=1 时所有卡都是 col-span-1(1 列里跨不了),其它 cols 下大卡占 2 列
          */}
          <div className={`mt-4 grid gap-3 ${gridColsClass(cols)}`}>
            {cur.items.map((p) => (
              <FeedCard
                key={p.id}
                post={p}
                source={tabToSource(tab)}
                cols={cols}
              />
            ))}
            {/* 加载下一页时插入骨架屏占位 */}
            {loading &&
              cur.items.length > 0 &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={`sk-${i}`} className="col-span-1">
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
  cols,
}: {
  post: Post;
  source: string;
  cols: 1 | 2 | 3 | 4;
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
    <div ref={ref} className={spanClass(post, cols)}>
      <PostCard post={post} />
    </div>
  );
}

/** 计算每张卡占的列数:journal/vote 在多列布局下占 2 列 */
function spanClass(post: Post, cols: 1 | 2 | 3 | 4): string {
  const isWide = post.type === 'journal' || post.type === 'vote';
  if (!isWide || cols === 1) return 'col-span-1';
  // 2/3/4 列下,大卡占 2 列
  return 'col-span-2';
}

function FeedSkeleton({ cols }: { cols: 1 | 2 | 3 | 4 }) {
  return (
    <div className={`mt-4 grid gap-3 ${gridColsClass(cols)}`}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="col-span-1">
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
/** 用户偏好列数 → grid-cols-N 类(必须字面量字符串,Tailwind 编译期扫描) */
function gridColsClass(cols: 1 | 2 | 3 | 4): string {
  switch (cols) {
    case 1: return 'grid-cols-1';
    case 2: return 'grid-cols-2';
    case 3: return 'grid-cols-3';
    case 4: return 'grid-cols-4';
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

      {/* 列数切换:m 端显示 1/2,PC 显示 3/4。图标用网格小方块预览 */}
      <div className="ml-auto flex items-center gap-0.5 rounded-lg bg-leaf-50/60 p-0.5 text-[10px]">
        {/* m 端 (md 以下) 显示 1/2 */}
        {([1, 2] as const).map((n) => (
          <button
            key={`m-${n}`}
            type="button"
            onClick={() => setCols(n)}
            title={`${n} 列`}
            className={cn(
              'grid h-7 w-8 place-items-center rounded transition-colors md:hidden',
              cols === n
                ? 'bg-white text-leaf-700 shadow-sm'
                : 'text-ink-500 hover:text-leaf-700'
            )}
          >
            <ColsIcon n={n} />
          </button>
        ))}
        {/* PC 端 (md+) 显示 3/4 */}
        {([3, 4] as const).map((n) => (
          <button
            key={`d-${n}`}
            type="button"
            onClick={() => setCols(n)}
            title={`${n} 列`}
            className={cn(
              'hidden h-7 w-8 place-items-center rounded transition-colors md:grid',
              cols === n
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

/**
 * 列数图标:用 N×N 小方块网格做预览,直观表示当前布局
 *  - n=1:1 个大方块
 *  - n=2:2 个并排方块
 *  - n=3:3 个并排方块
 *  - n=4:4 个并排方块
 */
function ColsIcon({ n }: { n: 1 | 2 | 3 | 4 }) {
  // 用 grid 排,每格内填充小方块,代表一张「卡片」预览
  const cells = Array.from({ length: n });
  const gridCols =
    n === 1 ? 'grid-cols-1' : n === 2 ? 'grid-cols-2' : n === 3 ? 'grid-cols-3' : 'grid-cols-4';
  return (
    <span className={`grid h-3.5 w-4 gap-[1.5px] ${gridCols}`}>
      {cells.map((_, i) => (
        <span key={i} className="block rounded-[1px] bg-current" />
      ))}
    </span>
  );
}
