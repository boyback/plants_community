'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Comment, Post, SkinItem } from '@/lib/types';
import { UserIdentity } from '@/components/ui/UserIdentity';
import { UserName } from '@/components/ui/UserName';
import { Icon } from '@/components/ui/Icon';
import { ReactionIcon } from '@/components/skin/ReactionIcon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { formatNumber, cn } from '@/lib/utils';
import { Empty } from '@/components/ui/Empty';
import { api, ApiError } from "@/lib/client-api";
import { RichTextView } from '@/components/richtext/RichTextView';
import { PlainCommentComposer } from '@/components/post/PlainCommentComposer';
import { buildCommentContentJson } from "@/lib/comment-content";
import styles from './CommentSection.module.scss';
import { cx } from '@/lib/style-utils';



type SortKey = 'new' | 'hot';
type JournalEntryCommentTarget = NonNullable<Comment['journalEntryRef']>;
type FlatReply = {
  comment: Comment;
  replyTo?: {
    id: string;
    name: string;
    authorId: string;
  };
};

export function CommentSection({
  post,
  authorPendants = {},
  authorBubbles = {}



}: {post: Post;authorPendants?: Record<string, SkinItem>;authorBubbles?: Record<string, SkinItem>;}) {
  const { user, equip } = useAuth();
  const { t } = useI18n();
  const [commentText, setCommentText] = useState('');
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>('new');
  const [comments, setComments] = useState<Comment[]>(post.commentList ?? []);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [journalTarget, setJournalTarget] = useState<JournalEntryCommentTarget | null>(null);
  const myBubble = equip.bubble ?? null;

  useEffect(() => {
    const handleJournalComment = (event: Event) => {
      const detail = (event as CustomEvent<{postId: string;comment: Comment;}>).detail;
      if (!detail || detail.postId !== post.id) return;
      setComments((prev) => prev.some((item) => item.id === detail.comment.id) ? prev : [...prev, detail.comment]);
      setSort('new');
    };
    window.addEventListener("journal-entry-comment-created", handleJournalComment);
    return () => window.removeEventListener("journal-entry-comment-created", handleJournalComment);
  }, [post.id]);

  useEffect(() => {
    const handleTargetSelected = (event: Event) => {
      const detail = (event as CustomEvent<{postId: string;} & JournalEntryCommentTarget>).detail;
      if (!detail || detail.postId !== post.id) return;
      setJournalTarget({
        id: detail.id,
        dateLabel: detail.dateLabel,
        stageLabel: detail.stageLabel,
        note: detail.note,
        image: detail.image
      });
      setSort('new');
    };
    window.addEventListener("journal-entry-comment-target-selected", handleTargetSelected);
    return () => window.removeEventListener("journal-entry-comment-target-selected", handleTargetSelected);
  }, [post.id]);

  const sorted = useMemo(() => {
    const arr = [...comments];
    if (sort === 'new') {
      arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      arr.sort((a, b) => b.likes - a.likes);
    }
    return arr;
  }, [comments, sort]);

  const submit = async () => {
    const text = commentText.trim();
    if (!user || !text && commentImages.length === 0) return;
    setSubmitting(true);
    setErr(null);
    try {
      const c = await api.post<Comment>(`/api/posts/${post.id}/comments`, {
        contentJson: buildCommentContentJson(text, commentImages),
        journalEntryId: journalTarget?.id
      });
      setComments((prev) => [...prev, c]);
      setCommentText('');
      setCommentImages([]);
      setJournalTarget(null);
      if (c.journalEntryRef) {
        window.dispatchEvent(
          new CustomEvent("journal-entry-comment-created", {
            detail: { postId: post.id, entryId: c.journalEntryRef.id, comment: c }
          })
        );
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('detail.post.commentSendFail'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="comments" className={cx(styles.r_8985588d, styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
      <div className={cx(styles.r_65fdbade, styles.r_88b684d2, styles.r_54720a96, styles.r_c07e54fd)}>
        {user ?
        <div className={cx(styles.r_60fbb771, styles.r_1004c0c3)}>
            <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_6ed543e2)}>
              {journalTarget &&
            <JournalEntryCommentTargetBanner
              target={journalTarget}
              onClear={() => setJournalTarget(null)} />

            }
              <PlainCommentComposer
              title="评论"
              value={commentText}
              onChange={setCommentText}
              images={commentImages}
              onImagesChange={setCommentImages}
              onSubmit={submit}
              placeholder={journalTarget ? `留言给 ${journalTarget.stageLabel}...` : '写下你的想法...'}
              submitLabel="发送"
              submitting={submitting}
              error={err} />

            </div>
          </div> :

        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_a217b4ea, styles.r_5e10cdb8, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca)}>
            <span className={styles.r_5f6a59f1}>{t('detail.post.commentLoginCta')}</span>
            <Link href="/login" className={cx(styles.r_ed8a5df7, styles.r_23b4e5ed, styles.r_dd702538)}>
              {t('nav.login')}
            </Link>
          </div>
        }
      </div>

      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_65fdbade, styles.r_88b684d2, styles.r_d139dd09, styles.r_cb11fec3)}>
        <div className={cx(styles.r_4ee73492, styles.r_69450ef1, styles.r_6d623258)}>
          {t('detail.post.commentsAll')} <span className={cx(styles.r_f58b0257, styles.r_69335b95)}>({comments.length})</span>
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_eb6a3cef, styles.r_359090c2)}>
          <button
            type="button"
            onClick={() => setSort('hot')}
            className={cn(cx(styles.r_ac204c10, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_2689f395, styles.r_56bf8ae8),

            sort === 'hot' ? cx(styles.r_5e10cdb8, styles.r_e7eab4cb, styles.r_438b2237) : cx(styles.r_7b89cd85, styles.r_81be6435)
            )}>

            {t('detail.post.commentsHot')}
          </button>
          <button
            type="button"
            onClick={() => setSort('new')}
            className={cn(cx(styles.r_ac204c10, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_2689f395, styles.r_56bf8ae8),

            sort === 'new' ? cx(styles.r_5e10cdb8, styles.r_e7eab4cb, styles.r_438b2237) : cx(styles.r_7b89cd85, styles.r_81be6435)
            )}>

            时间
          </button>
        </div>
      </div>

      <div>
        {sorted.length === 0 ?
        <div className={styles.r_845f5336}>
            <Empty title={t('detail.post.commentsEmpty')} />
          </div> :

        sorted.map((c, index) =>
        <CommentItem
          key={c.id}
          comment={c}
          floor={index + 1}
          liked={!!likedMap[c.id]}
          onLike={() => setLikedMap((m) => ({ ...m, [c.id]: !m[c.id] }))}
          postId={post.id}
          onReplyAdded={(parentId, reply) => {
            setComments((prev) => addReplyToCommentTree(prev, parentId, reply));
          }}
          myBubble={authorBubbles[c.author.id] ?? (user?.id === c.author.id ? myBubble : null)}
          authorBubbles={authorBubbles}
          authorPendants={authorPendants} />

        )
        }
      </div>
    </div>);

}

