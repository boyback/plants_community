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
        <div className="relative w-full overflow-hidden bg-leaf-50">
          {/*
            瀑布流图片策略:
            - 默认按原图比例铺满宽度(h-auto)
            - 设个 max-height 防止超长图把卡片撑爆 → 此时图片用 contain 居中,不裁切不拉伸
            - 用宿主元素 max-h + img.object-contain + 居中,极端情况两侧/上下露底色 bg-leaf-50,不会显示空白
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={post.title}
            className="block w-full max-h-[480px] object-contain transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
          <div className="absolute left-2 top-2">
            <PostTypeBadge type={post.type} />
          </div>
          {/* video 类型加大播放图标 */}
          {post.type === 'video' && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white">
                <Icon name="video" size={20} fill="currentColor" />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 pt-3">
          <PostTypeBadge type={post.type} />
        </div>
      )}

      <div className="space-y-2 p-3">
        {post.species && <SpeciesChip species={post.species} board={post.board} />}

        {/* 标题 + 紧贴的发布时间 */}
        <div className="space-y-0.5">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink-800 group-hover:text-leaf-700">
            {post.title}
          </h3>
          <div className="text-[10px] text-leaf-700/60">
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

        {/* footer:作者(左) + 看赞评(右) 同一行 */}
        <div className="flex items-center justify-between gap-2 border-t border-leaf-50 pt-1.5">
          <NestedLink
            href={`/user/${post.author.id}`}
            className="flex min-w-0 items-center gap-1 text-[10px] text-ink-700/80 hover:text-leaf-700"
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
