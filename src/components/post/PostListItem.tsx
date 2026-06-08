'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PostAdminMenu } from '@/components/post/PostAdminMenu';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Icon } from '@/components/ui/Icon';
import { TopicTag } from '@/components/ui/TopicTag';
import { PostVotePreview, type PostVoteUpdateHandler } from '@/components/post/PostVotePreview';
import { PostJournalPreview } from '@/components/post/PostJournalPreview';
import { useAuth } from '@/context/AuthContext';
import type { Post } from '@/lib/types';
import { boardUrl, cn, formatDateTime, formatFollowers, formatNumber } from '@/lib/utils';

export function PostListItem({
  post,
  showDivider = true,
  onVoteUpdate,
}: {
  post: Post;
  showDivider?: boolean;
  onVoteUpdate?: PostVoteUpdateHandler;
}) {
  const { user } = useAuth();
  const cover = post.cover ?? post.images?.[0] ?? null;
  const contentImages = (post.images ?? []).filter((image) => image && image !== cover);
  const displayImages = contentImages.slice(0, 3);
  const remainingImageCount = Math.max(0, contentImages.length - displayImages.length);
  const summary = post.contentText || stripHtml(post.content);

  return (
    <article className={cn('px-5 py-5 md:px-6', showDivider && 'border-b border-leaf-100')}>
      <div className="flex items-start justify-between gap-4">
        <Link href={`/user/${post.author.id}`} className="flex min-w-0 items-center gap-2.5">
          <UserAvatar
            src={post.author.avatar}
            alt={post.author.name}
            size={36}
            pendant={post.author.equip?.pendant ?? null}
            ring={false}
            showFestival={false}
          />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold leading-4 text-ink-900">{post.author.name}</span>
            <span className="block text-[11px] leading-4 text-leaf-700/60">
              {formatFollowers(post.author.followers)} 粉丝
            </span>
          </span>
        </Link>
        <PostAdminMenu post={post} user={user} align="center" />
      </div>

      <Link href={`/post/${post.id}`} className="group mt-3.5 block">
        <h3 className="line-clamp-2 text-[17px] font-bold leading-[1.35] text-ink-950 group-hover:text-leaf-800">
          {post.title}
        </h3>
        {summary && <p className="mt-1.5 line-clamp-2 text-[13px] leading-[22px] text-ink-600">{summary}</p>}
      </Link>

      {post.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 5).map((tag) => (
            <TopicTag key={tag} tag={tag} href={`/topic/${encodeURIComponent(tag)}`} size="sm" />
          ))}
        </div>
      )}

      {post.type === 'vote' && post.vote && (
        <PostVotePreview post={post} onVoteUpdate={onVoteUpdate} className="mt-3.5" />
      )}

      {post.type === 'journal' && post.journal && <PostJournalPreview post={post} className="mt-3.5" />}

      {(cover || displayImages.length > 0) && (
        <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:items-start">
          {cover && (
            <Link href={`/post/${post.id}`} className="block w-[270px] max-w-full shrink-0">
              <div className="relative h-[152px] w-[270px] max-w-full overflow-hidden rounded-[6px] bg-leaf-50">
                <Image
                  src={cover}
                  alt={`${post.title} 封面图`}
                  fill
                  sizes="270px"
                  unoptimized
                  className="object-cover"
                />
                <span className="absolute left-2 top-2 rounded-md bg-black/72 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  封面
                </span>
                {post.type === 'video' && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white">
                      <Icon name="video" size={20} fill="currentColor" />
                    </div>
                  </div>
                )}
              </div>
            </Link>
          )}

          {displayImages.length > 0 && (
            <Link href={`/post/${post.id}`} className="block w-full min-w-0 sm:w-[462px]">
              <div className="grid grid-cols-3 gap-1.5">
                {displayImages.map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-[6px] bg-leaf-50 sm:h-[150px] sm:w-[150px]"
                  >
                    <Image
                      src={image}
                      alt={`${post.title} 图片 ${index + 1}`}
                      fill
                      sizes="(max-width: 640px) 30vw, 150px"
                      unoptimized
                      className="object-cover"
                    />
                    {index === displayImages.length - 1 && remainingImageCount > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-lg font-bold text-white">+{remainingImageCount}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-4 text-[12px] text-ink-500">
        {post.board && (
          <Link
            href={boardUrl(post.board)}
            className="shrink-0 rounded-full border border-leaf-100 px-2.5 py-1 text-[12px] font-semibold text-ink-500 hover:bg-leaf-50 hover:text-leaf-800"
          >
            {post.board.name}
          </Link>
        )}
        <div className="ml-auto flex min-w-0 items-center gap-3.5">
          <span className="shrink-0">{formatDateTime(post.createdAt)}</span>
          <span className="inline-flex items-center gap-1">
            <Icon name="eye" size={14} />
            {formatNumber(post.views)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="comment" size={14} />
            {formatNumber(post.comments)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="thumbs-up" size={14} />
            {formatNumber(post.likes)}
          </span>
        </div>
      </div>
    </article>
  );
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
