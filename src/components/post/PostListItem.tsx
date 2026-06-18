'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PostAdminMenu } from '@/components/post/PostAdminMenu';
import { Icon } from '@/components/ui/Icon';
import { TopicTag } from '@/components/ui/TopicTag';
import { UserIdentity } from '@/components/ui/UserIdentity';
import { PostVotePreview, type PostVoteUpdateHandler } from '@/components/post/PostVotePreview';
import { PostJournalPreview } from '@/components/post/PostJournalPreview';
import { useAuth } from '@/context/AuthContext';
import type { Post } from '@/lib/types';
import { boardUrl, cn, formatDateTime, formatFollowers, formatNumber } from '@/lib/utils';
import styles from './PostListItem.module.scss';
import { cx } from '@/lib/style-utils';



export function PostListItem({
  post,
  showDivider = true,
  onVoteUpdate,
  liked = false,
  likeCount,
  onLikeClick,
  likeBusy = false




}: {post: Post;showDivider?: boolean;onVoteUpdate?: PostVoteUpdateHandler;liked?: boolean;likeCount?: number;onLikeClick?: () => void;likeBusy?: boolean;}) {
  const { user } = useAuth();
  const cover = post.cover ?? post.images?.[0] ?? null;
  const contentImages = (post.images ?? []).filter((image) => image && image !== cover);
  const displayImages = contentImages.slice(0, 3);
  const remainingImageCount = Math.max(0, contentImages.length - displayImages.length);
  const summary = post.contentText || stripHtml(post.content);

  return (
    <article className={cn(cx(styles.r_d139dd09, styles.r_c9b99cd9, styles.r_8a383123), showDivider && cx(styles.r_65fdbade, styles.r_88b684d2))}>
      <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_8ef2268e, styles.r_0c3bc985)}>
        <UserIdentity
          user={post.author}
          size="sm"
          variant="list"
          subtitle={`${formatFollowers(post.author.followers)} 粉丝`}
        />
        <PostAdminMenu post={post} user={user} align="center" />
      </div>

      <Link href={`/post/${post.id}`} className={cx(styles.r_64292b1c, styles.r_f22c517b, styles.r_0214b4b3)}>
        <h3 className={cx(styles.r_054cb4e3, styles.r_9669b98a, styles.r_69450ef1, styles.r_e21f17f1, styles.r_6d623258, styles.r_d94501d2)}>
          {post.title}
        </h3>
        {summary && <p className={cx(styles.r_aac62f0e, styles.r_054cb4e3, styles.r_a14daebf, styles.r_98fbcce7, styles.r_02eb621e)}>{summary}</p>}
      </Link>

      {post.tags.length > 0 &&
      <div className={cx(styles.r_f37ae625, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_58284b4e)}>
          {post.tags.slice(0, 5).map((tag) =>
        <TopicTag key={tag} tag={tag} href={`/topic/${encodeURIComponent(tag)}`} size="sm" />
        )}
        </div>
      }

      {post.type === 'vote' && post.vote &&
      <PostVotePreview post={post} onVoteUpdate={onVoteUpdate} className={styles.r_f22c517b} />
      }

      {post.type === 'journal' && post.journal && <PostJournalPreview post={post} className={styles.r_f22c517b} />}

      {(cover || displayImages.length > 0) &&
      <div className={cx(styles.r_f22c517b, styles.r_60fbb771, styles.r_8dddea07, styles.r_77a2a20e, styles.r_020ba687, styles.r_64cac80d)}>
          {cover &&
        <Link href={`/post/${post.id}`} className={cx(styles.r_0214b4b3, styles.r_44879387, styles.r_c0980a65, styles.r_012fbd12)}>
              <div className={cx(styles.r_d89972fe, styles.r_fe507f5b, styles.r_44879387, styles.r_c0980a65, styles.r_2cd02d11, styles.r_c10ff8c0, styles.r_7ebecbb6)}>
                <Image
              src={cover}
              alt={`${post.title} 封面图`}
              fill
              sizes="270px"
              unoptimized
              className={styles.r_7d85d0c2} />

                <span className={cx(styles.r_da4dbfbc, styles.r_d83be576, styles.r_9a2db8f9, styles.r_421ac2be, styles.r_e4dc3808, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_e83a7042, styles.r_72a4c7cd)}>
                  封面
                </span>
                {post.type === 'video' &&
            <div className={cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_7b7df044, styles.r_f3c543ad, styles.r_67d66567)}>
                    <div className={cx(styles.r_f3c543ad, styles.r_426b8b75, styles.r_d854e569, styles.r_67d66567, styles.r_ac204c10, styles.r_53bb3a28, styles.r_72a4c7cd)}>
                      <Icon name="video" size={20} fill="currentColor" />
                    </div>
                  </div>
            }
              </div>
            </Link>
        }

          {displayImages.length > 0 &&
        <Link href={`/post/${post.id}`} className={cx(styles.r_0214b4b3, styles.r_6da6a3c3, styles.r_7e0b7cdf, styles.r_13a6e872)}>
              <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_58284b4e)}>
                {displayImages.map((image, index) =>
            <div
              key={`${image}-${index}`}
              className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_2cd02d11, styles.r_c10ff8c0, styles.r_7ebecbb6, styles.r_0ca7530f, styles.r_7c68de03)}>

                    <Image
                src={image}
                alt={`${post.title} 图片 ${index + 1}`}
                fill
                sizes="(max-width: 640px) 30vw, 150px"
                unoptimized
                className={styles.r_7d85d0c2} />

                    {index === displayImages.length - 1 && remainingImageCount > 0 &&
              <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_fd9dca32)}>
                        <span className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_72a4c7cd)}>+{remainingImageCount}</span>
                      </div>
              }
                  </div>
            )}
              </div>
            </Link>
        }
        </div>
      }

      <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_0c3bc985, styles.r_69cdf25a, styles.r_7b89cd85)}>
        {post.board &&
        <Link
          href={boardUrl(post.board)}
          className={cx(styles.r_012fbd12, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0b91436d, styles.r_660d2eff, styles.r_69cdf25a, styles.r_e83a7042, styles.r_7b89cd85, styles.r_5756b7b4, styles.r_81be6435)}>

            {post.board.name}
          </Link>
        }
        <div className={cx(styles.r_fb56d9cf, styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_3960ffc2, styles.r_ef22bd55)}>
          <span className={styles.r_012fbd12}>{formatDateTime(post.createdAt)}</span>
          <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="eye" size={14} />
            {formatNumber(post.views)}
          </span>
          <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="comment" size={14} />
            {formatNumber(post.comments)}
          </span>
          {onLikeClick ?
          <button
            type="button"
            disabled={likeBusy}
            onClick={onLikeClick}
            className={cn(
              cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0),
              styles.postStatButton,
              liked && styles.postStatButtonActive
            )}
            aria-pressed={liked}>
            <Icon name="thumbs-up" size={14} />
            {formatNumber(likeCount ?? post.likes)}
          </button> :
          <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="thumbs-up" size={14} />
            {formatNumber(likeCount ?? post.likes)}
          </span>
          }
        </div>
      </div>
    </article>);

}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
