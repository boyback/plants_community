import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
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
 * Feed 主卡:**纯预览**(无类型相关交互)
 * 卡内一律不展开内容(投票/活动/日志/short/video 都不预览),
 * 用户想看完整数据一律点进 `/post/:id` 详情页。
 *
 * 卡片三段:
 *   1) 图片区(有 cover 才显示;视频右上角带播放小图标)
 *   2) 标题(可选 species chip 在标题上方)
 *   3) 作者 / 时间 + 看·赞·评 三计数
 */
function FeedCard({ post, className }: { post: Post; className?: string }) {
  const cover = post.cover ?? post.images?.[0];
  return (
    <Link
      href={`/post/${post.id}`}
      className={cn(
        'card group block overflow-hidden transition-shadow hover:shadow-lg',
        className
      )}
    >
      {cover ? (
        <div className="relative w-full overflow-hidden bg-leaf-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={post.title}
            className="block h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* 类型徽章固定在左上角 */}
          <div className="absolute left-2 top-2">
            <PostTypeBadge type={post.type} />
          </div>
          {/* video 类型加个播放角标暗示;不预览视频内容 */}
          {post.type === 'video' && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white">
                <Icon name="video" size={20} fill="currentColor" />
              </div>
            </div>
          )}
        </div>
      ) : (
        // 无封面时,仍然给类型徽章一个位置(标题上方)
        <div className="px-3 pt-3">
          <PostTypeBadge type={post.type} />
        </div>
      )}

      <div className="space-y-2 p-3">
        {/* species chip 简短提示(可点击,要 stop propagation 不触发卡片整体跳转) */}
        {post.species && <SpeciesChip species={post.species} board={post.board} />}

        <h3 className="line-clamp-2 text-sm font-semibold text-ink-800 group-hover:text-leaf-700 md:text-base">
          {post.title}
        </h3>

        {/* 作者 + meta:author chip 是 nested link,需要 stop propagation */}
        <div className="flex items-center justify-between pt-0.5">
          <NestedLink
            href={`/user/${post.author.id}`}
            className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-700/80 hover:text-leaf-700"
          >
            <Avatar src={post.author.avatar} alt={post.author.name} size={20} />
            <span className="truncate font-medium">{post.author.name}</span>
            <span className="text-leaf-600/70">·</span>
            <span className="shrink-0">{timeAgo(post.createdAt)}</span>
          </NestedLink>

          <div className="flex shrink-0 items-center gap-2 text-[11px] text-leaf-700/80">
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
