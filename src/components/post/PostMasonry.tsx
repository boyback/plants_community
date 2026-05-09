'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PostCard } from '@/components/post/PostCard';
import { PostCardSkeleton } from '@/components/post/PostCardSkeleton';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import type { Post } from '@/lib/types';

/**
 * 通用网格帖子列表(板块页/作者页/搜索通用)
 *
 * 行为:
 * - SSR 首屏 initial,客户端 cursor 加载更多
 * - 响应式列数:m 端 1/2(默 2)、PC 端 3/4(默 3),分别存 localStorage
 * - journal/vote 在多列下横跨 2 列(更醒目)
 * - 哨兵元素接近视口自动加载下一页
 * - 加载中骨架屏占位
 */
interface Props {
  initial: Post[];
  initialCursor?: string | null;
  loadMoreUrl: string;
  source?: string;
  className?: string;
  showColsToggle?: boolean;
  empty?: React.ReactNode;
}

interface FeedResponse {
  items: Post[];
  nextCursor: string | null;
}

const STORAGE_M = 'rouyou.feed.cols.mobile';
const STORAGE_D = 'rouyou.feed.cols.desktop';

export function PostMasonry({
  initial,
  initialCursor = null,
  loadMoreUrl,
  source = 'masonry',
  className,
  showColsToggle = true,
  empty,
}: Props) {
  const [items, setItems] = useState<Post[]>(initial);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [colsMobile, setColsMobile] = useState<1 | 2>(2);
  const [colsDesktop, setColsDesktop] = useState<3 | 4>(3);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener('change', apply);
    const sm = Number(localStorage.getItem(STORAGE_M));
    if (sm === 1 || sm === 2) setColsMobile(sm);
    const sd = Number(localStorage.getItem(STORAGE_D));
    if (sd === 3 || sd === 4) setColsDesktop(sd);
    return () => mql.removeEventListener('change', apply);
  }, []);

  const cols: 1 | 2 | 3 | 4 = isMobile ? colsMobile : colsDesktop;

  const updateCols = (n: 1 | 2 | 3 | 4) => {
    if (isMobile) {
      if (n !== 1 && n !== 2) return;
      setColsMobile(n);
      try {
        localStorage.setItem(STORAGE_M, String(n));
      } catch {}
    } else {
      if (n !== 3 && n !== 4) return;
      setColsDesktop(n);
      try {
        localStorage.setItem(STORAGE_D, String(n));
      } catch {}
    }
  };

  const loadingRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (!cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setErr(null);
    try {
      const sep = loadMoreUrl.includes('?') ? '&' : '?';
      const r = await api.get<FeedResponse>(
        `${loadMoreUrl}${sep}cursor=${encodeURIComponent(cursor)}`
      );
      setItems((prev) => [...prev, ...r.items]);
      setCursor(r.nextCursor);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '加载失败');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cursor, loadMoreUrl]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void loadMore();
          }
        }
      },
      { rootMargin: '0px 0px 600px 0px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  if (items.length === 0) {
    return <>{empty}</>;
  }

  return (
    <div className={className}>
      {showColsToggle && (
        <div className="mb-3 flex justify-end">
          <ColsToggle cols={cols} onChange={updateCols} />
        </div>
      )}

      <div className={`grid gap-3 ${gridColsClass(cols)}`}>
        {items.map((p) => (
          <ObservedCard key={p.id} post={p} source={source} cols={cols} />
        ))}
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`} className="col-span-1">
              <PostCardSkeleton variant={i} />
            </div>
          ))}
      </div>

      {err && (
        <div className="mt-4 flex flex-col items-center gap-2 text-xs">
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{err}</div>
          <button type="button" onClick={loadMore} className="btn-outline !text-xs">
            重试
          </button>
        </div>
      )}

      {cursor && !err && <div ref={sentinelRef} className="h-1 w-full" aria-hidden />}

      {!cursor && !err && items.length > 0 && (
        <div className="py-6 text-center text-xs text-leaf-700/60">— 没有更多了 —</div>
      )}
    </div>
  );
}

function ObservedCard({
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
            void api
              .post(`/api/posts/${post.id}/view`, { source })
              .catch(() => null);
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

function spanClass(post: Post, cols: 1 | 2 | 3 | 4): string {
  const isWide = post.type === 'journal' || post.type === 'vote';
  if (!isWide || cols === 1) return 'col-span-1';
  return 'col-span-2';
}

function gridColsClass(cols: 1 | 2 | 3 | 4): string {
  switch (cols) {
    case 1:
      return 'grid-cols-1';
    case 2:
      return 'grid-cols-2';
    case 3:
      return 'grid-cols-3';
    case 4:
      return 'grid-cols-4';
  }
}

function ColsToggle({
  cols,
  onChange,
}: {
  cols: 1 | 2 | 3 | 4;
  onChange: (n: 1 | 2 | 3 | 4) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-leaf-50/60 p-0.5 text-[10px]">
      {([1, 2] as const).map((n) => (
        <button
          key={`m-${n}`}
          type="button"
          onClick={() => onChange(n)}
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
      {([3, 4] as const).map((n) => (
        <button
          key={`d-${n}`}
          type="button"
          onClick={() => onChange(n)}
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
  );
}

function ColsIcon({ n }: { n: 1 | 2 | 3 | 4 }) {
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
