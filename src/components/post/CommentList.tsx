'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Comment, SkinItem } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { timeAgo, formatNumber, cn } from '@/lib/utils';
import { RichTextView } from '@/components/richtext/RichTextView';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { api, ApiError } from '@/lib/client-api';

interface CommentListProps {
  comments: Comment[];
  onCommentAdded?: (comment: Comment) => void;
  onReplyAdded?: (commentId: string, reply: Comment) => void;
  compact?: boolean;
}

/**
 * 评论列表组件
 * - 包含评论列表、回复评论功能
 * - 评论输入使用富文本编辑器
 */
export function CommentList({
  comments,
  onCommentAdded,
  onReplyAdded,
  compact = false,
}: CommentListProps) {
  const { user, equip } = useAuth();
  const { t } = useI18n();
  const myBubble = user ? (equip.bubble ?? null) : null;

  return (
    <div className={cn(compact ? 'max-h-96 overflow-y-auto' : '')}>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          myBubble={user?.id === comment.author.id ? myBubble : null}
          onReplyAdded={onReplyAdded}
        />
      ))}
    </div>
  );
}

function CommentItem({
  comment,
  myBubble,
  onReplyAdded,
}: {
  comment: Comment;
  myBubble?: SkinItem | null;
  onReplyAdded?: (commentId: string, reply: Comment) => void;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [replyOpen, setReplyOpen] = useState(false);
  const [liked, setLiked] = useState(false);

  // 气泡样式
  const bubbleMeta = myBubble?.meta;
  const bubbleStyle = bubbleMeta
    ? {
        background: bubbleMeta.bg as string | undefined,
        color: bubbleMeta.color as string | undefined,
      }
    : undefined;

  const handleLike = async () => {
    if (!user) return;
    try {
      await api.post(`/api/comments/${comment.id}/like`);
      setLiked(!liked);
    } catch {
      // ignore
    }
  };

  return (
    <div className="border-b border-leaf-100 last:border-b-0">
      <div className="p-3">
        <div className="flex gap-2">
          <Link href={`/user/${comment.author.id}`}>
            <Avatar src={comment.author.avatar} alt={comment.author.name} size={32} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <Link
                href={`/user/${comment.author.id}`}
                className="text-xs font-medium text-ink-800 hover:text-leaf-700"
              >
                {comment.author.name}
              </Link>
              <span className="text-[10px] text-leaf-700/60">Lv.{comment.author.level}</span>
              <span className="text-[10px] text-leaf-700/60">· {timeAgo(comment.createdAt)}</span>
            </div>
            <div
              className={cn(
                'mt-1',
                Boolean(myBubble) && 'inline-block max-w-full rounded-none px-2 py-1 shadow-sm'
              )}
              style={myBubble ? bubbleStyle : undefined}
            >
              <RichTextView
                json={comment.contentJson}
                html={comment.content}
                text={comment.contentText}
                size="sm"
              />
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleLike}
                className={cn(
                  'inline-flex items-center gap-1',
                  liked ? 'text-rose-500' : 'text-leaf-700/70 hover:text-leaf-700'
                )}
              >
                <Icon name="heart" size={12} fill={liked ? 'currentColor' : 'none'} />
                {formatNumber(comment.likes + (liked ? 1 : 0))}
              </button>
              <button
                type="button"
                onClick={() => setReplyOpen(!replyOpen)}
                className="inline-flex items-center gap-1 text-leaf-700/70 hover:text-leaf-700"
              >
                <Icon name="comment" size={12} />
                {t('detail.post.reply')}
              </button>
            </div>

            {/* 回复输入 */}
            {replyOpen && (
              <CommentReplyInput
                commentId={comment.id}
                replyTo={comment.author.name}
                onSubmit={(reply) => {
                  onReplyAdded?.(comment.id, reply);
                  setReplyOpen(false);
                }}
                onCancel={() => setReplyOpen(false)}
              />
            )}

            {/* 子回复列表 */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-2 space-y-2 rounded-none bg-leaf-50/60 p-2">
                {comment.replies.map((r) => (
                  <ReplyItem key={r.id} reply={r} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReplyItem({ reply }: { reply: Comment }) {
  const { t } = useI18n();

  return (
    <div className="text-[11px]">
      <Link href={`/user/${reply.author.id}`} className="font-medium text-leaf-700 hover:text-leaf-600">
        {reply.author.name}
      </Link>
      <span className="ml-1 text-leaf-700/60">· {timeAgo(reply.createdAt)}</span>
      <RichTextView
        json={reply.contentJson}
        html={reply.content}
        text={reply.contentText}
        size="sm"
        className="mt-0.5"
      />
    </div>
  );
}

interface CommentReplyInputProps {
  commentId: string;
  replyTo?: string;
  onSubmit: (reply: Comment) => void;
  onCancel: () => void;
}

/**
 * 评论回复输入组件（富文本）
 */
export function CommentReplyInput({ commentId, replyTo, onSubmit, onCancel }: CommentReplyInputProps) {
  const { t } = useI18n();
  const [contentJson, setContentJson] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const isContentEmpty = () => {
    const j = contentJson as { content?: unknown[] } | null;
    return !j || !Array.isArray(j.content) || j.content.length === 0;
  };

  const handleSubmit = async () => {
    if (isContentEmpty()) return;
    setSubmitting(true);
    try {
      const reply = await api.post<Comment>(`/api/comments/${commentId}/replies`, {
        contentJson,
      });
      onSubmit(reply);
      setContentJson(null);
    } catch (e) {
      console.error('回复失败', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 flex gap-2">
      <div className="flex-1">
        <RichTextEditor
          value={contentJson ?? undefined}
          onChange={setContentJson}
          placeholder={replyTo ? `${t('detail.post.replyTo', { name: replyTo })}...` : t('detail.post.commentPlaceholder')}
          minHeight={60}
          charLimit={1000}
        />
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isContentEmpty() || submitting}
          className="btn-primary h-8 !px-3 !text-xs"
        >
          {submitting ? '...' : t('detail.post.reply')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-outline h-8 !px-3 !text-xs"
        >
          {t('detail.post.cancel')}
        </button>
      </div>
    </div>
  );
}

interface CommentInputProps {
  postId: string;
  onSubmit: (comment: Comment) => void;
}

/**
 * 评论输入组件（富文本，用于回复帖子）
 */
export function CommentInput({ postId, onSubmit }: CommentInputProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [contentJson, setContentJson] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isContentEmpty = () => {
    const j = contentJson as { content?: unknown[] } | null;
    return !j || !Array.isArray(j.content) || j.content.length === 0;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (isContentEmpty()) return;
    setSubmitting(true);
    setErr(null);
    try {
      const comment = await api.post<Comment>(`/api/posts/${postId}/comments`, {
        contentJson,
      });
      onSubmit(comment);
      setContentJson(null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('detail.post.commentSendFail'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-between rounded-none bg-leaf-50 px-4 py-3 text-sm">
        <span className="text-leaf-700">{t('detail.post.commentLoginCta')}</span>
        <Link href="/login" className="btn-primary h-8 !px-3 !text-xs">
          {t('nav.login')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Avatar src={user.avatar} alt={user.name} size={36} />
      <div className="flex-1 min-w-0">
        <RichTextEditor
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
            onClick={handleSubmit}
            disabled={isContentEmpty() || submitting}
            className="btn-primary h-8 !px-4 !text-xs"
          >
            {submitting ? t('detail.post.commentSending') : t('detail.post.commentSend')}
          </button>
        </div>
      </div>
    </div>
  );
}
