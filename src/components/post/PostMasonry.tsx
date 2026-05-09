'use client';

import { useEffect, useRef, useState } from 'react';
import { PostCard } from '@/components/post/PostCard';
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

  const loadMore = async () => {
    if (!cursor || loading) return;
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
      setLoading(false);
    }
  };

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
      </div>

      {err && (
        <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-center text-xs text-rose-700">
          {err}
        </div>
      )}

      {cursor && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={loading}
            onClick={loadMore}
            className="btn-outline !text-sm"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
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
