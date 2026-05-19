'use client';

import { ConfirmPopover } from '@/components/ui/ConfirmPopover';
import { toast } from '@/components/ui/Toast';

interface PostAdminActionsProps {
  postId: string;
  postTitle: string;
  isLocked?: boolean;
  canLock: boolean;
  canDelete: boolean;
  onDeleted?: () => void;
}

export function PostAdminActions({
  postId,
  postTitle,
  isLocked,
  canLock,
  canDelete,
  onDeleted,
}: PostAdminActionsProps) {
  const handleLock = async () => {
    const res = await fetch(`/api/posts/${postId}/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: isLocked ? 'unlock' : 'lock' }),
    });
    if (res.ok) {
      toast.success(isLocked ? '已解锁' : '已锁定');
      globalThis.location.reload();
    } else {
      toast.error('操作失败');
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/posts/${postId}/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', reason: '管理员删除' }),
    });
    if (res.ok) {
      toast.success('已删除');
      onDeleted?.();
    } else {
      toast.error('删除失败');
    }
  };

  return (
    <>
      {canLock && (
        <ConfirmPopover
          title={isLocked ? '确定解锁？' : '确定锁定？'}
          confirmText={isLocked ? '解锁' : '锁定'}
          onConfirm={handleLock}
        >
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-1.5 text-[11px] text-ink-700 hover:bg-leaf-50 text-center"
          >
            {isLocked ? '解锁' : '锁定'}
          </button>
        </ConfirmPopover>
      )}
      {canDelete && <div className="border-t border-leaf-50 my-0.5" />}
      {canDelete && (
        <ConfirmPopover
          title="确定删除这篇帖子？"
          confirmText="删除"
          danger
          onConfirm={handleDelete}
        >
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-1.5 text-[11px] text-rose-600 hover:bg-rose-50 text-center"
          >
            删除
          </button>
        </ConfirmPopover>
      )}
    </>
  );
}
