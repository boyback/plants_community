'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { TopicTag } from '@/components/ui/TopicTag';
import { Tooltip } from '@/components/ui/Tooltip';
import { STAGE_META } from '@/lib/journal';
import { formatNumber, formatDateTime, timeAgo, cn, boardUrl } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/Toast';
import { PostAdminActions } from '@/components/post/PostAdminActions';

/**
 * 推荐流/板块列表的帖子卡片
 * 根据 layout 展示不同样式:
 * - 'feed' 带封面图的主卡片(默认)
 * - 'compact' 简洁横向卡片
 */
export function PostCard({
  post,
  layout = 'feed',
  className,
  onVoteUpdate,
}: {
  post: Post;
  layout?: 'feed' | 'compact';
  className?: string;
  onVoteUpdate?: (postId: string, options: { id: string; label: string; votes: number }[], total: number, voted: boolean, votedOptionIds: string[]) => void;
}) {
  if (layout === 'compact') {
    return <CompactCard post={post} className={className} />;
  }
  return <FeedCard post={post} className={className} onVoteUpdate={onVoteUpdate} />;
}

/**
 * Feed 主卡片
 *
 * 设计原则:
 * - **整张卡片是一个 Link**,任何位置点击都进 `/post/:id`
 * - 类型相关的预览块(投票/活动/时间线 / short)在卡内**纯展示**,不做交互
 *   (避免列表里出现要按钮但点完又要跳转的体验割裂)
 * - 时间线(journal)只展示前 3 条,后面用「…」蒙层暗示「还有更多去详情看」
 *
 * 嵌套 Link(作者头像、species chip)用 `stopPropagation` 让它们生效但不触发卡片跳转
 */
