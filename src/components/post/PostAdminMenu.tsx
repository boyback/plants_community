'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';
import { ConfirmPopover } from '@/components/ui/ConfirmPopover';
import type { Post } from '@/lib/types';

interface PostAdminMenuProps {
  post: Post;
  user: {
    id: string;
    role?: 'user' | 'moderator' | 'admin';
    isSuperAdmin?: boolean;
  };
}

export function PostAdminMenu({ post, user }: PostAdminMenuProps) {
  const router = useRouter();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  // 权限判断
  const isAuthor = user.id === post.author.id;
  const isSuperAdmin = user.isSuperAdmin === true;
  const isModerator = user.role === 'moderator';
  const isAdmin = user.role === 'admin';

  // 发帖人：删除
  // 板块管理员：删除、移贴、置顶、锁定
  // 超级管理员：继承以上全部 + 封禁用户、审核
  const canDelete = isAuthor || isModerator || isAdmin || isSuperAdmin;
  const canMove = isModerator || isAdmin || isSuperAdmin;
  const canPin = isModerator || isAdmin || isSuperAdmin;
  const canLock = isModerator || isAdmin || isSuperAdmin;
  const canBan = isSuperAdmin;
  const canReview = isSuperAdmin;

  const showMenu = canDelete || canMove || canPin || canLock || canBan || canReview;

  if (!showMenu) return null;

  const handleAdminAction = async (action: string, body?: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/posts/${post.id}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || '操作失败');
        return;
      }
      toast.success('操作成功');
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('操作失败');
    }
  };

  const handlePin = async () => {
    await handleAdminAction(post.pinned ? 'unpin' : 'pin');
  };

  const handleLock = async () => {
    await handleAdminAction(post.locked ? 'unlock' : 'lock');
  };

  const handleBanUser = async () => {
    if (!confirm(`确定封禁用户 ${post.author.name}？`)) return;
    const reason = prompt('封禁原因:');
    if (!reason) return;
    const days = prompt('封禁天数:', '7');
    if (!days) return;
    await handleAdminAction('ban_user', { userId: post.author.id, duration: Number(days), reason });
  };

  const handleMove = () => {
    toast.error('移贴功能开发中');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => setAdminMenuOpen(true)}
        onMouseLeave={() => setAdminMenuOpen(false)}
        className="grid h-8 w-8 place-items-center rounded-none text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition-colors"
        title="管理"
      >
        <Icon name="settings" size={18} />
      </button>
      {adminMenuOpen && (
        <div 
          className="absolute right-0 top-full z-50 pt-2"
          onMouseEnter={() => setAdminMenuOpen(true)}
          onMouseLeave={() => setAdminMenuOpen(false)}
        >
          <div className="relative min-w-[80px] rounded-none border border-leaf-100 bg-white shadow-xl py-1">
            <div className="absolute right-4 -top-[6px] w-3 h-3 bg-white border-l border-t border-leaf-100 transform rotate-45" />

            {/* 管理员：移贴 */}
            {canMove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMove();
                }}
                className="w-full px-3 py-1.5 text-xs text-ink-700 hover:bg-leaf-50 text-left whitespace-nowrap"
              >
                移贴
              </button>
            )}

            {/* 管理员：置顶 */}
            {canPin && (
              <button
                type="button"
                onClick={handlePin}
                className="w-full px-3 py-1.5 text-xs text-ink-700 hover:bg-leaf-50 text-left whitespace-nowrap"
              >
                {post.pinned ? '取消置顶' : '置顶'}
              </button>
            )}

            {/* 管理员：锁定 */}
            {canLock && (
              <button
                type="button"
                onClick={handleLock}
                className="w-full px-3 py-1.5 text-xs text-ink-700 hover:bg-leaf-50 text-left whitespace-nowrap"
              >
                {post.locked ? '解锁' : '锁定'}
              </button>
            )}

            {/* 超管：封禁用户 */}
            {canBan && !isAuthor && (
              <button
                type="button"
                onClick={handleBanUser}
                className="w-full px-3 py-1.5 text-xs text-ink-700 hover:bg-leaf-50 text-left whitespace-nowrap"
              >
                封禁用户
              </button>
            )}

            {/* 分割线 */}
            {canDelete && <div className="border-t border-leaf-50 my-0.5" />}

            {/* 发帖人 + 管理员：删除 */}
            {canDelete && (
              <ConfirmPopover
                title="确定删除这篇帖子？"
                confirmText="删除"
                danger
                onConfirm={() => {
                  const reason = prompt('删除原因（可选）:');
                  handleAdminAction('delete', { reason: reason || '管理员删除' });
                  router.push('/');
                }}
              >
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 text-left whitespace-nowrap"
                >
                  删除
                </button>
              </ConfirmPopover>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
