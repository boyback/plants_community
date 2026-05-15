'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { MovePostDialog } from '@/components/post/MovePostDialog';
import { ConfirmDialog, PromptDialog, AlertDialog } from '@/components/ui/Dialog';
import type { Post } from '@/lib/types';

interface PostAdminCardProps {
  post: Post;
  user: {
    id: string;
    role?: 'user' | 'moderator' | 'admin';
    isSuperAdmin?: boolean;
  };
}

/**
 * 帖子管理卡片 - 平铺所有管理功能按钮
 * 显示在帖子详情页右侧栏
 */
export function PostAdminCard({ post, user }: PostAdminCardProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  
  // 对话框状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteReasonPrompt, setShowDeleteReasonPrompt] = useState(false);
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [showBanReasonPrompt, setShowBanReasonPrompt] = useState(false);
  const [showBanDaysPrompt, setShowBanDaysPrompt] = useState(false);
  const [showAlert, setShowAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // 临时数据
  const [banReason, setBanReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  // 权限判断 - 只有超级管理员才能看到管理功能
  const isSuperAdmin = user.isSuperAdmin === true;

  // 只有超级管理员可以使用所有管理功能
  if (!isSuperAdmin) return null;

  const isAuthor = user.id === post.author.id;

  const handleAdminAction = async (action: string, body?: Record<string, unknown>) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setShowAlert({ type: 'error', message: data.error || '操作失败' });
        return;
      }
      setShowAlert({ type: 'success', message: '操作成功' });
      router.refresh();
    } catch (err) {
      console.error(err);
      setShowAlert({ type: 'error', message: '操作失败' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePin = async () => {
    await handleAdminAction(post.pinned ? 'unpin' : 'pin');
  };

  const handleLock = async () => {
    await handleAdminAction(post.locked ? 'unlock' : 'lock');
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = () => {
    setShowDeleteReasonPrompt(true);
  };

  const handleDeleteWithReason = async (reason: string) => {
    setDeleteReason(reason);
    await handleAdminAction('delete', { reason: reason || '管理员删除' });
    router.push('/');
  };

  const handleBanUser = () => {
    setShowBanConfirm(true);
  };

  const handleBanConfirmed = () => {
    setShowBanReasonPrompt(true);
  };

  const handleBanReasonSubmit = (reason: string) => {
    setBanReason(reason);
    setShowBanDaysPrompt(true);
  };

  const handleBanDaysSubmit = async (days: string) => {
    const duration = Number(days);
    if (isNaN(duration) || duration < 0) {
      setShowAlert({ type: 'error', message: '请输入有效的天数' });
      return;
    }
    await handleAdminAction('ban_user', { userId: post.author.id, duration, reason: banReason });
  };

  const handleMove = () => {
    setShowMoveDialog(true);
  };

  const handleMoveConfirm = async (categoryId?: string, genusId?: string, speciesId?: string) => {
    setShowMoveDialog(false);
    await handleAdminAction('move', { categoryId, genusId, speciesId });
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-800">
        <Icon name="settings" size={16} />
        管理操作
      </div>

      <div className="space-y-2">
        {/* 移贴 */}
        <button
          type="button"
          onClick={handleMove}
          disabled={submitting}
          className="btn-outline w-full justify-start !text-xs"
        >
          <Icon name="arrow-right" size={14} />
          移贴
        </button>

        {/* 置顶 */}
        <button
          type="button"
          onClick={handlePin}
          disabled={submitting}
          className="btn-outline w-full justify-start !text-xs"
        >
          <Icon name="pin" size={14} />
          {post.pinned ? '取消置顶' : '置顶'}
        </button>

        {/* 锁定 */}
        <button
          type="button"
          onClick={handleLock}
          disabled={submitting}
          className="btn-outline w-full justify-start !text-xs"
        >
          <Icon name="lock" size={14} />
          {post.locked ? '解锁' : '锁定'}
        </button>

        {/* 封禁用户 */}
        {!isAuthor && (
          <button
            type="button"
            onClick={handleBanUser}
            disabled={submitting}
            className="btn-outline w-full justify-start !text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-200"
          >
            <Icon name="close" size={14} />
            封禁用户
          </button>
        )}

        {/* 分割线 */}
        <div className="border-t border-leaf-100 my-2" />

        {/* 删除 */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting}
          className="btn-outline w-full justify-start !text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-200"
        >
          <Icon name="trash" size={14} />
          删除帖子
        </button>
      </div>

      {submitting && (
        <div className="mt-3 text-center text-xs text-leaf-700/70">
          处理中...
        </div>
      )}

      {/* 移贴对话框 */}
      {showMoveDialog && (
        <MovePostDialog
          currentBoard={{
            id: post.board.id,
            name: post.board.name,
            icon: post.board.icon,
          }}
          onConfirm={handleMoveConfirm}
          onCancel={() => setShowMoveDialog(false)}
        />
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirmed}
        title="确认删除"
        message="确定删除这篇帖子？此操作不可恢复。"
        danger
      />

      {/* 删除原因输入 */}
      <PromptDialog
        open={showDeleteReasonPrompt}
        onClose={() => setShowDeleteReasonPrompt(false)}
        onConfirm={handleDeleteWithReason}
        title="删除原因"
        message="请输入删除原因（可选）："
        placeholder="删除原因"
        defaultValue=""
      />

      {/* 封禁确认对话框 */}
      <ConfirmDialog
        open={showBanConfirm}
        onClose={() => setShowBanConfirm(false)}
        onConfirm={handleBanConfirmed}
        title="确认封禁"
        message={`确定封禁用户 ${post.author.name}？`}
        danger
      />

      {/* 封禁原因输入 */}
      <PromptDialog
        open={showBanReasonPrompt}
        onClose={() => setShowBanReasonPrompt(false)}
        onConfirm={(value) => {
          if (!value.trim()) {
            setShowAlert({ type: 'error', message: '封禁原因不能为空' });
            return;
          }
          handleBanReasonSubmit(value);
        }}
        title="封禁原因"
        message="请输入封禁原因："
        placeholder="封禁原因"
      />

      {/* 封禁天数输入 */}
      <PromptDialog
        open={showBanDaysPrompt}
        onClose={() => setShowBanDaysPrompt(false)}
        onConfirm={handleBanDaysSubmit}
        title="封禁天数"
        message="请输入封禁天数："
        placeholder="天数"
        defaultValue="7"
      />

      {/* 成功/错误提示 */}
      {showAlert && (
        <AlertDialog
          open={true}
          onClose={() => setShowAlert(null)}
          title={showAlert.type === 'success' ? '成功' : '错误'}
          message={showAlert.message}
          type={showAlert.type}
        />
      )}
    </div>
  );
}
