'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PostCard } from '@/components/post/PostCard';
import { PostCardSkeleton } from '@/components/post/PostCardSkeleton';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import type { Post } from '@/lib/types';

/**
 * 通用瀑布流帖子列表组件(供首页 feed 之外的页面用,如板块页/作者页/搜索)。
 *
 * 行为:
 * - 服务端首屏给 initial(已经包含分页第一页)
 * - 客户端用 fetchMore({cursor}) 拉更多
 * - 列数偏好 1-4 列(localStorage,与首页 feed 共用 key)
 * - 进入视口的卡片自动上报 PV
 */
interface Props {
  initial: Post[];
  initialCursor?: string | null;
  /** 拉更多用的 URL 模板,会自动拼 cursor 参数。例如 /api/posts?genus=xxx */
  loadMoreUrl: string;
  /** PV 上报来源标识 */
  source?: string;
  /** 默认列数(用户偏好优先) */
  defaultCols?: 1 | 2 | 3 | 4;
  className?: string;
  /** 是否显示列数切换控件 */
  showColsToggle?: boolean;
  /** 空时的提示节点 */
  empty?: React.ReactNode;
}

interface FeedResponse {
  items: Post[];
  nextCursor: string | null;
}

export function PostMasonry({
  initial,
  initialCursor = null,
  loadMoreUrl,
  source = 'masonry',
  defaultCols = 2,
  className,
  showColsToggle = true,
  empty,
}: Props) {
  const [items, setItems] = useState<Post[]>(initial);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [cols, setCols] = useState<1 | 2 | 3 | 4>(defaultCols);
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

  // 用 ref 锁住正在进行的请求,防止短时间内多次触发
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

  // 哨兵:接近视口时自动触发下一页
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
      // 提前 600px 触发,让用户感觉无缝
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
          <div className="flex items-center gap-0.5 rounded-lg bg-leaf-50/60 p-0.5 text-[10px]">
            {([1, 2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => updateCols(n)}
                title={`${n} 列`}
                className={cn(
                  'grid h-6 w-7 place-items-center rounded transition-colors',
                  n > 2 && 'hidden md:grid',
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
      )}

      <div className={`gap-3 ${colsToClass(cols)}`}>
        {items.map((p) => (
          <ObservedCard key={p.id} post={p} source={source} />
        ))}
        {/* 加载下一页时插入骨架屏占位,不打断瀑布流视觉 */}
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`} className="mb-3 break-inside-avoid">
              <PostCardSkeleton />
            </div>
          ))}
      </div>

      {err && (
        <div className="mt-4 flex flex-col items-center gap-2 text-xs">
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{err}</div>
          <button
            type="button"
            onClick={loadMore}
            className="btn-outline !text-xs"
          >
            重试
          </button>
        </div>
      )}

      {/* 哨兵元素 — 接近视口时自动加载下一页 */}
      {cursor && !err && <div ref={sentinelRef} className="h-1 w-full" aria-hidden />}

      {!cursor && !err && items.length > 0 && (
        <div className="py-6 text-center text-xs text-leaf-700/60">— 没有更多了 —</div>
      )}
    </div>
  );
}

/** 包一层 PostCard,进入视口时上报 PV */
function ObservedCard({ post, source }: { post: Post; source: string }) {
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
    <div ref={ref} className="mb-3 break-inside-avoid">
      <PostCard post={post} />
    </div>
  );
}

function colsToClass(cols: 1 | 2 | 3 | 4): string {
  switch (cols) {
    case 1:
      return 'columns-1';
    case 2:
      return 'columns-2';
    case 3:
      return 'columns-3';
    case 4:
      return 'columns-4';
  }
}

function ColsIcon({ n }: { n: 1 | 2 | 3 | 4 }) {
  return (
    <span className="flex h-3 items-end gap-[2px]">
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="block w-[3px] rounded-sm bg-current"
          style={{ height: '100%' }}
        />
      ))}
    </span>
  );
}
