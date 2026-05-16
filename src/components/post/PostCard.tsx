'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { STAGE_META } from '@/lib/journal';
import { formatNumber, formatDateTime, timeAgo, cn, boardUrl } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

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
}: {
  post: Post;
  layout?: 'feed' | 'compact';
  className?: string;
}) {
  if (layout === 'compact') {
    return <CompactCard post={post} className={className} />;
  }
  return <FeedCard post={post} className={className} />;
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
function FeedCard({ post, className }: { post: Post; className?: string }) {
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

  const handleLock = async () => {
    if (!confirm(post.locked ? '确定解锁？' : '确定锁定？')) return;
    const res = await fetch(`/api/posts/${post.id}/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: post.locked ? 'unlock' : 'lock' }),
    });
    if (res.ok) globalThis.location.reload();
  };

  const handleDelete = async () => {
    if (!confirm('确定删除这篇帖子？')) return;
    const res = await fetch(`/api/posts/${post.id}/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', reason: '管理员删除' }),
    });
    if (res.ok) globalThis.location.href = '/';
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
        // 瀑布流模式:卡片高度由内容决定,不强制等高
        'card group block overflow-hidden transition-shadow hover:shadow-lg',
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
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            globalThis.location.href = `/post/${post.id}/edit`;
                            setAdminMenuOpen(false);
                          }}
                          className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                        >
                          编辑
                        </button>
                      )}
                      {canMove && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert('移贴功能开发中');
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
                            e.stopPropagation();
                            handlePin();
                            setAdminMenuOpen(false);
                          }}
                          className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                        >
                          {post.pinned ? '取消置顶' : '置顶'}
                        </button>
                      )}
                      {canLock && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLock();
                            setAdminMenuOpen(false);
                          }}
                          className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                        >
                          {post.locked ? '解锁' : '锁定'}
                        </button>
                      )}
                      {canBan && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBanUser();
                            setAdminMenuOpen(false);
                          }}
                          className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                        >
                          封禁用户
                        </button>
                      )}
                      {canDelete && <div className="border-t border-leaf-50 my-0.5" />}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                            setAdminMenuOpen(false);
                          }}
                          className="w-full px-2 py-1.5 text-[11px] text-rose-600 hover:bg-rose-50 text-center"
                        >
                          删除
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
                          e.stopPropagation();
                          globalThis.location.href = `/post/${post.id}/edit`;
                          setAdminMenuOpen(false);
                        }}
                        className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                      >
                        编辑
                      </button>
                    )}
                    {canMove && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          alert('移贴功能开发中');
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
                          e.stopPropagation();
                          handlePin();
                          setAdminMenuOpen(false);
                        }}
                        className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                      >
                        {post.pinned ? '取消置顶' : '置顶'}
                      </button>
                    )}
                    {canLock && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLock();
                          setAdminMenuOpen(false);
                        }}
                        className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                      >
                        {post.locked ? '解锁' : '锁定'}
                      </button>
                    )}
                    {canBan && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBanUser();
                          setAdminMenuOpen(false);
                        }}
                        className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
                      >
                        封禁用户
                      </button>
                    )}
                    {canDelete && <div className="border-t border-leaf-50 my-0.5" />}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                          setAdminMenuOpen(false);
                        }}
                        className="w-full px-2 py-1.5 text-[11px] text-rose-600 hover:bg-rose-50 text-center"
                      >
                        删除
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
        <div className="flex items-center justify-between gap-2 text-[9px] text-leaf-700/80">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar src={post.author.avatar} alt={post.author.name} size={16} />
            <span className="truncate font-medium">{post.author.name}</span>
          </div>
          <span className="shrink-0">{formatDateTime(post.createdAt)}</span>
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

        {post.type === 'vote' && post.vote && <VotePreview post={post} />}

        {post.type === 'event' && post.event && <EventPreview post={post} />}

        {post.type === 'journal' && post.journal && <JournalPreview post={post} />}

        {/* 话题标签（单独一行） */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 overflow-hidden">
            {post.tags.slice(0, 5).map((tag) => (
              <NestedLink
                key={tag}
                href={`/topic/${encodeURIComponent(tag)}`}
                className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700 hover:bg-amber-100"
              >
                #{tag}
              </NestedLink>
            ))}
            {post.tags.length > 5 && (
              <span className="inline-flex items-center text-[10px] text-leaf-600/60">+{post.tags.length - 5}</span>
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
          <div className="flex items-center gap-2 shrink-0 text-[9px] text-leaf-700/70">
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

/** 投票预览(只读):展示问题 + top 3 选项进度条 */
function VotePreview({ post }: { post: Post }) {
  if (!post.vote) return null;
  const total = post.vote.options.reduce((s, o) => s + o.votes, 0);
  const top = [...post.vote.options].sort((a, b) => b.votes - a.votes).slice(0, 3);
  return (
    <div className="space-y-1 rounded-none bg-amber-50/60 p-2 text-amber-900">
      <div className="line-clamp-1 text-[11px] font-medium">🗳️ {post.vote.question}</div>
      {top.map((o) => {
        const pct = total ? Math.round((o.votes / total) * 100) : 0;
        return (
          <div
            key={o.id}
            className="relative overflow-hidden rounded bg-white/70 px-1.5 py-0.5 text-[10px]"
          >
            <div
              className="absolute inset-y-0 left-0 bg-amber-200/70"
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex justify-between">
              <span className="truncate">{o.label}</span>
              <span className="ml-2 tabular-nums">{pct}%</span>
            </div>
          </div>
        );
      })}
      <div className="text-[10px] text-amber-700/80">
        {total} 票 ·{' '}
        {new Date(post.vote.deadline).getTime() < Date.now() ? '已截止' : '进行中'}
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
 *  - 显示前 3 条事件(后端 take:3)
 *  - 如果有配图，在心得下面另起一行展示
 *  - 总数 > 3 时底部叠 fade 蒙层 +「+ N 条」提示「点进去看完整时间线」
 */
function JournalPreview({ post }: { post: Post }) {
  if (!post.journal) return null;
  const j = post.journal;
  const shown = j.entries ?? [];
  const restCount = Math.max(0, j.entriesCount - shown.length);
  const hasMore = restCount > 0;

  return (
    <div className="rounded-none bg-emerald-50/60 p-2">
      <div className="mb-1 flex items-center justify-between text-[10px] text-emerald-700/80">
        <span className="truncate">📖 {j.subjectName}</span>
        <span>第 {j.daysSinceStart} 天 · 共 {j.entriesCount} 条</span>
      </div>

      <div className="relative">
        <ol className="space-y-1.5">
          {shown.map((e) => {
            const meta = STAGE_META[e.stage] || STAGE_META.other;
            return (
              <li key={e.id} className="space-y-1">
                <div className="flex items-start gap-1.5">
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]',
                      meta.color.replace('border-', '')
                    )}
                  >
                    {meta.emoji}
                  </span>
                  <div className="min-w-0 flex-1 text-[10px] leading-4">
                    <span className="text-emerald-800/80">
                      {new Date(e.entryDate).toLocaleDateString('zh-CN', {
                        month: 'numeric',
                        day: 'numeric',
                      })}
                    </span>{' '}
                    <span className="text-emerald-900/90">
                      {e.note ? truncate(e.note, 30) : meta.zh}
                    </span>
                  </div>
                </div>
                {/* 配图展示 - 在心得下面另起一行 */}
                {e.images && e.images.length > 0 && (
                  <div className="ml-5 flex flex-wrap gap-1">
                    {e.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="journal-entry-image relative overflow-hidden rounded bg-white/50"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {/* 底部蒙层 + 提示 */}
        {hasMore && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-emerald-50/80 to-transparent"
            />
            <div className="mt-1 text-center text-[10px] text-emerald-700/80">
              ⋯ 点击查看完整记录
            </div>
          </>
        )}
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
            <Link
              href={boardUrl(post.board)}
              className="text-[11px] text-leaf-700 hover:underline"
            >
              {post.board.name}
            </Link>
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
        'inline-flex items-center gap-1 rounded-full bg-leaf-50 px-2 py-0.5 text-leaf-700 transition-colors hover:bg-leaf-100',
        compact ? 'text-[11px]' : 'text-xs'
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <span>🌱</span>
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
