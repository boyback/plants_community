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

/**
 * 图片预览侧边栏内容
 * - 顶部：帖子信息
 * - 中间：评论区（可滚动）
 * - 底部：评论输入（富文本）
 */
export function ImagePreviewSidebar({
  post,
  comments,
  onCommentAdded,
  onReplyAdded,
}: {
  post: Post;
  comments: Comment[];
  onCommentAdded?: (comment: Comment) => void;
  onReplyAdded?: (commentId: string, reply: Comment) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex h-full flex-col">
      {/* 顶部：帖子信息 */}
      <div className="shrink-0 border-b border-leaf-100 p-3">
        <div className="flex items-center gap-2">
          <Link href={`/user/${post.author.id}`}>
            <Avatar src={post.author.avatar} alt={post.author.name} size={32} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/user/${post.author.id}`}
              className="text-xs font-medium text-ink-800 hover:text-leaf-700"
            >
              {post.author.name}
            </Link>
            <div className="flex items-center gap-1 text-[10px] text-leaf-700/60">
              <Icon name="eye" size={10} />
              {formatNumber(post.views)}
              <span className="mx-1">·</span>
              <Icon name="heart" size={10} />
              {formatNumber(post.likes)}
            </div>
          </div>
        </div>
      </div>


      {/* 中间：评论区（可滚动） */}
      <div className="shrink-0 border-t border-leaf-100 p-3">
        <CommentInput postId={post.id} onSubmit={onCommentAdded ?? (() => {})} />
      </div>
            {/* 底部：评论输入 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <div className="mb-2 text-xs font-medium text-leaf-700">
            {t('detail.post.commentsAll', { defaultValue: '评论' })} ({comments.length})
          </div>
          {comments.length === 0 ? (
            <div className="py-4 text-center text-xs text-leaf-700/60">
              暂无评论
            </div>
          ) : (
            <CommentList
              comments={comments}
              onReplyAdded={onReplyAdded}
              compact
            />
          )}
        </div>
      </div>

    </div>
  );
}
