'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Comment, SkinItem } from '@/lib/types';
import { UserIdentity } from '@/components/ui/UserIdentity';
import { Icon } from '@/components/ui/Icon';
import { ReactionIcon } from '@/components/skin/ReactionIcon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { timeAgo, formatNumber, cn } from '@/lib/utils';
import { RichTextView } from '@/components/richtext/RichTextView';
import { PlainCommentComposer } from '@/components/post/PlainCommentComposer';
import { api, ApiError } from "@/lib/client-api";
import { buildCommentContentJson } from "@/lib/comment-content";
import styles from './CommentList.module.scss';
import { cx } from '@/lib/style-utils';



interface CommentListProps {
  comments: Comment[];
  postId: string;
  onCommentAdded?: (comment: Comment) => void;
  onReplyAdded?: (commentId: string, reply: Comment) => void;
  authorBubbles?: Record<string, SkinItem>;
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
  authorBubbles = {},
  compact = false
}: CommentListProps) {
  const { user, equip } = useAuth();
  const myBubble = user ? equip.bubble ?? null : null;

  return (
    <div className={cn(compact ? cx(styles.r_bcb611e1, styles.r_92bf82f4) : '')}>
      {comments.map((comment) =>
      <CommentItem
        key={comment.id}
        comment={comment}
        postId={postId}
        myBubble={authorBubbles[comment.author.id] ?? (user?.id === comment.author.id ? myBubble : null)}
        onReplyAdded={onReplyAdded} />

      )}
    </div>);

}

function CommentItem({
  comment,
  postId,
  myBubble,
  onReplyAdded





}: {comment: Comment;postId: string;myBubble?: SkinItem | null;onReplyAdded?: (commentId: string, reply: Comment) => void;}) {
  const { user, equip } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<{id: string;name: string;} | null>(null);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [liked, setLiked] = useState(false);

  // 气泡样式
  const bubbleMeta = myBubble?.meta;
  const bubbleStyle = bubbleMeta ?
  {
    background: bubbleMeta.bg as string | undefined,
    color: bubbleMeta.color as string | undefined
  } :
  undefined;

  const handleLike = async () => {
    if (!user) return;
    try {
      await api.post(`/api/comments/${comment.id}/like`);
      setLiked(!liked);
    } catch {









      // ignore
    }};const replies = comment.replies ?? [];const visibleReplies = repliesExpanded ? replies : replies.slice(0, 3);const hiddenRepliesCount = Math.max(0, replies.length - visibleReplies.length);const replyParentId = replyTarget?.id ?? comment.id;return <div className={cx(styles.r_65fdbade, styles.r_88b684d2, styles.r_b4cf72cd)}>
      <div className={styles.r_eb6e8b88}>
        <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
          <UserIdentity user={comment.author} size="sm" showName={false} />
          <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
            <div className={cx(styles.r_60fbb771, styles.r_b7012bb2, styles.r_58284b4e)}>
              <UserIdentity user={comment.author} size="xs" showAvatar={false} showLevel />
              <span className={cx(styles.r_1dc571a3, styles.r_6c4cc49e)}>· {timeAgo(comment.createdAt)}</span>
            </div>
            <div
            className={cn(styles.r_b6b02c0e,

            Boolean(myBubble) && styles.commentBubble
            )}
            style={myBubble ? bubbleStyle : undefined}>

              <RichTextView
              json={comment.contentJson}
              html={comment.content}
              text={comment.contentText}
              size="sm" />

            </div>
            <div className={cx(styles.r_aac62f0e, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_d058ca6d)}>
              <button
              type="button"
              onClick={handleLike}
              className={cn(cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0),

              liked ? styles.r_fa512798 : cx(styles.r_69335b95, styles.r_9825203a)
              )}>

                {equip.reaction ? (
                  <ReactionIcon skin={equip.reaction} active={liked} size={12} />
                ) : (
                  <Icon name="heart" size={12} fill={liked ? 'currentColor' : 'none'} />
                )}
                {formatNumber(comment.likes + (liked ? 1 : 0))}
              </button>
              <button
              type="button"
              onClick={() => {
                setReplyTarget(null);
                setReplyOpen(!replyOpen);
              }}
              className={cx(styles.r_f3c543ad, styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_67d66567, styles.r_421ac2be, styles.r_69335b95, styles.r_ceb69a6b, styles.r_5756b7b4, styles.r_9825203a)}
              aria-label="回复"
              aria-expanded={replyOpen}>

                <Icon name="comment" size={12} />
              </button>
            </div>

            {/* 回复输入 */}
            <div
            className={cn(cx(styles.r_f3c543ad, styles.r_2cd02d11, styles.r_10ac69a1, styles.r_625a4c3f, styles.r_d905a812),

            replyOpen ? cx(styles.r_50d0d216, styles.r_b6c6acc9, styles.r_3972e98d) : cx(styles.r_23a401b9, styles.r_a4571f14, styles.r_7065497e, styles.r_a4326536)
            )}
            aria-hidden={!replyOpen}>

              <div className={cx(styles.r_fb7302e5, styles.r_2cd02d11)}>
                <CommentReplyInput
                commentId={replyParentId}
                postId={postId}
                replyTo={replyTarget?.name ?? comment.author.name}
                prefixTarget={replyTarget?.name}
                onSubmit={(reply) => {
                  onReplyAdded?.(replyParentId, reply);
                  setReplyOpen(false);
                  setReplyTarget(null);
                }} />

              </div>
            </div>

            {/* 子回复列表 */}
            {replies.length > 0 &&
          <div className={cx(styles.r_50d0d216, styles.r_6f7e013d, styles.r_0c5e9137, styles.r_a8a62ca4, styles.r_7660b450)}>
                {visibleReplies.map((r) =>
            <ReplyItem
              key={r.id}
              reply={r}
              onReply={() => {
                setReplyTarget({ id: r.id, name: r.author.name });
                setReplyOpen(true);
              }} />

            )}
                {hiddenRepliesCount > 0 &&
            <button
              type="button"
              onClick={() => setRepliesExpanded(true)}
              className={cx(styles.r_52083e7d, styles.r_d0a52b31, styles.r_3960ffc2, styles.r_421ac2be, styles.r_d5eab218, styles.r_d058ca6d, styles.r_e83a7042, styles.r_5f6a59f1, styles.r_56bf8ae8, styles.r_29687528, styles.r_5eca0425)}>

                    展开剩余 {hiddenRepliesCount} 条评论
                  </button>
            }
              </div>
          }
          </div>
        </div>
      </div>
    </div>;

}