function addReplyToCommentTree(comments: Comment[], parentId: string, reply: Comment): Comment[] {
  return comments.map((comment) => {
    if (comment.id === parentId) {
      return { ...comment, replies: [...(comment.replies ?? []), reply] };
    }
    if (!comment.replies?.length) return comment;
    return { ...comment, replies: addReplyToCommentTree(comment.replies, parentId, reply) };
  });
}

function flattenReplies(replies: Comment[], parent?: Comment): FlatReply[] {
  return replies
    .flatMap((reply) => [
      {
        comment: reply,
        replyTo: parent ? { id: parent.id, name: parent.author.name, authorId: parent.author.id } : undefined
      },
      ...flattenReplies(reply.replies ?? [], reply)
    ])
    .sort((a, b) => new Date(a.comment.createdAt).getTime() - new Date(b.comment.createdAt).getTime());
}

function CommentItem({
  comment,
  floor,
  liked,
  onLike,
  postId,
  onReplyAdded,
  myBubble,
  authorBubbles,
  authorPendants









}: {comment: Comment;floor: number;liked: boolean;onLike: () => void;postId: string;onReplyAdded: (parentId: string, reply: Comment) => void;myBubble?: SkinItem | null;authorBubbles: Record<string, SkinItem>;authorPendants: Record<string, SkinItem>;}) {
  const { user, equip } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyErr, setReplyErr] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<{id: string;name: string;authorId?: string;} | null>(null);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const bubbleStyle = getCommentBubbleStyle(myBubble);
  const canReplyComment = user?.id !== comment.author.id;

  const submitReply = async () => {
    const text = replyText.trim();
    if (!text && replyImages.length === 0) return;
    setReplySubmitting(true);
    setReplyErr(null);
    try {
      const parentId = replyTarget?.id ?? comment.id;
      const reply = await api.post<Comment>(`/api/posts/${postId}/comments`, {
        contentJson: buildCommentContentJson(text, replyImages),
        parentId
      });
      onReplyAdded(parentId, reply);
      setReplyText('');
      setReplyImages([]);
      setReplyTarget(null);
      setReplyOpen(false);
    } catch (e) {
      setReplyErr(e instanceof ApiError ? e.message : '回复失败');
    } finally {
      setReplySubmitting(false);
    }
  };

  const openReplyComposer = (target?: {id: string;name: string;authorId?: string;}) => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    if (target?.authorId === user.id || !canReplyComment && !target) return;
    setReplyTarget(target ?? null);
    setReplyOpen(true);
  };
  const replies = flattenReplies(comment.replies ?? []);
  const visibleReplies = repliesExpanded ? replies : replies.slice(0, 3);
  const hiddenRepliesCount = Math.max(0, replies.length - visibleReplies.length);

  return (
    <div id={`comment-${comment.id}`} className={cn(styles.r_c07e54fd, styles.commentItem)}>
      <div className={styles.commentStreamRow}>
        <UserIdentity
          user={{ ...comment.author, equip: { pendant: authorPendants[comment.author.id] ?? null } }}
          size="md"
          showName={false}
          avatarRing={false}
          className={styles.commentStreamAvatar}
        />

        <div className={styles.commentStreamMain}>
          <div className={styles.commentStreamHeader}>
            <div className={styles.commentUserInfo}>
              <div className={styles.commentNameLine}>
                <UserName
                  user={{ ...comment.author, equip: { pendant: authorPendants[comment.author.id] ?? null } }}
                  size="sm"
                  className={styles.commentStreamName}
                />
                <CommentBadges badges={comment.author.badges} compact />
              </div>
              <div className={styles.commentMetaLine}>
                <span className={styles.commentFloor}>#{floor} 楼</span>
                <span>·</span>
                <span>{formatFullDateTime(comment.createdAt)}</span>
                <span>·</span>
                <span>Lv.{comment.author.level}</span>
                <span>·</span>
                <span>{formatNumber(comment.author.posts)} 帖</span>
              </div>
            </div>

            <div className={cn(styles.commentActions, styles.commentStreamActions)}>
              {canReplyComment &&
              <button
                type="button"
                onClick={() => {
                  if (replyOpen && !replyTarget) {
                    setReplyOpen(false);
                  } else {
                    openReplyComposer();
                  }
                }}
                className={styles.commentIconButton}
                aria-label="回复"
                aria-expanded={replyOpen}>

                <Icon name="comment" size={13} />
              </button>
              }
              <button
                type="button"
                onClick={onLike}
                className={cn(styles.commentIconButton, styles.commentLikeButton, liked && styles.commentLiked)}>

                {equip.reaction ? (
                  <ReactionIcon skin={equip.reaction} active={liked} size={13} />
                ) : (
                  <Icon name="heart" size={13} fill={liked ? 'currentColor' : 'none'} />
                )}
                {formatNumber(comment.likes + (liked ? 1 : 0))}
              </button>
              <CommentMoreMenu
                open={moreOpen}
                onOpenChange={setMoreOpen} />
            </div>
          </div>

          {comment.journalEntryRef && <JournalEntryCommentRef refInfo={comment.journalEntryRef} />}

          <div className={styles.commentBodyRow}>
            <RichTextView
              json={comment.contentJson}
              html={comment.content}
              text={comment.contentText}
              size="sm"
              className={cn(
                "comment-rich-text",
                styles.commentContentBubble
              )}
              style={bubbleStyle} />
          </div>

          <div
            className={cn(cx(styles.r_f3c543ad, styles.r_2cd02d11, styles.r_10ac69a1, styles.r_625a4c3f, styles.r_d905a812),

            replyOpen ? cx(styles.r_eccd13ef, styles.r_b6c6acc9, styles.r_3972e98d) : cx(styles.r_23a401b9, styles.r_a4571f14, styles.r_7065497e, styles.r_a4326536)
            )}
            aria-hidden={!replyOpen}>

            <div className={cx(styles.r_fb7302e5, styles.r_2cd02d11)}>
              <PlainCommentComposer
                value={replyText}
                onChange={setReplyText}
                images={replyImages}
                onImagesChange={setReplyImages}
                onSubmit={submitReply}
                placeholder={`回复 ${replyTarget?.name ?? comment.author.name}...`}
                submitLabel="发送"
                submitting={replySubmitting}
                error={replyErr}
                maxLength={1000}
                minHeight={96} />

            </div>
          </div>

          {replies.length > 0 &&
          <div className={styles.commentRepliesPanel}>
              {visibleReplies.map((item) =>
            <ReplyItem
              key={item.comment.id}
              reply={item.comment}
              replyTo={item.replyTo}
              pendant={authorPendants[item.comment.author.id] ?? null}
              bubble={authorBubbles[item.comment.author.id] ?? (user?.id === item.comment.author.id ? equip.bubble ?? null : null)}
              onReplyTarget={openReplyComposer}
            />

            )}
              {hiddenRepliesCount > 0 &&
            <button
              type="button"
              onClick={() => setRepliesExpanded(true)}
              className={cx(styles.r_52083e7d, styles.r_ed8a5df7, styles.r_3960ffc2, styles.r_5f22e64f, styles.r_0e17f2bd, styles.r_359090c2, styles.r_e83a7042, styles.r_5f6a59f1, styles.r_56bf8ae8, styles.r_29687528, styles.r_5eca0425)}>

                  展开剩余 {hiddenRepliesCount} 条评论
                </button>
            }
            </div>
          }
        </div>
      </div>
    </div>);

}

