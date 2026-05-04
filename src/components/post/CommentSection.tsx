'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Comment, Post } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { timeAgo, formatNumber, cn } from '@/lib/utils';
import { Empty } from '@/components/ui/Empty';
import { api, ApiError } from '@/lib/client-api';

type SortKey = 'new' | 'hot';

export function CommentSection({ post }: { post: Post }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [sort, setSort] = useState<SortKey>('new');
  const [comments, setComments] = useState<Comment[]>(post.commentList ?? []);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const arr = [...comments];
    if (sort === 'new') {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      arr.sort((a, b) => b.likes - a.likes);
    }
    return arr;
  }, [comments, sort]);

  const submit = async () => {
    if (!user) return;
    const t = text.trim();
    if (!t) return;
    setSubmitting(true);
    setErr(null);
    try {
      const c = await api.post<Comment>(`/api/posts/${post.id}/comments`, {
        content: t,
      });
      setComments((prev) => [c, ...prev]);
      setText('');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '发送失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-leaf-100 px-5 py-3">
        <div className="text-sm font-semibold">
          全部评论 <span className="ml-1 text-leaf-700/70">{comments.length}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setSort('hot')}
            className={cn(
              'rounded-full px-2.5 py-1',
              sort === 'hot' ? 'bg-leaf-100 text-leaf-800' : 'text-ink-700/70 hover:bg-leaf-50'
            )}
          >
            热门
          </button>
          <button
            onClick={() => setSort('new')}
            className={cn(
              'rounded-full px-2.5 py-1',
              sort === 'new' ? 'bg-leaf-100 text-leaf-800' : 'text-ink-700/70 hover:bg-leaf-50'
            )}
          >
            最新
          </button>
        </div>
      </div>

      {/* 评论输入 */}
      <div className="border-b border-leaf-100 p-5">
        {user ? (
          <div className="flex gap-3">
            <Avatar src={user.avatar} alt={user.name} size={36} />
            <div className="flex-1">
              <textarea
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`${user.name},分享你的看法...`}
                className="w-full resize-none rounded-xl border border-leaf-200 bg-white px-3 py-2 text-sm outline-none focus:border-leaf-400 focus:ring-2 focus:ring-leaf-100"
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[11px] text-leaf-700/60">
                  {err ? <span className="text-rose-500">{err}</span> : '请文明评论,理性交流 🌿'}
                </div>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!text.trim() || submitting}
                  className="btn-primary h-8 !px-4 !text-xs"
                >
                  {submitting ? '发送中...' : '发送'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-leaf-50 px-4 py-3 text-sm">
            <span className="text-leaf-700">登录后即可发表评论</span>
            <Link href="/login" className="btn-primary h-8 !px-3 !text-xs">
              登录
            </Link>
          </div>
        )}
      </div>

      <div className="divide-y divide-leaf-100">
        {sorted.length === 0 ? (
          <div className="p-6">
            <Empty icon="💬" title="还没有评论,抢个沙发?" />
          </div>
        ) : (
          sorted.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              liked={!!likedMap[c.id]}
              onLike={() => setLikedMap((m) => ({ ...m, [c.id]: !m[c.id] }))}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  liked,
  onLike,
}: {
  comment: Comment;
  liked: boolean;
  onLike: () => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  return (
    <div className="p-5">
      <div className="flex gap-3">
        <Link href={`/user/${comment.author.id}`}>
          <Avatar src={comment.author.avatar} alt={comment.author.name} size={36} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/user/${comment.author.id}`}
              className="text-sm font-medium text-ink-800 hover:text-leaf-700"
            >
              {comment.author.name}
            </Link>
            <span className="text-[11px] text-leaf-700/60">Lv.{comment.author.level}</span>
            <span className="text-[11px] text-leaf-700/60">· {timeAgo(comment.createdAt)}</span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink-800">
            {comment.content}
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={onLike}
              className={cn(
                'inline-flex items-center gap-1',
                liked ? 'text-rose-500' : 'text-leaf-700/70 hover:text-leaf-700'
              )}
            >
              <Icon name="heart" size={13} fill={liked ? 'currentColor' : 'none'} />
              {formatNumber(comment.likes + (liked ? 1 : 0))}
            </button>
            <button
              type="button"
              onClick={() => setReplyOpen((o) => !o)}
              className="inline-flex items-center gap-1 text-leaf-700/70 hover:text-leaf-700"
            >
              <Icon name="comment" size={13} />
              回复
            </button>
          </div>

          {replyOpen && (
            <div className="mt-3 flex gap-2">
              <input
                placeholder={`回复 @${comment.author.name}...`}
                className="input h-8 !py-1 !text-xs"
              />
              <button type="button" className="btn-primary h-8 !px-3 !text-xs">
                回复
              </button>
              <button
                type="button"
                onClick={() => setReplyOpen(false)}
                className="btn-outline h-8 !px-3 !text-xs"
              >
                取消
              </button>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-2 rounded-lg bg-leaf-50/60 p-3">
              {comment.replies.map((r) => (
                <div key={r.id} className="text-xs">
                  <Link href={`/user/${r.author.id}`} className="font-medium text-leaf-700">
                    {r.author.name}
                  </Link>
                  <span className="ml-1.5 text-leaf-700/60">· {timeAgo(r.createdAt)}</span>
                  <div className="mt-0.5 text-ink-800">{r.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