function ReplyItem({ reply, onReply }: {reply: Comment;onReply: () => void;}) {
  return (
    <article className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_d058ca6d)}>
      <Link href={`/user/${reply.author.id}`} className={cx(styles.r_2689f395, styles.r_5f6a59f1, styles.r_c67dcce9)}>
        {reply.author.name}
      </Link>
      <span className={cx(styles.r_f58b0257, styles.r_6c4cc49e)}>· {timeAgo(reply.createdAt)}</span>
      <RichTextView
        json={reply.contentJson}
        html={reply.content}
        text={reply.contentText}
        size="sm"
        className={styles.r_15e1b1f4} />

      <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_77c08e01)}>
        <button
          type="button"
          onClick={onReply}
          className={cx(styles.r_52083e7d, styles.r_f6fe9024, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_421ac2be, styles.r_d5eab218, styles.r_69335b95, styles.r_ceb69a6b, styles.r_5756b7b4, styles.r_9825203a)}>

          <Icon name="comment" size={12} />
          回复
        </button>
      </div>
    </article>);

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
        parentId: commentId
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
      className={styles.r_50d0d216} />);


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
        contentJson: buildCommentContentJson(text, commentImages)
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
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_0c5e9137, styles.r_7ebecbb6, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca)}>
        <span className={styles.r_5f6a59f1}>{t('detail.post.commentLoginCta')}</span>
        <Link href="/login" className={cx(styles.r_ed8a5df7, styles.r_23b4e5ed, styles.r_dd702538)}>
          {t('nav.login')}
        </Link>
      </div>);

  }

  return (
    <div className={cx(styles.r_60fbb771, styles.r_1004c0c3)}>
      <UserIdentity user={user} size="sm" asLink={false} showName={false} />
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
        className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)} />

    </div>);

}