function JournalEntryCommentRef({ refInfo }: {refInfo: NonNullable<Comment['journalEntryRef']>;}) {
  return (
    <a
      href={`#journal-entry-${refInfo.id}`}
      className={cn(cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_9ef2b581, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_52f53b18, styles.r_7660b450, styles.r_2eba0d65, styles.r_56bf8ae8, styles.r_5aae3db6, styles.r_5756b7b4), styles.journalRefCard)}>

      {refInfo.image ?
      <img src={refInfo.image} alt="" className={cx(styles.r_508ebf85, styles.r_e7e37107, styles.r_012fbd12, styles.r_421ac2be, styles.r_7d85d0c2)} /> :

      <span className={cx(styles.r_f3c543ad, styles.r_508ebf85, styles.r_e7e37107, styles.r_012fbd12, styles.r_67d66567, styles.r_421ac2be, styles.r_5e10cdb8, styles.r_5f6a59f1)}>
          <Icon name="plants" size={18} />
        </span>
      }
      <span className={styles.r_7e0b7cdf}>
        <span className={cx(styles.r_0214b4b3, styles.r_359090c2, styles.r_e83a7042, styles.r_e7eab4cb)}>
          引用记录 · {refInfo.dateLabel} · {refInfo.stageLabel}
        </span>
        {refInfo.note && <span className={cx(styles.r_15e1b1f4, styles.r_f50e2015, styles.r_0214b4b3, styles.r_d058ca6d, styles.r_7b89cd85)}>{refInfo.note}</span>}
      </span>
    </a>);

}

