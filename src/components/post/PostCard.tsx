'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { STAGE_META } from '@/lib/journal';
import { formatNumber, timeAgo, cn, boardUrl } from '@/lib/utils';

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
  const cover = post.cover ?? post.images?.[0];
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
        <CoverImage
          src={cover}
          alt={post.title}
          showVideoIcon={post.type === 'video'}
          typeBadge={<PostTypeBadge type={post.type} />}
        />
      ) : (
        <div className="px-3 pt-3">
          <PostTypeBadge type={post.type} />
        </div>
      )}

      <div className="space-y-2 p-3">
        {/* 板块 + 话题 chips(细脚标,点击跳板块/话题) */}
        <div className="flex flex-wrap items-center gap-1">
          {/* 板块名 chip */}
          <NestedLink
            href={boardUrl(post.board)}
            className="inline-flex items-center gap-0.5 rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] font-medium text-leaf-700 hover:bg-leaf-100"
          >
            <span>{post.board.icon}</span>
            <span className="truncate max-w-[100px]">{post.board.name}</span>
          </NestedLink>

          {/* species 打分 chip(若有) */}
          {post.species && <SpeciesChip species={post.species} board={post.board} />}

          {/* 话题 / tag chips(最多前 3) */}
          {post.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-amber-50/70 px-2 py-0.5 text-[10px] text-amber-700"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* 标题 + 紧贴的发布时间(4 列模式下时间挪到底部 — 通过 CSS 切换) */}
        <div className="space-y-0.5">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink-800 group-hover:text-leaf-700">
            {post.title}
          </h3>
          <div className="post-time-top text-[10px] text-leaf-700/60">
            {timeAgo(post.createdAt)}
          </div>
        </div>

        {/* —— 类型预览块(只展示,不可交互) —— */}
        {post.type === 'short' && post.content && (
          <p className="line-clamp-2 text-xs leading-4 text-ink-700/80">
            {post.content}
          </p>
        )}

        {post.type === 'vote' && post.vote && <VotePreview post={post} />}

        {post.type === 'event' && post.event && <EventPreview post={post} />}

        {post.type === 'journal' && post.journal && <JournalPreview post={post} />}

        {/* 4 列模式:作者 + 时间 独立成行(放在内容下方,默认隐藏) */}
        <NestedLink
          href={`/user/${post.author.id}`}
          className="post-author-block hidden min-w-0 items-center gap-1 text-[10px] text-ink-700/80 hover:text-leaf-700"
        >
          <Avatar src={post.author.avatar} alt={post.author.name} size={16} />
          <span className="truncate font-medium">{post.author.name}</span>
          <span className="shrink-0 text-leaf-700/60">
            · {timeAgo(post.createdAt)}
          </span>
        </NestedLink>

        {/* footer:作者(左) + 看赞评(右) 同一行
            4 列瀑布流时:作者整块隐藏到上方,footer 只剩看赞评(右对齐) */}
        <div className="post-footer flex items-center justify-between gap-2 border-t border-leaf-50 pt-1.5">
          <NestedLink
            href={`/user/${post.author.id}`}
            className="post-footer-author flex min-w-0 items-center gap-1 text-[10px] text-ink-700/80 hover:text-leaf-700"
          >
            <Avatar src={post.author.avatar} alt={post.author.name} size={18} />
            <span className="truncate font-medium">{post.author.name}</span>
          </NestedLink>
          <div className="flex shrink-0 items-center gap-2 text-[10px] text-leaf-700/70">
            <Stat icon="eye" n={post.views} />
            <Stat icon="heart" n={post.likes} />
            <Stat icon="comment" n={post.comments} />
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * 封面图组件
 * - 默认 max-h-[280px] + object-contain,极端比例图自动居中,不裁切不拉伸
 * - 当原图自然宽度 < 容器宽度时,放大到 1.5 倍原图尺寸(宽不超过容器),保持清晰且不变模糊
 *   仍不到容器宽时两边露 bg-leaf-50 兜底
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

  // 是否走「放大 1.5 倍」分支
  const isSmaller = naturalW != null && containerW != null && naturalW < containerW;
  const scaledWidth = isSmaller
    ? Math.min(naturalW! * 1.5, containerW!)
    : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-leaf-50"
    >
      <div className="grid place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth) setNaturalW(img.naturalWidth);
          }}
          className="block max-h-[280px] object-contain transition-transform duration-500 group-hover:scale-[1.02]"
          style={
            scaledWidth
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
    <div className="space-y-1 rounded-lg bg-amber-50/60 p-2 text-amber-900">
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
    <div className="rounded-lg bg-violet-50/80 p-2 text-[11px] text-violet-900">
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
 *  - 总数 > 3 时底部叠 fade 蒙层 +「+ N 条」提示「点进去看完整时间线」
 */
function JournalPreview({ post }: { post: Post }) {
  if (!post.journal) return null;
  const j = post.journal;
  const shown = j.entries ?? [];
  const restCount = Math.max(0, j.entriesCount - shown.length);
  const hasMore = restCount > 0;

  return (
    <div className="rounded-lg bg-emerald-50/60 p-2">
      <div className="mb-1 flex items-center justify-between text-[10px] text-emerald-700/80">
        <span className="truncate">📖 {j.subjectName}</span>
        <span>第 {j.daysSinceStart} 天 · 共 {j.entriesCount} 条</span>
      </div>

      <div className="relative">
        <ol className="space-y-1.5">
          {shown.map((e) => {
            const meta = STAGE_META[e.stage];
            return (
              <li key={e.id} className="flex items-start gap-1.5">
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
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-leaf-50">
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

function Stat({ icon, n }: { icon: 'eye' | 'heart' | 'comment'; n: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon name={icon} size={13} />
      {formatNumber(n)}
    </span>
  );
}

/**
 * 品种 chip:🌱 月迷 ⭐ 4.2 (28)
 * - 当 ratingCount === 0 时只显示初始难度,不展示括号
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
  const score = species.avgDifficulty.toFixed(1);
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
      <span className="text-amber-600">⭐</span>
      <span className="tabular-nums">{score}</span>
      {species.ratingCount > 0 && (
        <span className="text-leaf-600/70">({species.ratingCount})</span>
      )}
    </Link>
  );
}
