'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Comment, Post, SkinItem } from '@/lib/types';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { timeAgo, formatNumber, cn } from '@/lib/utils';
import { Empty } from '@/components/ui/Empty';
import { api, ApiError } from '@/lib/client-api';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { RichTextView } from '@/components/richtext/RichTextView';

type SortKey = 'new' | 'hot';

export function CommentSection({
  post,
  authorPendants = {},
}: {
  post: Post;
  authorPendants?: Record<string, SkinItem>;
}) {
  const { user, equip, vip } = useAuth();
  const { t } = useI18n();
  const [contentJson, setContentJson] = useState<unknown>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [sort, setSort] = useState<SortKey>('new');
  const [comments, setComments] = useState<Comment[]>(post.commentList ?? []);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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
    if (!user || isContentEmpty()) return;
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
    <div id="comments" className="scroll-mt-20 overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-leaf-100 px-5 py-4">
        <div className="text-base font-bold text-ink-950">
          {t('detail.post.commentsAll')} <span className="ml-1 text-leaf-700/70">({comments.length})</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-leaf-50 p-1 text-xs">
          <button
            type="button"
            onClick={() => setSort('hot')}
            className={cn(
              'rounded-full px-3 py-1 font-medium transition',
              sort === 'hot' ? 'bg-white text-leaf-800 shadow-sm' : 'text-ink-500 hover:text-leaf-800'
            )}
          >
            {t('detail.post.commentsHot')}
          </button>
          <button
            type="button"
            onClick={() => setSort('new')}
            className={cn(
              'rounded-full px-3 py-1 font-medium transition',
              sort === 'new' ? 'bg-white text-leaf-800 shadow-sm' : 'text-ink-500 hover:text-leaf-800'
            )}
          >
            {t('detail.post.commentsLatest')}
          </button>
        </div>
      </div>

      <div className="border-b border-leaf-100 bg-leaf-50/30 p-5">
        {user ? (
          <div className="flex gap-3">
            <UserAvatar
              src={user.avatar}
              alt={user.name}
              size={42}
              pendant={equip.pendant ?? null}
              isVip={vip.isVip}
            />
            <div className="min-w-0 flex-1">
              <RichTextEditor
                key={draftKey}
                value={contentJson ?? undefined}
                onChange={setContentJson}
                placeholder={t('detail.post.commentPlaceholderTpl', { name: user.name })}
                minHeight={80}
                charLimit={2000}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
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
          <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm">
            <span className="text-leaf-700">{t('detail.post.commentLoginCta')}</span>
            <Link href="/login" className="btn-primary h-8 !px-3 !text-xs">
              {t('nav.login')}
            </Link>
          </div>
        )}
      </div>

      <div className="divide-y divide-leaf-100">
        {sorted.length === 0 ? (
          <div className="p-8">
            <Empty title={t('detail.post.commentsEmpty')} />
          </div>
        ) : (
          sorted.map((c, index) => (
            <CommentItem
              key={c.id}
              comment={c}
              floor={index + 1}
              liked={!!likedMap[c.id]}
              onLike={() => setLikedMap((m) => ({ ...m, [c.id]: !m[c.id] }))}
              myBubble={user?.id === c.author.id ? myBubble : null}
              authorPendants={authorPendants}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  floor,
  liked,
  onLike,
  myBubble,
  authorPendants,
}: {
  comment: Comment;
  floor: number;
  liked: boolean;
  onLike: () => void;
  myBubble?: SkinItem | null;
  authorPendants: Record<string, SkinItem>;
}) {
  const { t } = useI18n();
  const [replyOpen, setReplyOpen] = useState(false);
  const bubbleMeta = myBubble?.meta as Record<string, unknown> | undefined;
  const bubbleStyle = bubbleMeta
    ? {
        background: bubbleMeta.bg as string | undefined,
        color: bubbleMeta.color as string | undefined,
      }
    : undefined;

  return (
    <div className="p-5">
      <div className="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
        <CommentAuthorCard
          author={comment.author}
          pendant={authorPendants[comment.author.id] ?? null}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-leaf-700/60">
              <span className="rounded-full bg-leaf-50 px-2 py-0.5 font-semibold text-leaf-800">
                #{floor} 楼
              </span>
              <span>Lv.{comment.author.level}</span>
              <span>{formatNumber(comment.author.posts)} 帖</span>
              <span>{timeAgo(comment.createdAt)}</span>
            </div>
            <CommentBadges badges={comment.author.badges} compact />
          </div>

          <div
            className={cn(
              'mt-2',
              myBubble && myBubble.slug !== 'bubble-default' && 'inline-block max-w-full rounded-xl px-3 py-2 shadow-sm'
            )}
            style={myBubble && myBubble.slug !== 'bubble-default' ? bubbleStyle : undefined}
          >
            <RichTextView
              json={comment.contentJson}
              html={comment.content}
              text={comment.contentText}
              size="sm"
              className="comment-rich-text"
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
            <div className="mt-3 space-y-2 rounded-xl bg-leaf-50/70 p-3">
              {comment.replies.map((r) => (
                <ReplyItem
                  key={r.id}
                  reply={r}
                  pendant={authorPendants[r.author.id] ?? null}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplyItem({
  reply,
  pendant,
}: {
  reply: Comment;
  pendant?: SkinItem | null;
}) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 text-xs">
      <Link href={`/user/${reply.author.id}`}>
        <UserAvatar
          src={reply.author.avatar}
          alt={reply.author.name}
          size={30}
          pendant={pendant ?? null}
          showFestival={false}
        />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={`/user/${reply.author.id}`} className="font-medium text-leaf-700">
            {reply.author.name}
          </Link>
          <span className="text-leaf-700/60">Lv.{reply.author.level}</span>
          <span className="text-leaf-700/60">{formatNumber(reply.author.posts)} 帖</span>
          <span className="text-leaf-700/60">{timeAgo(reply.createdAt)}</span>
          <CommentBadges badges={reply.author.badges} compact />
        </div>
        <RichTextView
          json={reply.contentJson}
          html={reply.content}
          text={reply.contentText}
          size="sm"
          className="comment-rich-text mt-0.5"
        />
      </div>
    </div>
  );
}

function CommentAuthorCard({
  author,
  pendant,
}: {
  author: Comment['author'];
  pendant?: SkinItem | null;
}) {
  return (
    <aside className="rounded-xl bg-leaf-50/70 px-3 py-3 text-center">
      <Link href={`/user/${author.id}`} className="inline-flex">
        <UserAvatar
          src={author.avatar}
          alt={author.name}
          size={54}
          pendant={pendant ?? null}
        />
      </Link>
      <Link
        href={`/user/${author.id}`}
        className="mt-2 block truncate text-sm font-semibold text-ink-900 hover:text-leaf-800"
        title={author.name}
      >
        {author.name}
      </Link>
      <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-ink-500">
        <span>Lv.{author.level}</span>
        <span>·</span>
        <span>{formatNumber(author.posts)} 帖</span>
      </div>
      <CommentBadges badges={author.badges} />
    </aside>
  );
}

function CommentBadges({
  badges,
  compact = false,
}: {
  badges: Comment['author']['badges'];
  compact?: boolean;
}) {
  const visible = badges.filter((badge) => badge.obtained).slice(0, compact ? 2 : 3);
  if (visible.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap justify-center gap-1', compact ? 'max-w-full' : 'mt-2')}>
      {visible.map((badge) => (
        <span
          key={badge.id}
          title={badge.name}
          className={cn(
            'inline-grid place-items-center rounded-full border border-leaf-100 bg-white text-[11px] shadow-sm',
            compact ? 'h-5 w-5' : 'h-6 w-6'
          )}
        >
          {badge.icon}
        </span>
      ))}
    </div>
  );
}