function JournalEntryCommentTargetBanner({
  target,
  onClear



}: {target: JournalEntryCommentTarget;onClear: () => void;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_7660b450, styles.r_438b2237)}>
      <a href={`#journal-entry-${target.id}`} className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_77a2a20e)}>
        {target.image ?
        <img src={target.image} alt="" className={cx(styles.r_508ebf85, styles.r_e7e37107, styles.r_012fbd12, styles.r_421ac2be, styles.r_7d85d0c2)} /> :

        <span className={cx(styles.r_f3c543ad, styles.r_508ebf85, styles.r_e7e37107, styles.r_012fbd12, styles.r_67d66567, styles.r_421ac2be, styles.r_7ebecbb6, styles.r_5f6a59f1)}>
            <Icon name="plants" size={18} />
          </span>
        }
        <span className={styles.r_7e0b7cdf}>
          <span className={cx(styles.r_0214b4b3, styles.r_359090c2, styles.r_e83a7042, styles.r_e7eab4cb)}>
            正在引用：{target.dateLabel} · {target.stageLabel}
          </span>
          {target.note && <span className={cx(styles.r_15e1b1f4, styles.r_f50e2015, styles.r_0214b4b3, styles.r_d058ca6d, styles.r_7b89cd85)}>{target.note}</span>}
        </span>
      </a>
      <button
        type="button"
        onClick={onClear}
        className={cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_012fbd12, styles.r_67d66567, styles.r_421ac2be, styles.r_66a36c90, styles.r_5399e21f, styles.r_3364420b)}
        aria-label="取消引用">

        <Icon name="close" size={14} />
      </button>
    </div>);

}

