'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Comment, Post, SkinItem } from '@/lib/types';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Icon } from '@/components/ui/Icon';
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

export function CommentSection({
  post,
  authorPendants = {}



}: {post: Post;authorPendants?: Record<string, SkinItem>;}) {
  const { user, equip, vip } = useAuth();
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
            <UserAvatar
            src={user.avatar}
            alt={user.name}
            size={42}
            pendant={equip.pendant ?? null}
            isVip={vip.isVip} />

            <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_6ed543e2)}>
              {journalTarget &&
            <JournalEntryCommentTargetBanner
              target={journalTarget}
              onClear={() => setJournalTarget(null)} />

            }
              <PlainCommentComposer
              title={journalTarget ? '引用记录留言' : '评论'}
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

      <div className={cx(styles.r_fa6acbf8, styles.r_1790d566)}>
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
          myBubble={user?.id === c.author.id ? myBubble : null}
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

function CommentItem({
  comment,
  floor,
  liked,
  onLike,
  postId,
  onReplyAdded,
  myBubble,
  authorPendants









}: {comment: Comment;floor: number;liked: boolean;onLike: () => void;postId: string;onReplyAdded: (parentId: string, reply: Comment) => void;myBubble?: SkinItem | null;authorPendants: Record<string, SkinItem>;}) {
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyErr, setReplyErr] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<{id: string;name: string;} | null>(null);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const bubbleMeta = myBubble?.meta as Record<string, unknown> | undefined;
  const bubbleStyle = bubbleMeta ?
  {
    background: bubbleMeta.bg as string | undefined,
    color: bubbleMeta.color as string | undefined
  } :
  undefined;

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

  const openReplyComposer = (target?: {id: string;name: string;}) => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    setReplyTarget(target ?? null);
    setReplyOpen(true);
  };
  const replies = comment.replies ?? [];
  const visibleReplies = repliesExpanded ? replies : replies.slice(0, 3);
  const hiddenRepliesCount = Math.max(0, replies.length - visibleReplies.length);

  return (
    <div className={styles.r_c07e54fd}>
      <div className={cx(styles.r_f3c543ad, styles.r_0c3bc985, styles.r_b6142548)}>
        <CommentAuthorCard
          author={comment.author}
          pendant={authorPendants[comment.author.id] ?? null} />


        <div className={styles.r_7e0b7cdf}>
          <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e)}>
            <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a14daebf, styles.r_6c4cc49e)}>
              <span className={cx(styles.r_61816240, styles.r_e83a7042, styles.r_e7eab4cb)}>
                #{floor} 楼
              </span>
              <span>{formatFullDateTime(comment.createdAt)}</span>
            </div>
            <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77c08e01, styles.r_58284b4e, styles.r_359090c2)}>
              <button
                type="button"
                onClick={() => {
                  if (replyOpen && !replyTarget) {
                    setReplyOpen(false);
                  } else {
                    openReplyComposer();
                  }
                }}
                className={cx(styles.r_f3c543ad, styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_67d66567, styles.r_421ac2be, styles.r_69335b95, styles.r_ceb69a6b, styles.r_5756b7b4, styles.r_9825203a)}
                aria-label="回复"
                aria-expanded={replyOpen}>

                <Icon name="comment" size={13} />
              </button>
              <button
                type="button"
                onClick={onLike}
                className={cn(cx(styles.r_52083e7d, styles.r_d0a52b31, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_421ac2be, styles.r_d5eab218, styles.r_ceb69a6b, styles.r_5756b7b4),

                liked ? styles.r_fa512798 : cx(styles.r_69335b95, styles.r_9825203a)
                )}>

                <Icon name="heart" size={13} fill={liked ? 'currentColor' : 'none'} />
                {formatNumber(comment.likes + (liked ? 1 : 0))}
              </button>
              <CommentMoreMenu
                open={moreOpen}
                onOpenChange={setMoreOpen} />

            </div>
          </div>

          <div
            className={cn(styles.r_50d0d216,

            myBubble && myBubble.slug !== "bubble-default" && cx(styles.r_bb0c4bfc, styles.r_c0980a65, styles.r_a217b4ea, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_438b2237)
            )}
            style={myBubble && myBubble.slug !== "bubble-default" ? bubbleStyle : undefined}>

            {comment.journalEntryRef && <JournalEntryCommentRef refInfo={comment.journalEntryRef} />}
            <RichTextView
              json={comment.contentJson}
              html={comment.content}
              text={comment.contentText}
              size="sm"
              className={"comment-rich-text"} />

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
          <div className={cx(styles.r_eccd13ef, styles.r_6f7e013d, styles.r_a217b4ea, styles.r_52f53b18, styles.r_eb6e8b88)}>
              {visibleReplies.map((r) =>
            <ReplyItem
              key={r.id}
              reply={r}
              pendant={authorPendants[r.author.id] ?? null}
              authorPendants={authorPendants}
              onReplyTarget={openReplyComposer} />

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
      className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_9ef2b581, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_52f53b18, styles.r_7660b450, styles.r_2eba0d65, styles.r_56bf8ae8, styles.r_5aae3db6, styles.r_5756b7b4)}>

      {refInfo.image ?
      <img src={refInfo.image} alt="" className={cx(styles.r_508ebf85, styles.r_e7e37107, styles.r_012fbd12, styles.r_421ac2be, styles.r_7d85d0c2)} /> :

      <span className={cx(styles.r_f3c543ad, styles.r_508ebf85, styles.r_e7e37107, styles.r_012fbd12, styles.r_67d66567, styles.r_421ac2be, styles.r_5e10cdb8, styles.r_5f6a59f1)}>
          <Icon name="plants" size={18} />
        </span>
      }
      <span className={styles.r_7e0b7cdf}>
        <span className={cx(styles.r_0214b4b3, styles.r_359090c2, styles.r_e83a7042, styles.r_e7eab4cb)}>
          引用记录：{refInfo.dateLabel} · {refInfo.stageLabel}
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
  pendant,
  authorPendants,
  onReplyTarget





}: {reply: Comment;pendant?: SkinItem | null;authorPendants: Record<string, SkinItem>;onReplyTarget: (target: {id: string;name: string;}) => void;}) {
  const childReplies = reply.replies ?? [];

  return (
    <article className={cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2)}>
      <Link href={`/user/${reply.author.id}`}>
        <UserAvatar
          src={reply.author.avatar}
          alt={reply.author.name}
          size={30}
          pendant={pendant ?? null}
          showFestival={false} />

      </Link>
      <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_60541e1e, styles.r_8ef2268e, styles.r_77a2a20e)}>
          <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e)}>
            <Link href={`/user/${reply.author.id}`} className={cx(styles.r_2689f395, styles.r_5f6a59f1)}>
              {reply.author.name}
            </Link>
            <span className={styles.r_6c4cc49e}>Lv.{reply.author.level}</span>
            <span className={styles.r_6c4cc49e}>{formatNumber(reply.author.posts)} 帖</span>
            <CommentBadges badges={reply.author.badges} compact />
          </div>
          <span className={cx(styles.r_60fbb771, styles.r_012fbd12, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_6c4cc49e)}>
            <span>{formatFullDateTime(reply.createdAt)}</span>
            <button
              type="button"
              onClick={() => onReplyTarget({ id: reply.id, name: reply.author.name })}
              className={cx(styles.r_52083e7d, styles.r_f6fe9024, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_421ac2be, styles.r_d5eab218, styles.r_69335b95, styles.r_ceb69a6b, styles.r_5756b7b4, styles.r_9825203a)}>

              <Icon name="comment" size={12} />
              回复
            </button>
          </span>
        </div>
        <RichTextView
          json={reply.contentJson}
          html={reply.content}
          text={reply.contentText}
          size="sm"
          className={cx("comment-rich-text", styles.r_15e1b1f4)} />

        {childReplies.length > 0 &&
        <div className={cx(styles.r_50d0d216, styles.r_6f7e013d, styles.r_d4f78465, styles.r_88b684d2, styles.r_81976f3f)}>
            {childReplies.map((child) =>
          <ReplyItem
            key={child.id}
            reply={child}
            pendant={authorPendants[child.author.id] ?? null}
            authorPendants={authorPendants}
            onReplyTarget={onReplyTarget} />

          )}
          </div>
        }
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
        className={cx(styles.r_52083e7d, styles.r_d0a52b31, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_421ac2be, styles.r_d5eab218, styles.r_66a36c90, styles.r_ceb69a6b, styles.r_9cab05a6, styles.r_3364420b)}
        title="更多"
        aria-label="更多"
        aria-haspopup="menu"
        aria-expanded={open}>

        <Icon name="menu" size={13} />
        更多
      </button>

      {open &&
      <div role="menu" className={cx(styles.r_da4dbfbc, styles.r_d8cdcad2, styles.r_5e8a03e0, styles.r_181b2866, styles.r_f46b61a9)}>
          <div className={cx(styles.r_d89972fe, styles.r_69da7e4f, styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_660d2eff, styles.r_a739868a)}>
            <div className={cx(styles.r_da4dbfbc, styles.r_b770696a, styles.r_7b2d6393, styles.r_6a60c09e, styles.r_9cea0567, styles.r_c74901da, styles.r_d4f78465, styles.r_b950dda2, styles.r_88b684d2, styles.r_5e10cdb8)} />
            <button
            type="button"
            role="menuitem"
            onClick={close}
            className={cx(styles.r_0214b4b3, styles.r_6da6a3c3, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_ca6bf630, styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f, styles.r_5756b7b4)}>

              举报
            </button>
            <div className={cx(styles.r_7bd3b5ea, styles.r_b950dda2, styles.r_5ff6a729)} />
            <button
            type="button"
            role="menuitem"
            onClick={close}
            className={cx(styles.r_0214b4b3, styles.r_6da6a3c3, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_ca6bf630, styles.r_359090c2, styles.r_2689f395, styles.r_595fceba, styles.r_85cfcc24)}>

              删除
            </button>
          </div>
        </div>
      }
    </div>);

}

function CommentAuthorCard({
  author,
  pendant



}: {author: Comment['author'];pendant?: SkinItem | null;}) {
  return (
    <aside className={cx(styles.r_a217b4ea, styles.r_52f53b18, styles.r_0e17f2bd, styles.r_1b2d54a3, styles.r_ca6bf630)}>
      <Link href={`/user/${author.id}`} className={styles.r_52083e7d}>
        <UserAvatar
          src={author.avatar}
          alt={author.name}
          size={54}
          pendant={pendant ?? null} />

      </Link>
      <Link
        href={`/user/${author.id}`}
        className={cx(styles.r_50d0d216, styles.r_0214b4b3, styles.r_f283ea9b, styles.r_fc7473ca, styles.r_e83a7042, styles.r_4ddaa618, styles.r_81be6435)}
        title={author.name}>

        {author.name}
      </Link>
      <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_58284b4e, styles.r_d058ca6d, styles.r_7b89cd85)}>
        <span>Lv.{author.level}</span>
        <span>·</span>
        <span>{formatNumber(author.posts)} 帖</span>
      </div>
      <CommentBadges badges={author.badges} />
    </aside>);

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

function formatFullDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}