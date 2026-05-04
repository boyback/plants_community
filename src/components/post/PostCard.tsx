import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/types';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { formatNumber, timeAgo, cn } from '@/lib/utils';

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

function FeedCard({ post, className }: { post: Post; className?: string }) {
  const cover = post.cover ?? post.images?.[0];
  return (
    <article className={cn('card overflow-hidden transition-shadow hover:shadow-lg', className)}>
      <Link href={`/post/${post.id}`} className="block">
        {cover && (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-leaf-50">
            <Image
              src={cover}
              alt={post.title}
              fill
              sizes="(max-width:768px) 100vw, 640px"
              className="object-cover transition-transform duration-500 hover:scale-105"
              unoptimized
            />
            <div className="absolute left-3 top-3">
              <PostTypeBadge type={post.type} />
            </div>
            {post.type === 'video' && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-black/50 text-white">
                  <Icon name="video" size={22} fill="currentColor" />
                </div>
              </div>
            )}
          </div>
        )}
      </Link>

      <div className="space-y-2 p-4">
        {!cover && <PostTypeBadge type={post.type} />}

        <Link href={`/post/${post.id}`}>
          <h3 className="line-clamp-2 text-base font-semibold text-ink-800 hover:text-leaf-700">
            {post.title}
          </h3>
        </Link>

        {post.type === 'short' && (
          <p className="line-clamp-2 text-sm text-ink-700/80">{post.content}</p>
        )}

        {post.type === 'vote' && post.vote && <VoteSummary post={post} />}

        {post.type === 'event' && post.event && (
          <div className="rounded-lg bg-violet-50/80 p-2.5 text-xs text-violet-900">
            📍 {post.event.location} · 🕘 {new Date(post.event.startAt).toLocaleDateString()}
            <span className="ml-2 text-violet-600">{post.event.attendees} 人参加</span>
          </div>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span key={t} className="chip">
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <Link
            href={`/user/${post.author.id}`}
            className="flex items-center gap-2 text-xs text-ink-700/80 hover:text-leaf-700"
          >
            <Avatar src={post.author.avatar} alt={post.author.name} size={24} />
            <span className="font-medium">{post.author.name}</span>
            <span className="text-leaf-600/70">·</span>
            <span>{timeAgo(post.createdAt)}</span>
          </Link>

          <div className="flex items-center gap-3 text-xs text-leaf-700/80">
            <Stat icon="eye" n={post.views} />
            <Stat icon="heart" n={post.likes} />
            <Stat icon="comment" n={post.comments} />
          </div>
        </div>
      </div>
    </article>
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
          <Link
            href={`/board/${post.board.slug}`}
            className="text-[11px] text-leaf-700 hover:underline"
          >
            {post.board.name}
          </Link>
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

function VoteSummary({ post }: { post: Post }) {
  if (!post.vote) return null;
  const total = post.vote.options.reduce((s, o) => s + o.votes, 0);
  const top = [...post.vote.options].sort((a, b) => b.votes - a.votes).slice(0, 3);
  return (
    <div className="space-y-1.5 rounded-lg bg-amber-50/50 p-2.5">
      <div className="text-xs font-medium text-amber-900">🗳️ {post.vote.question}</div>
      {top.map((o) => {
        const pct = total ? Math.round((o.votes / total) * 100) : 0;
        return (
          <div key={o.id} className="relative overflow-hidden rounded bg-white/70 px-2 py-1 text-xs">
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
      <div className="text-[10px] text-amber-700">共 {total} 人投票</div>
    </div>
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