function ReplyItem({
  reply,
  replyTo,
  pendant,
  bubble,
  onReplyTarget





}: {reply: Comment;replyTo?: {id: string;name: string;authorId: string;};pendant?: SkinItem | null;bubble?: SkinItem | null;onReplyTarget: (target: {id: string;name: string;authorId?: string;}) => void;}) {
  const { user } = useAuth();
  const bubbleStyle = getCommentBubbleStyle(bubble);
  const canReply = user?.id !== reply.author.id;

  return (
    <article id={`comment-${reply.id}`} className={styles.replyItem}>
      <div className={cn(styles.commentStreamRow, styles.commentStreamRowCompact)}>
        <UserIdentity
          user={{ ...reply.author, equip: { pendant } }}
          size="sm"
          showName={false}
          avatarRing={false}
          className={styles.commentStreamAvatar}
        />

        <div className={styles.commentStreamMain}>
          <div className={styles.commentStreamHeader}>
            <div className={styles.commentUserInfo}>
              <div className={styles.commentNameLine}>
                <UserName
                  user={{ ...reply.author, equip: { pendant } }}
                  size="xs"
                  className={styles.commentStreamName}
                />
                <CommentBadges badges={reply.author.badges} compact />
              </div>
              <div className={styles.commentMetaLine}>
                <span>{formatFullDateTime(reply.createdAt)}</span>
                <span>·</span>
                <span>Lv.{reply.author.level}</span>
                <span>·</span>
                <span>{formatNumber(reply.author.posts)} 帖</span>
              </div>
            </div>

            <div className={cn(styles.commentActions, styles.commentStreamActions)}>
              {canReply &&
              <button
                type="button"
                onClick={() => onReplyTarget({ id: reply.id, name: reply.author.name, authorId: reply.author.id })}
                className={styles.commentTextButton}>

                <Icon name="comment" size={12} />
                回复
              </button>
              }
            </div>
          </div>

          <div className={styles.commentBodyRow}>
            {replyTo &&
            <span className={styles.replyTargetPrefix}>
              回复 {user?.id === replyTo.authorId ?
              <span>@{replyTo.name}</span> :
              <button type="button" onClick={() => onReplyTarget(replyTo)}>@{replyTo.name}</button>
              }
            </span>
            }
            <RichTextView
              json={reply.contentJson}
              html={reply.content}
              text={reply.contentText}
              size="sm"
              className={cn(
                "comment-rich-text",
                styles.commentContentBubble
              )}
              style={bubbleStyle} />
          </div>
        </div>
      </div>
    </article>);

}