function FeedCard({ post, className, onVoteUpdate }: { post: Post; className?: string; onVoteUpdate?: (postId: string, options: { id: string; label: string; votes: number }[], total: number, voted: boolean, votedOptionIds: string[]) => void }) {
  const { user } = useAuth();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const cover = post.cover ?? post.images?.[0];

  // 管理员权限判断
  const isAuthor = user?.id === post.author.id;
  const isSuperAdmin = user?.isSuperAdmin === true;
  const isModerator = user?.role === 'moderator';
  const isAdmin = user?.role === 'admin';
  const canEdit = isAuthor;
  const canDelete = isAuthor || isModerator || isAdmin || isSuperAdmin;
  const canMove = isModerator || isAdmin || isSuperAdmin;
  const canPin = isModerator || isAdmin || isSuperAdmin;
  const canLock = isModerator || isAdmin || isSuperAdmin;
  const canBan = isSuperAdmin && !isAuthor;

  const handlePin = async () => {
    if (!confirm(post.pinned ? '确定取消置顶？' : '确定置顶？')) return;
    const res = await fetch(`/api/posts/${post.id}/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: post.pinned ? 'unpin' : 'pin' }),
    });
    if (res.ok) globalThis.location.reload();
  };

  const handleBanUser = async () => {
    const reason = prompt('请输入封禁原因：');
    if (!reason) return;
    const days = prompt('封禁天数：', '7');
    if (!days) return;
    const res = await fetch(`/api/posts/${post.id}/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ban_user', userId: post.author.id, reason, duration: Number(days) }),
    });
    if (res.ok) globalThis.location.reload();
  };

  const showAdminMenu = canEdit || canDelete || canMove || canPin || canLock || canBan;

  return (
    <Link
      href={`/post/${post.id}`}
      className={cn(
        'card group block transition-shadow hover:shadow-lg',
        className
      )}
    >
      {cover ? (
        <div className="relative">
          <CoverImage
            src={cover}
            alt={post.title}
            showVideoIcon={post.type === 'video'}
            typeBadge={<PostTypeBadge type={post.type} />}
          />
          {showAdminMenu && (
            <div className="absolute top-2 right-2 z-10">
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setAdminMenuOpen(true)}
                  onMouseLeave={() => setAdminMenuOpen(false)}
                  className="grid h-7 w-7 place-items-center rounded-none text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition-colors"
                  title="管理"
                >
                  <Icon name="settings" size={16} />
                </button>
                {adminMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 pt-2"
                    onMouseEnter={() => setAdminMenuOpen(true)}
                    onMouseLeave={() => setAdminMenuOpen(false)}
                  >
                    <div className="relative w-20 rounded-none border border-leaf-100 bg-white shadow-xl py-1">
                      <div className="absolute right-2 -top-[5px] w-2.5 h-2.5 bg-white border-l border-t border-leaf-100 transform rotate-45" />
                      {/* 作者：编辑 */}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toast.error('该类型帖子不支持编辑\n投票/活动/成长日记/求助类型涉及报名、投票、记录、悬赏等数据,不允许后续修改。');
                            if (['vote', 'event', 'journal', 'help'].includes(post.type)) {
                              return;
                            }
                            // globalThis.location.href = `/post/${post.id}/edit`;
                            setAdminMenuOpen(false);
                          }}
                          className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                        >
                          编辑111111
                        </button>
                      )}
                      {canMove && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toast.error('移贴功能开发中');
                            setAdminMenuOpen(false);
                          }}
                          className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                        >
                          移贴
                        </button>
                      )}
                      {canPin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePin();
                            setAdminMenuOpen(false);
                          }}
                          className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                        >
                          {post.pinned ? '取消置顶' : '置顶'}
                        </button>
                      )}
                      <PostAdminActions
                        postId={post.id}
                        postTitle={post.title}
                        isLocked={post.locked}
                        canLock={canLock}
                        canDelete={canDelete}
                      />
                      {canBan && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBanUser();
                            setAdminMenuOpen(false);
                          }}
                          className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                        >
                          封禁用户
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 pt-3 flex items-center justify-between relative">
          <PostTypeBadge type={post.type} />
          {showAdminMenu && (
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setAdminMenuOpen(true)}
                onMouseLeave={() => setAdminMenuOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-none text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition-colors"
                title="管理"
              >
                <Icon name="settings" size={16} />
              </button>
              {adminMenuOpen && (
                <div
                  role="menu"
                  tabIndex={-1}
                  className="absolute right-0 top-full z-50 pt-2"
                  onMouseEnter={() => setAdminMenuOpen(true)}
                  onMouseLeave={() => setAdminMenuOpen(false)}
                >
                  <div className="relative w-20 rounded-none border border-leaf-100 bg-white shadow-xl py-1">
                    <div className="absolute right-2 -top-[5px] w-2.5 h-2.5 bg-white border-l border-t border-leaf-100 transform rotate-45" />
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          globalThis.location.href = `/post/${post.id}/edit`;
                          setAdminMenuOpen(false);
                        }}
                        className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                      >
                        编辑22222
                      </button>
                    )}
                    {canMove && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toast.error('移贴功能开发中');
                          setAdminMenuOpen(false);
                        }}
                        className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                      >
                        移贴
                      </button>
                    )}
                    {canPin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handlePin();
                          setAdminMenuOpen(false);
                        }}
                        className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                      >
                        {post.pinned ? '取消置顶' : '置顶'}
                      </button>
                    )}
                    <PostAdminActions
                      postId={post.id}
                      postTitle={post.title}
                      isLocked={post.locked}
                      canLock={!!canLock}
                      canDelete={!!canDelete}
                    />
                    {canBan && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleBanUser();
                          setAdminMenuOpen(false);
                        }}
                        className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                      >
                        封禁用户
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 p-3">
        {/* 作者 + 时间（最上面一行） */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-ink-500">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar src={post.author.avatar} alt={post.author.name} size={18} />
            <span className="truncate font-medium text-ink-800">{post.author.name}</span>
          </div>
          <span className="shrink-0 text-ink-400">{formatDateTime(post.createdAt)}</span>
        </div>

        {/* 标题 */}
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink-800 group-hover:text-leaf-700 flex-1 min-w-0">
            {post.title}
          </h3>
        </div>

        {/* —— 类型预览块(只展示,不可交互) —— */}
        {/* short / rich / help 都展示纯文本预览;富文本剥 HTML 标签 */}
        {(post.type === 'short' || post.type === 'rich' || post.type === 'help') &&
          (post.contentText || stripHtml(post.content)) && (
            <p className="line-clamp-2 text-xs leading-4 text-ink-700/80">
              {post.contentText || stripHtml(post.content)}
            </p>
          )}

        {post.type === 'vote' && post.vote && <VotePreview post={post} onVoteUpdate={onVoteUpdate} />}

        {post.type === 'event' && post.event && <EventPreview post={post} />}

        {post.type === 'journal' && post.journal && <JournalPreview post={post} />}

        {/* 话题标签（单独一行） */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 overflow-hidden">
            {post.tags.slice(0, 5).map((tag) => (
              <TopicTag
                key={tag}
                tag={tag}
                href={`/topic/${encodeURIComponent(tag)}`}
                size="sm"
              />
            ))}
            {post.tags.length > 5 && (
              <span className="inline-flex items-center text-[10px] text-ink-500/60">+{post.tags.length - 5}</span>
            )}
          </div>
        )}

        {/* 板块 + 统计数据（最下面一行） */}
        <div className="flex items-center justify-between gap-2">
          {post.board && (
            <NestedLink
              href={boardUrl(post.board)}
              className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] text-leaf-700 hover:bg-leaf-100"
            >
              <span className="font-medium">{post.board.name}</span>
            </NestedLink>
          )}
          <div className="flex items-center gap-2 shrink-0 text-[11px] text-ink-500">
            <span className="inline-flex items-center gap-1"><Icon name="eye" size={12} />{formatNumber(post.views)}</span>
            <span className="inline-flex items-center gap-1"><Icon name="comment" size={12} />{formatNumber(post.comments)}</span>
            <span className="inline-flex items-center gap-1"><Icon name="heart" size={12} />{formatNumber(post.likes)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * 封面图组件
 * - 根据图片比例自动适配：
 *   - 横图(宽>高)：保持原比例，最大高度 280px
 *   - 竖图/长图(高>=宽)：使用 aspect-[3/4] 限制高度，避免太长
 */
function CoverImage({
  src,
  alt,
  showVideoIcon,
  typeBadge,
}: {
  src: string;
  alt: string;
  showVideoIcon?: boolean;
  typeBadge?: React.ReactNode;
}) {
  const [naturalW, setNaturalW] = useState<number | null>(null);
  const [naturalH, setNaturalH] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState<number | null>(null);

  // 监听容器宽度
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerW(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerW(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 检测图片类型：横图(宽>高) 还是 特别长的图(高 > 宽*2.5)
  const aspectRatio = naturalW && naturalH ? naturalW / naturalH : null;
  const isLandscape = aspectRatio !== null && aspectRatio > 1;
  // 只有特别长的图片才限制高度
  const isVeryTall = aspectRatio !== null && aspectRatio < 0.4; // 高是宽的2.5倍以上

  // 小图放大 1.5 倍
  const isSmaller = naturalW != null && containerW != null && naturalW < containerW;
  const scaledWidth = isSmaller ? Math.min(naturalW! * 1.5, containerW!) : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full overflow-hidden bg-leaf-50',
        isVeryTall && 'aspect-[3/4]'
      )}
    >
      <div className="grid h-full place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth) setNaturalW(img.naturalWidth);
            if (img.naturalHeight) setNaturalH(img.naturalHeight);
          }}
          className={cn(
            'block object-contain transition-transform duration-500 group-hover:scale-[1.02]',
            isLandscape ? 'max-h-[280px]' : isVeryTall ? 'h-full' : ''
          )}
          style={
            scaledWidth && isLandscape
              ? { width: scaledWidth }
              : { width: '100%' }
          }
        />
      </div>
      {typeBadge && <div className="absolute left-2 top-2">{typeBadge}</div>}
      {showVideoIcon && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white">
            <Icon name="video" size={20} fill="currentColor" />
          </div>
        </div>
      )}
    </div>
  );
}

