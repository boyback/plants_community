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
import { PlainCommentComposer } from '@/components/post/PlainCommentComposer';
import { api, ApiError } from '@/lib/client-api';
import { buildCommentContentJson } from '@/lib/comment-content';

interface CommentListProps {
  comments: Comment[];
  postId: string;
  onCommentAdded?: (comment: Comment) => void;
  onReplyAdded?: (commentId: string, reply: Comment) => void;
  compact?: boolean;
}

/**
 * 评论列表组件
 * - 包含评论列表、回复评论功能
 * - 评论输入使用纯文本编辑器
 */
export function CommentList({
  comments,
  postId,
  onReplyAdded,
  compact = false,
}: CommentListProps) {
  const { user, equip } = useAuth();
  const myBubble = user ? (equip.bubble ?? null) : null;

  return (
    <div className={cn(compact ? 'max-h-96 overflow-y-auto' : '')}>
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          postId={postId}
          myBubble={user?.id === comment.author.id ? myBubble : null}
          onReplyAdded={onReplyAdded}
        />
      ))}
    </div>
  );
}

function CommentItem({
  comment,
  postId,
  myBubble,
  onReplyAdded,
}: {
  comment: Comment;
  postId: string;
  myBubble?: SkinItem | null;
  onReplyAdded?: (commentId: string, reply: Comment) => void;
}) {
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string } | null>(null);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
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
  const replies = comment.replies ?? [];
  const visibleReplies = repliesExpanded ? replies : replies.slice(0, 3);
  const hiddenRepliesCount = Math.max(0, replies.length - visibleReplies.length);
  const replyParentId = replyTarget?.id ?? comment.id;

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
                onClick={() => {
                  setReplyTarget(null);
                  setReplyOpen(!replyOpen);
                }}
                className="grid h-7 w-7 place-items-center rounded-md text-leaf-700/70 transition-colors hover:bg-leaf-50 hover:text-leaf-700"
                aria-label="回复"
                aria-expanded={replyOpen}
              >
                <Icon name="comment" size={12} />
              </button>
            </div>

            {/* 回复输入 */}
            <div
              className={cn(
                'grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-200 ease-out',
                replyOpen ? 'mt-2 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0 pointer-events-none'
              )}
              aria-hidden={!replyOpen}
            >
              <div className="min-h-0 overflow-hidden">
                <CommentReplyInput
                  commentId={replyParentId}
                  postId={postId}
                  replyTo={replyTarget?.name ?? comment.author.name}
                  prefixTarget={replyTarget?.name}
                  onSubmit={(reply) => {
                    onReplyAdded?.(replyParentId, reply);
                    setReplyOpen(false);
                    setReplyTarget(null);
                  }}
                />
              </div>
            </div>

            {/* 子回复列表 */}
            {replies.length > 0 && (
              <div className="mt-2 space-y-2 rounded-none bg-leaf-50/60 p-2">
                {visibleReplies.map((r) => (
                  <ReplyItem
                    key={r.id}
                    reply={r}
                    onReply={() => {
                      setReplyTarget({ id: r.id, name: r.author.name });
                      setReplyOpen(true);
                    }}
                  />
                ))}
                {hiddenRepliesCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setRepliesExpanded(true)}
                    className="inline-flex h-7 items-center rounded-md px-2 text-[11px] font-semibold text-leaf-700 transition hover:bg-white hover:text-leaf-900"
                  >
                    展开剩余 {hiddenRepliesCount} 条评论
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReplyItem({ reply, onReply }: { reply: Comment; onReply: () => void }) {
  return (
    <article className="w-full rounded-lg border border-leaf-100 bg-white px-3 py-2 text-[11px]">
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
      <div className="mt-1 flex justify-end">
        <button
          type="button"
          onClick={onReply}
          className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-leaf-700/70 transition-colors hover:bg-leaf-50 hover:text-leaf-700"
        >
          <Icon name="comment" size={12} />
          回复
        </button>
      </div>
    </article>
  );
}

interface CommentReplyInputProps {
  commentId: string;
  postId: string;
  replyTo?: string;
  prefixTarget?: string;
  onSubmit: (reply: Comment) => void;
}

/**
 * 评论回复输入组件（纯文本）
 */
export function CommentReplyInput({ commentId, postId, replyTo, prefixTarget, onSubmit }: CommentReplyInputProps) {
  const [replyText, setReplyText] = useState('');
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async () => {
    const text = replyText.trim();
    if (!text && replyImages.length === 0) return;
    setSubmitting(true);
    setErr(null);
    try {
      const reply = await api.post<Comment>(`/api/posts/${postId}/comments`, {
        contentJson: buildCommentContentJson(text, replyImages),
        parentId: commentId,
      });
      onSubmit(reply);
      setReplyText('');
      setReplyImages([]);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '回复失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PlainCommentComposer
      value={replyText}
      onChange={setReplyText}
      images={replyImages}
      onImagesChange={setReplyImages}
      onSubmit={handleSubmit}
      placeholder={replyTo ? `回复 ${replyTo}...` : '写下你的回复...'}
      submitLabel="发送"
      submitting={submitting}
      error={err}
      maxLength={1000}
      minHeight={96}
      className="mt-2"
    />
  );
}

interface CommentInputProps {
  postId: string;
  onSubmit: (comment: Comment) => void;
}

/**
 * 评论输入组件（纯文本，用于回复帖子）
 */
export function CommentInput({ postId, onSubmit }: CommentInputProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [commentText, setCommentText] = useState('');
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user) return;
    const text = commentText.trim();
    if (!text && commentImages.length === 0) return;
    setSubmitting(true);
    setErr(null);
    try {
      const comment = await api.post<Comment>(`/api/posts/${postId}/comments`, {
        contentJson: buildCommentContentJson(text, commentImages),
      });
      onSubmit(comment);
      setCommentText('');
      setCommentImages([]);
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
      <PlainCommentComposer
        title="评论"
        value={commentText}
        onChange={setCommentText}
        images={commentImages}
        onImagesChange={setCommentImages}
        onSubmit={handleSubmit}
        placeholder="写下你的想法..."
        submitLabel="发送"
        submitting={submitting}
        error={err}
        className="min-w-0 flex-1"
      />
    </div>
  );
}
