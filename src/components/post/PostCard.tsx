'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/types';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { TopicTag } from '@/components/ui/TopicTag';
import { formatNumber, formatDateTime, formatFollowers, timeAgo, cn, boardUrl } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { PostAdminMenu } from '@/components/post/PostAdminMenu';
import { PostVotePreview } from '@/components/post/PostVotePreview';
import { PostJournalPreview } from '@/components/post/PostJournalPreview';

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
  onPostChanged,
  onPostDeleted,
}: {
  post: Post;
  layout?: 'feed' | 'compact';
  className?: string;
  onVoteUpdate?: (postId: string, options: { id: string; label: string; votes: number }[], total: number, voted: boolean, votedOptionIds: string[]) => void;
  onPostChanged?: (post: Post) => void;
  onPostDeleted?: (postId: string) => void;
}) {
  const [currentPost, setCurrentPost] = useState(post);
  const [deleted, setDeleted] = useState(false);
  useEffect(() => {
    setCurrentPost(post);
    setDeleted(false);
  }, [post]);
  const handlePostChanged = (updatedPost: Post) => {
    setCurrentPost(updatedPost);
    onPostChanged?.(updatedPost);
  };
  const handlePostDeleted = (postId: string) => {
    if (postId === currentPost.id) setDeleted(true);
    onPostDeleted?.(postId);
  };

  if (deleted) return null;

  if (layout === 'compact') {
    return <CompactCard post={currentPost} className={className} />;
  }
  return <FeedCard post={currentPost} className={className} onVoteUpdate={onVoteUpdate} onPostChanged={handlePostChanged} onPostDeleted={handlePostDeleted} />;
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
function FeedCard({ post, className, onVoteUpdate, onPostChanged, onPostDeleted }: { post: Post; className?: string; onVoteUpdate?: (postId: string, options: { id: string; label: string; votes: number }[], total: number, voted: boolean, votedOptionIds: string[]) => void; onPostChanged?: (post: Post) => void; onPostDeleted?: (postId: string) => void }) {
  const { user } = useAuth();

  const cover = post.cover ?? post.images?.[0];

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
          <div className="absolute right-2 top-2 z-10">
            <PostAdminMenu post={post} user={user} onPostChanged={onPostChanged} onPostDeleted={onPostDeleted} />
          </div>
        </div>
      ) : (
        <div className="px-3 pt-3 flex items-center justify-between relative">
          <PostTypeBadge type={post.type} />
          <PostAdminMenu post={post} user={user} onPostChanged={onPostChanged} onPostDeleted={onPostDeleted} />
        </div>
      )}

      <div className="space-y-2 p-3">
        {/* 作者 + 时间（最上面一行） */}
        <div className="flex items-center justify-between gap-2 text-[11px] text-ink-500">
          <div className="flex items-center gap-2 min-w-0">
            <UserAvatar
              src={post.author.avatar}
              alt={post.author.name}
              size={36}
              pendant={post.author.equip?.pendant ?? null}
              ring={false}
              showFestival={false}
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-medium text-ink-800">{post.author.name}</span>
              <span className="block text-[10px] font-normal text-leaf-700/60">
                {formatFollowers(post.author.followers)} 粉丝
              </span>
            </span>
            <AuthorBadgeIcons post={post} compact />
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

        {post.type === 'vote' && post.vote && <PostVotePreview post={post} onVoteUpdate={onVoteUpdate} />}

        {post.type === 'event' && post.event && <EventPreview post={post} />}

        {post.type === 'journal' && post.journal && <PostJournalPreview post={post} />}

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
          <AuthorBadgeIcons post={post} compact />
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
function AuthorBadgeIcons({ post, compact }: { post: Post; compact?: boolean }) {
  const badges = post.author.badges.filter((badge) => badge.obtained).slice(0, compact ? 2 : 3);
  if (badges.length === 0) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      {badges.map((badge) => (
        <span
          key={badge.id}
          title={badge.name}
          className={cn(
            'inline-grid place-items-center rounded-full border border-leaf-100 bg-white shadow-sm',
            compact ? 'h-4 w-4 text-[9px]' : 'h-5 w-5 text-[10px]'
          )}
        >
          {badge.icon}
        </span>
      ))}
    </span>
  );
}

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
