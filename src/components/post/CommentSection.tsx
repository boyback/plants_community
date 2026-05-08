'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Comment, Post, SkinItem } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { UserName } from '@/components/ui/UserName';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { timeAgo, formatNumber, cn } from '@/lib/utils';
import { Empty } from '@/components/ui/Empty';
import { api, ApiError } from '@/lib/client-api';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { RichTextView } from '@/components/richtext/RichTextView';

type SortKey = 'new' | 'hot';

export function CommentSection({ post }: { post: Post }) {
  const { user, equip, vip } = useAuth();
  const { t } = useI18n();
  const [contentJson, setContentJson] = useState<unknown>(null);
  const [draftKey, setDraftKey] = useState(0); // 用 key 重置编辑器
  const [sort, setSort] = useState<SortKey>('new');
  const [comments, setComments] = useState<Comment[]>(post.commentList ?? []);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 当前用户的气泡(自己评论自己用 — 仅装饰)
  const myBubble = equip.bubble ?? null;

  const sorted = useMemo(() => {
    const arr = [...comments];
    if (sort === 'new') {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      arr.sort((a, b) => b.likes - a.likes);
    }
    return arr;
  }, [comments, sort]);

  const isContentEmpty = () => {
    const j = contentJson as { content?: unknown[] } | null;
    return !j || !Array.isArray(j.content) || j.content.length === 0;
  };

  const submit = async () => {
    if (!user) return;
    if (isContentEmpty()) return;
    setSubmitting(true);
    setErr(null);
    try {
      const c = await api.post<Comment>(`/api/posts/${post.id}/comments`, {
        contentJson,
      });
      setComments((prev) => [c, ...prev]);
      setContentJson(null);
      setDraftKey((k) => k + 1);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('detail.post.commentSendFail'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="comments" className="card overflow-hidden scroll-mt-20">
      <div className="flex items-center justify-between border-b border-leaf-100 px-5 py-3">
        <div className="text-sm font-semibold">
          {t('detail.post.commentsAll')} <span className="ml-1 text-leaf-700/70">{comments.length}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setSort('hot')}
            className={cn(
              'rounded-full px-2.5 py-1',
              sort === 'hot' ? 'bg-leaf-100 text-leaf-800' : 'text-ink-700/70 hover:bg-leaf-50'
            )}
          >
            {t('detail.post.commentsHot')}
          </button>
          <button
            onClick={() => setSort('new')}
            className={cn(
              'rounded-full px-2.5 py-1',
              sort === 'new' ? 'bg-leaf-100 text-leaf-800' : 'text-ink-700/70 hover:bg-leaf-50'
            )}
          >
            {t('detail.post.commentsLatest')}
          </button>
        </div>
      </div>

      {/* 评论输入 */}
      <div className="border-b border-leaf-100 p-5">
        {user ? (
          <div className="flex gap-3">
            <Avatar src={user.avatar} alt={user.name} size={36} />
            <div className="flex-1 min-w-0">
              <RichTextEditor
                key={draftKey}
                value={contentJson ?? undefined}
                onChange={setContentJson}
                placeholder={t('detail.post.commentPlaceholderTpl', { name: user.name })}
                minHeight={80}
                charLimit={2000}
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-[11px] text-leaf-700/60">
                  {err ? <span className="text-rose-500">{err}</span> : t('detail.post.commentEtiquette')}
                </div>
                <button
                  type="button"
                  onClick={submit}
                  disabled={isContentEmpty() || submitting}
                  className="btn-primary h-8 !px-4 !text-xs"
                >
                  {submitting ? t('detail.post.commentSending') : t('detail.post.commentSend')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-leaf-50 px-4 py-3 text-sm">
            <span className="text-leaf-700">{t('detail.post.commentLoginCta')}</span>
            <Link href="/login" className="btn-primary h-8 !px-3 !text-xs">
              {t('nav.login')}
            </Link>
          </div>
        )}
      </div>

      <div className="divide-y divide-leaf-100">
        {sorted.length === 0 ? (
          <div className="p-6">
            <Empty icon="💬" title={t('detail.post.commentsEmpty')} />
          </div>
        ) : (
          sorted.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              liked={!!likedMap[c.id]}
              onLike={() => setLikedMap((m) => ({ ...m, [c.id]: !m[c.id] }))}
              myBubble={user?.id === c.author.id ? myBubble : null}
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
  myBubble,
}: {
  comment: Comment;
  liked: boolean;
  onLike: () => void;
  myBubble?: SkinItem | null;
}) {
  const { t } = useI18n();
  const [replyOpen, setReplyOpen] = useState(false);
  // 气泡样式
  const bubbleMeta = myBubble?.meta as Record<string, unknown> | undefined;
  const bubbleStyle = bubbleMeta
    ? {
        background: bubbleMeta.bg as string | undefined,
        color: bubbleMeta.color as string | undefined,
      }
    : undefined;

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
          <div
            className={cn(
              'mt-1.5',
              myBubble && myBubble.slug !== 'bubble-default' && 'inline-block max-w-full rounded-2xl px-3 py-2 shadow-sm'
            )}
            style={myBubble && myBubble.slug !== 'bubble-default' ? bubbleStyle : undefined}
          >
            <RichTextView
              json={comment.contentJson}
              html={comment.content}
              text={comment.contentText}
              size="sm"
            />
          </div>
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
              {t('detail.post.reply')}
            </button>
          </div>

          {replyOpen && (
            <div className="mt-3 flex gap-2">
              <input
                placeholder={t('detail.post.replyTo', { name: comment.author.name })}
                className="input h-8 !py-1 !text-xs"
              />
              <button type="button" className="btn-primary h-8 !px-3 !text-xs">
                {t('detail.post.reply')}
              </button>
              <button
                type="button"
                onClick={() => setReplyOpen(false)}
                className="btn-outline h-8 !px-3 !text-xs"
              >
                {t('detail.post.cancel')}
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
                  <RichTextView
                    json={r.contentJson}
                    html={r.content}
                    text={r.contentText}
                    size="sm"
                    className="mt-0.5"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
