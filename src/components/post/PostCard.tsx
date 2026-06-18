'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Post } from '@/lib/types';
import { UserIdentity } from '@/components/ui/UserIdentity';
import { Icon } from '@/components/ui/Icon';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { TopicTag } from '@/components/ui/TopicTag';
import { formatNumber, formatDateTime, formatFollowers, timeAgo, cn, boardUrl } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { PostAdminMenu } from '@/components/post/PostAdminMenu';
import { PostVotePreview } from '@/components/post/PostVotePreview';
import { PostJournalPreview } from '@/components/post/PostJournalPreview';
import styles from './PostCard.module.scss';
import { cx } from '@/lib/style-utils';



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
  onPostDeleted







}: {post: Post;layout?: 'feed' | 'compact';className?: string;onVoteUpdate?: (postId: string, options: {id: string;label: string;votes: number;}[], total: number, voted: boolean, votedOptionIds: string[]) => void;onPostChanged?: (post: Post) => void;onPostDeleted?: (postId: string) => void;}) {
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
function FeedCard({ post, className, onVoteUpdate, onPostChanged, onPostDeleted }: {post: Post;className?: string;onVoteUpdate?: (postId: string, options: {id: string;label: string;votes: number;}[], total: number, voted: boolean, votedOptionIds: string[]) => void;onPostChanged?: (post: Post) => void;onPostDeleted?: (postId: string) => void;}) {
  const { user } = useAuth();

  const cover = post.cover ?? post.images?.[0];

  return (
    <Link
      href={`/post/${post.id}`}
      className={cn(cx(styles.r_64292b1c, styles.r_0214b4b3, styles.r_b8627687, styles.r_9c02094c),

      className
      )}>

      {cover ?
      <div className={styles.r_d89972fe}>
          <CoverImage
          src={cover}
          alt={post.title}
          showVideoIcon={post.type === 'video'}
          typeBadge={<PostTypeBadge type={post.type} />} />

          <div className={cx(styles.r_da4dbfbc, styles.r_7b2d6393, styles.r_9a2db8f9, styles.r_236812d6)}>
            <PostAdminMenu post={post} user={user} onPostChanged={onPostChanged} onPostDeleted={onPostDeleted} />
          </div>
        </div> :

      <div className={cx(styles.r_0e17f2bd, styles.r_ce335a8e, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_d89972fe)}>
          <PostTypeBadge type={post.type} />
          <PostAdminMenu post={post} user={user} onPostChanged={onPostChanged} onPostDeleted={onPostDeleted} />
        </div>
      }

      <div className={cx(styles.r_6f7e013d, styles.r_eb6e8b88)}>
        {/* 作者 + 时间（最上面一行） */}
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e, styles.r_d058ca6d, styles.r_7b89cd85)}>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_7e0b7cdf)}>
            <UserIdentity
              user={post.author}
              size="sm"
              variant="list"
              asLink={false}
              avatarRing={false}
              subtitle={`${formatFollowers(post.author.followers)} 粉丝`}
            />
            <AuthorBadgeIcons post={post} compact />
          </div>
          <span className={cx(styles.r_012fbd12, styles.r_66a36c90)}>{formatDateTime(post.createdAt)}</span>
        </div>

        {/* 标题 */}
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <h3 className={cx(styles.r_054cb4e3, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5, styles.r_0eb80431, styles.r_36e579c0, styles.r_7e0b7cdf)}>
            {post.title}
          </h3>
        </div>

        {/* —— 类型预览块(只展示,不可交互) —— */}
        {/* short / rich / help 都展示纯文本预览;富文本剥 HTML 标签 */}
        {(post.type === 'short' || post.type === 'rich' || post.type === 'help') && (
        post.contentText || stripHtml(post.content)) &&
        <p className={cx(styles.r_054cb4e3, styles.r_359090c2, styles.r_517d113c, styles.r_b85c981b)}>
              {post.contentText || stripHtml(post.content)}
            </p>
        }

        {post.type === 'vote' && post.vote && <PostVotePreview post={post} onVoteUpdate={onVoteUpdate} />}

        {post.type === 'event' && post.event && <EventPreview post={post} />}

        {post.type === 'journal' && post.journal && <PostJournalPreview post={post} />}

        {/* 话题标签（单独一行） */}
        {post.tags.length > 0 &&
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_44ee8ba0, styles.r_2cd02d11)}>
            {post.tags.slice(0, 5).map((tag) =>
          <TopicTag
            key={tag}
            tag={tag}
            href={`/topic/${encodeURIComponent(tag)}`}
            size="sm" />

          )}
            {post.tags.length > 5 &&
          <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_1dc571a3, styles.r_2e1e608a)}>+{post.tags.length - 5}</span>
          }
          </div>
        }

        {/* 板块 + 统计数据（最下面一行） */}
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e)}>
          {post.board &&
          <NestedLink
            href={boardUrl(post.board)}
            className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_5f6a59f1, styles.r_2efc423a)}>

              <span className={styles.r_2689f395}>{post.board.name}</span>
            </NestedLink>
          }
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_012fbd12, styles.r_d058ca6d, styles.r_7b89cd85)}>
            <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}><Icon name="eye" size={12} />{formatNumber(post.views)}</span>
            <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}><Icon name="comment" size={12} />{formatNumber(post.comments)}</span>
            <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}><Icon name="heart" size={12} />{formatNumber(post.likes)}</span>
          </div>
        </div>
      </div>
    </Link>);

}

/**
 * 封面图组件
 * - 根据图片比例自动适配：
 *   - 横图(宽>高)：保持原比例，最大高度 280px
 *   - 竖图/长图(高>=宽)：使用 3:4 比例限制高度，避免太长
 */