function CommentMoreMenu({
  open,
  onOpenChange



}: {open: boolean;onOpenChange: (open: boolean) => void;}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const close = () => onOpenChange(false);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, onOpenChange]);

  return (
    <div
      ref={menuRef}
      className={styles.r_d89972fe}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}>

      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(cx(styles.r_52083e7d, styles.r_d0a52b31, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_421ac2be, styles.r_66a36c90, styles.r_ceb69a6b, styles.r_9cab05a6, styles.r_3364420b), styles.moreButton)}
        title="更多"
        aria-label="更多"
        aria-haspopup="menu"
        aria-expanded={open}>

        <Icon name="more-horizontal" size={16} strokeWidth={2.8} />
      </button>

      {open &&
      <div role="menu" className={cn(cx(styles.r_da4dbfbc, styles.r_d8cdcad2, styles.r_5e8a03e0, styles.r_181b2866, styles.r_f46b61a9), styles.commentMenuPopover)}>
          <div className={cn(cx(styles.r_d89972fe, styles.r_69da7e4f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_660d2eff, styles.r_a739868a), styles.commentMenuPanel)}>
            <div className={cn(cx(styles.r_da4dbfbc, styles.r_b770696a, styles.r_7b2d6393, styles.r_6a60c09e, styles.r_9cea0567, styles.r_c74901da, styles.r_d4f78465, styles.r_b950dda2, styles.r_88b684d2, styles.r_5e10cdb8), styles.commentMenuArrow)} />
            <button
            type="button"
            role="menuitem"
            onClick={close}
            className={cn(cx(styles.r_0214b4b3, styles.r_6da6a3c3, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_ca6bf630, styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f, styles.r_5756b7b4), styles.commentMenuItem)}>

              举报
            </button>
            <div className={cx(styles.r_7bd3b5ea, styles.r_b950dda2, styles.r_5ff6a729)} />
            <button
            type="button"
            role="menuitem"
            onClick={close}
            className={cn(cx(styles.r_0214b4b3, styles.r_6da6a3c3, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_ca6bf630, styles.r_359090c2, styles.r_2689f395, styles.r_595fceba, styles.r_85cfcc24), styles.commentMenuItem)}>

              删除
            </button>
          </div>
        </div>
      }
    </div>);

}

function CommentBadges({
  badges,
  compact = false



}: {badges: Comment['author']['badges'];compact?: boolean;}) {
  const visible = badges.filter((badge) => badge.obtained).slice(0, compact ? 2 : 3);
  if (visible.length === 0) return null;

  return (
    <div className={cn(cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_86843cf1, styles.r_44ee8ba0), compact ? styles.r_c0980a65 : styles.r_50d0d216)}>
      {visible.map((badge) =>
      <span
        key={badge.id}
        title={badge.name}
        className={cn(cx(styles.r_c5d9aaf6, styles.r_67d66567, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_d058ca6d, styles.r_438b2237),

        compact ? cx(styles.r_cd0d9c51, styles.r_72470489) : cx(styles.r_f6fe9024, styles.r_7ec10f86)
        )}>

          {badge.icon}
        </span>
      )}
    </div>);

}

function getCommentBubbleStyle(bubble?: SkinItem | null): CSSProperties | undefined {
  if (!bubble || bubble.slug === "bubble-default") return undefined;
  const meta = bubble.meta as Record<string, unknown> | undefined;
  const style: CSSProperties & Record<string, string | undefined> = {};
  if (typeof meta?.bg === "string") style["--comment-bubble-bg"] = meta.bg;
  if (typeof meta?.color === "string") style["--comment-bubble-color"] = meta.color;
  return Object.keys(style).length > 0 ? style : undefined;
}

function formatFullDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
