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
import { api, ApiError } from '@/lib/client-api';
import { RichTextView } from '@/components/richtext/RichTextView';
import { PlainCommentComposer } from '@/components/post/PlainCommentComposer';
import { buildCommentContentJson } from '@/lib/comment-content';

type SortKey = 'new' | 'hot';
type JournalEntryCommentTarget = NonNullable<Comment['journalEntryRef']>;

export function CommentSection({
  post,
  authorPendants = {},
}: {
  post: Post;
  authorPendants?: Record<string, SkinItem>;
}) {
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
      const detail = (event as CustomEvent<{ postId: string; comment: Comment }>).detail;
      if (!detail || detail.postId !== post.id) return;
      setComments((prev) => prev.some((item) => item.id === detail.comment.id) ? prev : [...prev, detail.comment]);
      setSort('new');
    };
    window.addEventListener('journal-entry-comment-created', handleJournalComment);
    return () => window.removeEventListener('journal-entry-comment-created', handleJournalComment);
  }, [post.id]);

  useEffect(() => {
    const handleTargetSelected = (event: Event) => {
      const detail = (event as CustomEvent<{ postId: string } & JournalEntryCommentTarget>).detail;
      if (!detail || detail.postId !== post.id) return;
      setJournalTarget({
        id: detail.id,
        dateLabel: detail.dateLabel,
        stageLabel: detail.stageLabel,
        note: detail.note,
        image: detail.image,
      });
      setSort('new');
    };
    window.addEventListener('journal-entry-comment-target-selected', handleTargetSelected);
    return () => window.removeEventListener('journal-entry-comment-target-selected', handleTargetSelected);
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
    if (!user || (!text && commentImages.length === 0)) return;
    setSubmitting(true);
    setErr(null);
    try {
      const c = await api.post<Comment>(`/api/posts/${post.id}/comments`, {
        contentJson: buildCommentContentJson(text, commentImages),
        journalEntryId: journalTarget?.id,
      });
      setComments((prev) => [...prev, c]);
      setCommentText('');
      setCommentImages([]);
      setJournalTarget(null);
      if (c.journalEntryRef) {
        window.dispatchEvent(
          new CustomEvent('journal-entry-comment-created', {
            detail: { postId: post.id, entryId: c.journalEntryRef.id, comment: c },
          }),
        );
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('detail.post.commentSendFail'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="comments" className="scroll-mt-20 overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm">
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
            <div className="min-w-0 flex-1 space-y-3">
              {journalTarget && (
                <JournalEntryCommentTargetBanner
                  target={journalTarget}
                  onClear={() => setJournalTarget(null)}
                />
              )}
              <PlainCommentComposer
                title={journalTarget ? '引用成长记录留言' : '评论'}
                value={commentText}
                onChange={setCommentText}
                images={commentImages}
                onImagesChange={setCommentImages}
                onSubmit={submit}
                placeholder={journalTarget ? `留言给 ${journalTarget.stageLabel}...` : '写下你的想法...'}
                submitLabel="发送"
                submitting={submitting}
                error={err}
              />
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
            时间
          </button>
        </div>
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
              postId={post.id}
              onReplyAdded={(parentId, reply) => {
                setComments((prev) => addReplyToCommentTree(prev, parentId, reply));
              }}
              myBubble={user?.id === c.author.id ? myBubble : null}
              authorPendants={authorPendants}
            />
          ))
        )}
      </div>
    </div>
  );
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
  authorPendants,
}: {
  comment: Comment;
  floor: number;
  liked: boolean;
  onLike: () => void;
  postId: string;
  onReplyAdded: (parentId: string, reply: Comment) => void;
  myBubble?: SkinItem | null;
  authorPendants: Record<string, SkinItem>;
}) {
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyErr, setReplyErr] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string } | null>(null);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const bubbleMeta = myBubble?.meta as Record<string, unknown> | undefined;
  const bubbleStyle = bubbleMeta
    ? {
        background: bubbleMeta.bg as string | undefined,
        color: bubbleMeta.color as string | undefined,
      }
    : undefined;

  const submitReply = async () => {
    const text = replyText.trim();
    if (!text && replyImages.length === 0) return;
    setReplySubmitting(true);
    setReplyErr(null);
    try {
      const parentId = replyTarget?.id ?? comment.id;
      const reply = await api.post<Comment>(`/api/posts/${postId}/comments`, {
        contentJson: buildCommentContentJson(text, replyImages),
        parentId,
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

  const openReplyComposer = (target?: { id: string; name: string }) => {
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
    <div className="p-5">
      <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
        <CommentAuthorCard
          author={comment.author}
          pendant={authorPendants[comment.author.id] ?? null}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-leaf-700/60">
              <span className="mr-1 font-semibold text-leaf-800">
                #{floor} 楼
              </span>
              <span>{formatFullDateTime(comment.createdAt)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (replyOpen && !replyTarget) {
                    setReplyOpen(false);
                  } else {
                    openReplyComposer();
                  }
                }}
                className="grid h-7 w-7 place-items-center rounded-md text-leaf-700/70 transition-colors hover:bg-leaf-50 hover:text-leaf-700"
                aria-label="回复"
                aria-expanded={replyOpen}
              >
                <Icon name="comment" size={13} />
              </button>
              <button
                type="button"
                onClick={onLike}
                className={cn(
                  'inline-flex h-7 items-center gap-1 rounded-md px-2 transition-colors hover:bg-leaf-50',
                  liked ? 'text-rose-500' : 'text-leaf-700/70 hover:text-leaf-700'
                )}
              >
                <Icon name="heart" size={13} fill={liked ? 'currentColor' : 'none'} />
                {formatNumber(comment.likes + (liked ? 1 : 0))}
              </button>
              <CommentMoreMenu
                open={moreOpen}
                onOpenChange={setMoreOpen}
              />
            </div>
          </div>

          <div
            className={cn(
              'mt-2',
              myBubble && myBubble.slug !== 'bubble-default' && 'inline-block max-w-full rounded-xl px-3 py-2 shadow-sm'
            )}
            style={myBubble && myBubble.slug !== 'bubble-default' ? bubbleStyle : undefined}
          >
            {comment.journalEntryRef && <JournalEntryCommentRef refInfo={comment.journalEntryRef} />}
            <RichTextView
              json={comment.contentJson}
              html={comment.content}
              text={comment.contentText}
              size="sm"
              className="comment-rich-text"
            />
          </div>

          <div
            className={cn(
              'grid overflow-hidden transition-[grid-template-rows,opacity,margin-top] duration-200 ease-out',
              replyOpen ? 'mt-3 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0 pointer-events-none'
            )}
            aria-hidden={!replyOpen}
          >
            <div className="min-h-0 overflow-hidden">
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
                minHeight={96}
              />
            </div>
          </div>

          {replies.length > 0 && (
            <div className="mt-3 space-y-2 rounded-xl bg-leaf-50/70 p-3">
              {visibleReplies.map((r) => (
                <ReplyItem
                  key={r.id}
                  reply={r}
                  pendant={authorPendants[r.author.id] ?? null}
                  authorPendants={authorPendants}
                  onReplyTarget={openReplyComposer}
                />
              ))}
              {hiddenRepliesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setRepliesExpanded(true)}
                  className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-semibold text-leaf-700 transition hover:bg-white hover:text-leaf-900"
                >
                  展开剩余 {hiddenRepliesCount} 条评论
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function JournalEntryCommentRef({ refInfo }: { refInfo: NonNullable<Comment['journalEntryRef']> }) {
  return (
    <a
      href={`#journal-entry-${refInfo.id}`}
      className="mb-2 flex max-w-xl gap-2 rounded-lg border border-leaf-100 bg-leaf-50/70 p-2 text-left transition hover:border-leaf-200 hover:bg-leaf-50"
    >
      {refInfo.image ? (
        <img src={refInfo.image} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
      ) : (
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-white text-leaf-700">
          <Icon name="plants" size={18} />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-leaf-800">
          引用成长记录：{refInfo.dateLabel} · {refInfo.stageLabel}
        </span>
        {refInfo.note && <span className="mt-0.5 line-clamp-1 block text-[11px] text-ink-500">{refInfo.note}</span>}
      </span>
    </a>
  );
}

function JournalEntryCommentTargetBanner({
  target,
  onClear,
}: {
  target: JournalEntryCommentTarget;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-leaf-100 bg-white p-2 shadow-sm">
      <a href={`#journal-entry-${target.id}`} className="flex min-w-0 flex-1 gap-2">
        {target.image ? (
          <img src={target.image} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-leaf-50 text-leaf-700">
            <Icon name="plants" size={18} />
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-leaf-800">
            正在引用：{target.dateLabel} · {target.stageLabel}
          </span>
          {target.note && <span className="mt-0.5 line-clamp-1 block text-[11px] text-ink-500">{target.note}</span>}
        </span>
      </a>
      <button
        type="button"
        onClick={onClear}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-400 hover:bg-ink-50 hover:text-ink-700"
        aria-label="取消引用"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

function ReplyItem({
  reply,
  pendant,
  authorPendants,
  onReplyTarget,
}: {
  reply: Comment;
  pendant?: SkinItem | null;
  authorPendants: Record<string, SkinItem>;
  onReplyTarget: (target: { id: string; name: string }) => void;
}) {
  const childReplies = reply.replies ?? [];

  return (
    <article className="flex w-full gap-2 rounded-lg border border-leaf-100 bg-white px-3 py-2 text-xs">
      <Link href={`/user/${reply.author.id}`}>
        <UserAvatar
          src={reply.author.avatar}
          alt={reply.author.name}
          size={30}
          pendant={pendant ?? null}
          showFestival={false}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={`/user/${reply.author.id}`} className="font-medium text-leaf-700">
              {reply.author.name}
            </Link>
            <span className="text-leaf-700/60">Lv.{reply.author.level}</span>
            <span className="text-leaf-700/60">{formatNumber(reply.author.posts)} 帖</span>
            <CommentBadges badges={reply.author.badges} compact />
          </div>
          <span className="flex shrink-0 items-center gap-2 text-leaf-700/60">
            <span>{formatFullDateTime(reply.createdAt)}</span>
            <button
              type="button"
              onClick={() => onReplyTarget({ id: reply.id, name: reply.author.name })}
              className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-leaf-700/70 transition-colors hover:bg-leaf-50 hover:text-leaf-700"
            >
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
          className="comment-rich-text mt-0.5"
        />
        {childReplies.length > 0 && (
          <div className="mt-2 space-y-2 border-l border-leaf-100 pl-3">
            {childReplies.map((child) => (
              <ReplyItem
                key={child.id}
                reply={child}
                pendant={authorPendants[child.author.id] ?? null}
                authorPendants={authorPendants}
                onReplyTarget={onReplyTarget}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function CommentMoreMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
      className="relative"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        title="更多"
        aria-label="更多"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="menu" size={13} />
        更多
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 pt-2">
          <div className="relative w-24 rounded-md border border-leaf-100 bg-white py-1 shadow-xl">
            <div className="absolute -top-[6px] right-2 h-3 w-3 rotate-45 border-l border-t border-leaf-100 bg-white" />
            <button
              type="button"
              role="menuitem"
              onClick={close}
              className="block w-full px-3 py-2 text-center text-xs font-medium text-ink-700 hover:bg-leaf-50"
            >
              举报
            </button>
            <div className="my-0.5 border-t border-leaf-50" />
            <button
              type="button"
              role="menuitem"
              onClick={close}
              className="block w-full px-3 py-2 text-center text-xs font-medium text-rose-600 hover:bg-rose-50"
            >
              删除
            </button>
          </div>
        </div>
      )}
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

function formatFullDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
