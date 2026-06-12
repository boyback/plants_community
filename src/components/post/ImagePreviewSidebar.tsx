'use client';

import { useState } from 'react';
import type { Comment, Post } from '@/lib/types';
import { CommentList, CommentInput } from './CommentList';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { formatNumber } from '@/lib/utils';
import styles from './ImagePreviewSidebar.module.scss';
import { cx } from '@/lib/style-utils';



/**
 * 图片预览侧边栏内容
 * - 顶部：帖子信息
 * - 中间：评论区（可滚动）
 * - 底部：评论输入（纯文本）
 */
export function ImagePreviewSidebar({
  post,
  comments,
  onCommentAdded,
  onReplyAdded





}: {post: Post;comments: Comment[];onCommentAdded?: (comment: Comment) => void;onReplyAdded?: (commentId: string, reply: Comment) => void;}) {
  const { t } = useI18n();

  return (
    <div className={cx(styles.r_60fbb771, styles.r_668b21aa, styles.r_8dddea07)}>
      {/* 顶部：帖子信息 */}
      <div className={cx(styles.r_012fbd12, styles.r_65fdbade, styles.r_88b684d2, styles.r_eb6e8b88)}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <Link href={`/user/${post.author.id}`}>
            <Avatar src={post.author.avatar} alt={post.author.name} size={32} />
          </Link>
          <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
            <Link
              href={`/user/${post.author.id}`}
              className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_399e11a5, styles.r_9825203a)}>

              {post.author.name}
            </Link>
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_1dc571a3, styles.r_6c4cc49e)}>
              <Icon name="eye" size={10} />
              {formatNumber(post.views)}
              <span className={styles.r_0da48290}>·</span>
              <Icon name="heart" size={10} />
              {formatNumber(post.likes)}
            </div>
          </div>
        </div>
      </div>


      {/* 中间：评论区（可滚动） */}
      <div className={cx(styles.r_012fbd12, styles.r_b950dda2, styles.r_88b684d2, styles.r_eb6e8b88)}>
        <CommentInput postId={post.id} onSubmit={onCommentAdded ?? (() => {})} />
      </div>
            {/* 底部：评论输入 */}
      <div className={cx(styles.r_36e579c0, styles.r_92bf82f4)}>
        <div className={styles.r_eb6e8b88}>
          <div className={cx(styles.r_a77ed4d9, styles.r_359090c2, styles.r_2689f395, styles.r_5f6a59f1)}>
            {t('detail.post.commentsAll', { defaultValue: '评论' })} ({comments.length})
          </div>
          {comments.length === 0 ?
          <div className={cx(styles.r_cb11fec3, styles.r_ca6bf630, styles.r_359090c2, styles.r_6c4cc49e)}>
              暂无评论
            </div> :

          <CommentList
            comments={comments}
            postId={post.id}
            onReplyAdded={onReplyAdded}
            compact />

          }
        </div>
      </div>

    </div>);

}