/** 嵌套 Link:阻止冒泡到外层卡片 */
function NestedLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}

/** 投票预览(只读):展示问题 + 所有选项进度条 + 精确百分比 */
function VotePreview({ post, onVoteUpdate }: { post: Post; onVoteUpdate?: (postId: string, options: { id: string; label: string; votes: number }[], total: number, voted: boolean, votedOptionIds: string[]) => void }) {
  if (!post.vote) return null;
  const total = post.vote.options.reduce((s, o) => s + o.votes, 0);
  const deadlinePassed = new Date(post.vote.deadline).getTime() < Date.now();
  const hasVoted = post.vote.voted;
  const votedOptionIds = post.vote.votedOptionIds ?? [];
  const canVote = !deadlinePassed && !hasVoted;
  const [selectedOptions, setSelectedOptions] = useState<string[]>(hasVoted ? votedOptionIds : []);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSelect = (optionId: string) => {
    if (!canVote) return;
    setSelectedOptions(prev => {
      if (post.vote?.multi) {
        return prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId];
      } else {
        return prev.includes(optionId) ? [] : [optionId];
      }
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    if (selectedOptions.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIds: selectedOptions }),
      });
      const data = await res.json();
      if (!data.ok) {
        const msg = data.error?.message || data.code || '投票失败';
        toast.error(msg);
        setSubmitting(false);
        return;
      }
      toast.success('投票成功');
      onVoteUpdate?.(post.id, data.data.options, data.data.total, true, selectedOptions);
    } catch (err) {
      console.error('投票失败:', err);
      toast.error('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 rounded-none bg-leaf-50/60 p-2" onClick={(e) => e.stopPropagation()}>
      {/* 问题 */}
      <div className="flex items-center gap-2">
        <Link
          href={`/post/${post.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 min-w-0"
        >
          <Tooltip content={post.vote.question} className="max-w-[200px]">
            <div className="line-clamp-1 text-[12px] font-medium text-leaf-800 hover:text-leaf-600 transition-colors">
              🗳️ {post.vote.question}
            </div>
          </Tooltip>
        </Link>
        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] ${deadlinePassed ? 'bg-leaf-100 text-leaf-600' : 'bg-leaf-200 text-leaf-800'}`}>
          {deadlinePassed ? '已截止' : '进行中'}
        </span>
        <span className="shrink-0 text-[10px] text-leaf-600">{post.vote.multi ? '多选' : '单选'}</span>
      </div>

      {/* 选项列表 */}
      <div className="space-y-1.5">
        {post.vote.options.map((o, idx) => {
          // 计算精确百分比：最后一项 = 100 - 其他项之和，保留一位小数
          let pct: number;
          if (total === 0) {
            pct = 0;
          } else if (idx === post.vote!.options.length - 1) {
            const sumBefore = post.vote!.options.slice(0, idx).reduce((s, opt) => s + opt.votes, 0);
            pct = Number(((total - sumBefore) / total * 100).toFixed(1));
          } else {
            pct = Number((o.votes / total * 100).toFixed(1));
          }

          const isSelectable = canVote;
          const isSelected = selectedOptions.includes(o.id);
          return (
            <div
              key={o.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isSelectable) return;
                handleSelect(o.id);
              }}
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => {
                e.stopPropagation();
                if (!isSelectable) return;
                handleSelect(o.id);
              }}
              onTouchMove={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onPointerCancel={(e) => e.stopPropagation()}
              className={cn(
                'relative overflow-hidden rounded px-1 py-1 transition-all',
                isSelectable && 'cursor-pointer hover:bg-leaf-100 hover:shadow-sm active:bg-leaf-200',
                isSelected && 'bg-leaf-200/40', // 选中时用进度条色加透明度
                !isSelectable && !isSelected && 'bg-white/70', !isSelectable && isSelected && 'bg-leaf-200/40'
              )}
            >
              {/* 进度条 */}
              <div
                className="absolute inset-y-0 left-0 bg-leaf-200"
                style={{ width: `${pct}%` }}
              />
              {/* 内容 */}
              <div className="relative flex items-center justify-between gap-1 text-[11px]">
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  <span className="w-[10px] text-center text-leaf-600 font-bold shrink-0">
                    {isSelected ? '✓' : ''}
                  </span>
                  <span className="truncate text-leaf-900">{o.label}</span>
                </div>
                <span className="shrink-0 tabular-nums text-leaf-700">
                  {pct}% <span className="text-leaf-600">({o.votes}票)</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部统计 */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-leaf-700/80">{total} 票</span>
        {canVote && (
          <button
            type="button"
            className="px-3 py-1 rounded bg-leaf-500 text-white text-[10px] font-medium hover:bg-leaf-600 transition-colors disabled:opacity-50"
            disabled={selectedOptions.length === 0 || submitting}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
          >
            {submitting ? '提交中...' : '提交投票'}
          </button>
        )}
        {hasVoted && (
          <span className="px-3 py-1 rounded bg-leaf-200/60 text-leaf-700 text-[10px] font-medium">
            已投票
          </span>
        )}
        {!canVote && !hasVoted && deadlinePassed && (
          <span className="px-3 py-1 rounded bg-leaf-100 text-leaf-600 text-[10px] font-medium">
            已截止
          </span>
        )}
      </div>
    </div>
  );
}

/** 活动预览(只读):位置 + 时间 + 已报名人数 */
function EventPreview({ post }: { post: Post }) {
  if (!post.event) return null;
  return (
    <div className="rounded-none bg-violet-50/80 p-2 text-[11px] text-violet-900">
      <div className="flex items-center gap-1">
        <span>📍</span>
        <span className="truncate">{post.event.location}</span>
      </div>
      <div className="mt-0.5 flex items-center justify-between">
        <span className="text-violet-800/80">
          🕘 {new Date(post.event.startAt).toLocaleDateString()}
        </span>
        <span className="text-violet-700">{post.event.attendees} 人已报名</span>
      </div>
    </div>
  );
}

/**
 * 时间线预览(只读):
 *  - 记录 > 4 条：显示前 3 条 + 倒数第二条 + 中间提示 + 最后 1 条
 *  - 记录 ≤ 4 条：全部显示
 */
function JournalPreview({ post }: { post: Post }) {
  if (!post.journal) return null;
  const j = post.journal;
  const shown = j.entries ?? [];
  const totalCount = j.entriesCount ?? shown.length;

  // 超过 4 条时：前 3 条 + 中间提示 + 最后 1 条
  const showCompact = totalCount > 4;
  const first3 = shown.slice(0, 3);
  const lastEntry = shown[shown.length - 1];
  const middleCount = totalCount - 4;

  return (
    <div className="rounded-none bg-leaf-50/60 p-2">
      <div className="mb-1 flex items-center justify-between text-xs text-leaf-700/80">
        <span className="truncate font-semibold">📖 {j.subjectName}</span>
        <span className="text-[11px]">第 {j.daysSinceStart} 天 · 共 {j.entriesCount} 条</span>
      </div>

      <div className="relative">
        <ol className="space-y-1.5">
          {first3.map((e) => {
            const meta = STAGE_META[e.stage] || STAGE_META.other;
            return (
              <li key={e.id} className="space-y-1">
                <EntryItem entry={e} meta={meta} />
              </li>
            );
          })}

          {/* 中间省略提示 */}
          {showCompact && (
            <li className="pl-4 text-[10px] text-leaf-700/60">
              + {middleCount} 条更多...
            </li>
          )}

          {/* 最后 1 条 */}
          {showCompact && lastEntry && (
            <li key={lastEntry.id} className="space-y-1">
              <EntryItem entry={lastEntry} meta={STAGE_META[lastEntry.stage] || STAGE_META.other} />
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}

/** 单条时间线记录项 */
function EntryItem({ entry, meta }: { entry: any; meta: any }) {
  const d = new Date(entry.entryDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <span className="mt-1 block h-2 w-2 shrink-0 rounded-full bg-leaf-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-medium text-ink-800">{yyyy}/{mm}/{dd}</span>
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] border', meta.color)}>
              {meta.emoji} {meta.zh}
            </span>
          </div>
          {entry.note && (
            <Tooltip content={entry.note}>
              <p className="line-clamp-2 text-xs text-ink-600/80 mt-0.5">{entry.note}</p>
            </Tooltip>
          )}
          {/* 配图展示 - 在描述下面 */}
          {entry.images && entry.images.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {entry.images.slice(0, 3).map((img: string, idx: number) => (
                <div key={idx} className="relative w-8 h-8 overflow-hidden rounded bg-white/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
              {entry.images.length > 3 && (
                <div className="relative w-8 h-8 flex items-center justify-center rounded bg-black/40 text-[10px] text-white">
                  +{entry.images.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n) + '…';
}

function CompactCard({ post, className }: { post: Post; className?: string }) {
  const cover = post.cover ?? post.images?.[0];
  return (
    <Link
      href={`/post/${post.id}`}
      className={cn(
        'card flex items-center gap-3 p-3 transition-shadow hover:shadow-md',
        className
      )}
    >
      {cover && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-none bg-leaf-50">
          <Image src={cover} alt="" fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <PostTypeBadge type={post.type} />
          {post.species ? (
            <SpeciesChip species={post.species} board={post.board} compact />
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] text-leaf-400">—</span>
          )}
        </div>
        <h4 className="truncate text-sm font-medium text-ink-800">{post.title}</h4>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-leaf-700/70">
          <span>{post.author.name}</span>
          <span>·</span>
          <span>{timeAgo(post.createdAt)}</span>
          <span>·</span>
          <span>💬 {post.comments}</span>
        </div>
      </div>
    </Link>
  );
}

/**
 * 品种 chip:🌱 月迷 (28)
 * - 点击进品种页(走 board 路径)
 */
function SpeciesChip({
  species,
  board,
  compact = false,
}: {
  species: NonNullable<Post['species']>;
  board: Post['board'];
  compact?: boolean;
}) {
  return (
    <Link
      href={boardUrl(board)}
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-leaf-50 px-3 py-1 text-leaf-700 transition-colors hover:bg-leaf-100',
        compact ? 'text-[11px]' : 'text-sm'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-sm">🌱</span>
      <span className="font-medium">{species.name}</span>
      {species.ratingCount > 0 && (
        <span className="text-leaf-600/70">({species.ratingCount})</span>
      )}
    </Link>
  );
}

function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
