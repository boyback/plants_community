'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PostCard } from '@/components/post/PostCard';
import { PostCardSkeleton } from '@/components/post/PostCardSkeleton';
import { api, ApiError } from '@/lib/client-api';
import type { Post } from '@/lib/types';

/**
 * 通用网格帖子列表(板块页/作者页/搜索通用)
 *
 * 行为:
 * - SSR 首屏 initial,客户端 cursor 加载更多
 * - 固定 3 列网格(m=1, sm=2, md+=3),所有卡片大小一致
 * - 哨兵元素接近视口自动加载下一页
 * - 加载中骨架屏占位
 */
interface Props {
  initial: Post[];
  initialCursor?: string | null;
  loadMoreUrl: string;
  source?: string;
  className?: string;
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
  className,
  empty,
}: Props) {
  const [items, setItems] = useState<Post[]>(initial);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      {/* CSS columns 瀑布流 */}
      <div className="columns-2 gap-3 md:columns-3">
        {items.map((p) => (
          <div key={p.id} className="mb-3 break-inside-avoid">
            <ObservedCard post={p} source={source} />
          </div>
        ))}
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div key={`sk-${i}`} className="mb-3 break-inside-avoid">
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
    <div ref={ref}>
      <PostCard post={post} />
    </div>
  );
}