function CoverImage({
  src,
  alt,
  showVideoIcon,
  typeBadge





}: {src: string;alt: string;showVideoIcon?: boolean;typeBadge?: React.ReactNode;}) {
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
      className={cn(cx(styles.r_d89972fe, styles.r_6da6a3c3, styles.r_2cd02d11, styles.r_7ebecbb6),

      isVeryTall && styles.r_c9d4f29e
      )}>

      <div className={cx(styles.r_f3c543ad, styles.r_668b21aa, styles.r_67d66567)}>
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
          className={cn(cx(styles.r_0214b4b3, styles.r_b1104f41, styles.r_eadef238, styles.r_84432211, styles.r_7b9cdafa),

          isLandscape ? styles.r_4bb3e3c3 : isVeryTall ? styles.r_668b21aa : ''
          )}
          style={
          scaledWidth && isLandscape ?
          { width: scaledWidth } :
          { width: '100%' }
          } />

      </div>
      {typeBadge && <div className={cx(styles.r_da4dbfbc, styles.r_d83be576, styles.r_9a2db8f9)}>{typeBadge}</div>}
      {showVideoIcon &&
      <div className={cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_7b7df044, styles.r_f3c543ad, styles.r_67d66567)}>
          <div className={cx(styles.r_f3c543ad, styles.r_508ebf85, styles.r_e7e37107, styles.r_67d66567, styles.r_ac204c10, styles.r_53bb3a28, styles.r_72a4c7cd)}>
            <Icon name="video" size={20} fill="currentColor" />
          </div>
        </div>
      }
    </div>);

}

/** 嵌套 Link:阻止冒泡到外层卡片 */
function NestedLink({
  href,
  className,
  children




}: {href: string;className?: string;children: React.ReactNode;}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => e.stopPropagation()}>

      {children}
    </Link>);

}

/** 活动预览(只读):位置 + 时间 + 已报名人数 */
function EventPreview({ post }: {post: Post;}) {
  if (!post.event) return null;
  return (
    <div className={cx(styles.r_0c5e9137, styles.r_0e7fd057, styles.r_7660b450, styles.r_d058ca6d, styles.r_d604004c)}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
        <span>📍</span>
        <span className={styles.r_f283ea9b}>{post.event.location}</span>
      </div>
      <div className={cx(styles.r_15e1b1f4, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <span className={styles.r_bede1673}>
          🕘 {new Date(post.event.startAt).toLocaleDateString()}
        </span>
        <span className={styles.r_06fd2bc1}>{post.event.attendees} 人已报名</span>
      </div>
    </div>);

}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n) + '…';
}

function CompactCard({ post, className }: {post: Post;className?: string;}) {
  const cover = post.cover ?? post.images?.[0];
  return (
    <Link
      href={`/post/${post.id}`}
      className={cn(cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_eb6e8b88, styles.r_b8627687, styles.r_9e85ac05),

      className
      )}>

      {cover &&
      <div className={cx(styles.r_d89972fe, styles.r_acaee621, styles.r_baceed34, styles.r_012fbd12, styles.r_2cd02d11, styles.r_0c5e9137, styles.r_7ebecbb6)}>
          <Image src={cover} alt="" fill className={styles.r_7d85d0c2} unoptimized />
        </div>
      }
      <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
        <div className={cx(styles.r_65281709, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <PostTypeBadge type={post.type} />
          {post.species ?
          <SpeciesChip species={post.species} board={post.board} compact /> :

          <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_a4157fd5)}>—</span>
          }
        </div>
        <h4 className={cx(styles.r_f283ea9b, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{post.title}</h4>
        <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_d058ca6d, styles.r_69335b95)}>
          <span>{post.author.name}</span>
          <AuthorBadgeIcons post={post} compact />
          <span>·</span>
          <span>{timeAgo(post.createdAt)}</span>
          <span>·</span>
          <span>💬 {post.comments}</span>
        </div>
      </div>
    </Link>);

}

/**
 * 品种 chip:🌱 月迷 (28)
 * - 点击进品种页(走 board 路径)
 */
function AuthorBadgeIcons({ post, compact }: {post: Post;compact?: boolean;}) {
  const badges = post.author.badges.filter((badge) => badge.obtained).slice(0, compact ? 2 : 3);
  if (badges.length === 0) return null;

  return (
    <span className={cx(styles.r_52083e7d, styles.r_012fbd12, styles.r_3960ffc2, styles.r_a3899220)}>
      {badges.map((badge) =>
      <span
        key={badge.id}
        title={badge.name}
        className={cn(cx(styles.r_c5d9aaf6, styles.r_67d66567, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237),

        compact ? cx(styles.r_11e59c6d, styles.r_dc7972eb, styles.r_e0988086) : cx(styles.r_cd0d9c51, styles.r_72470489, styles.r_1dc571a3)
        )}>

          {badge.icon}
        </span>
      )}
    </span>);

}

function SpeciesChip({
  species,
  board,
  compact = false




}: {species: NonNullable<Post['species']>;board: Post['board'];compact?: boolean;}) {
  return (
    <Link
      href={boardUrl(board)}
      className={cn(cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5f6a59f1, styles.r_ceb69a6b, styles.r_2efc423a),

      compact ? styles.r_d058ca6d : styles.r_fc7473ca
      )}
      onClick={(e) => e.stopPropagation()}>

      <span className={styles.r_fc7473ca}>🌱</span>
      <span className={styles.r_2689f395}>{species.name}</span>
      {species.ratingCount > 0 &&
      <span className={styles.r_a1a0ad0b}>({species.ratingCount})</span>
      }
    </Link>);

}

function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
