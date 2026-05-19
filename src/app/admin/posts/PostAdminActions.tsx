'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';

export function PostAdminActions({
  postId,
  deleted,
  reviewStatus,
}: {
  postId: string;
  deleted: boolean;
  reviewStatus?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const del = async () => {
    const reason = window.prompt('删除原因(将展示给作者,可选):');
    if (reason === null) return;
    if (!confirm(`确认删除该帖?`)) return;
    setBusy(true);
    try {
      await api.delete(
        `/api/admin/posts/${postId}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '删除失败');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!confirm('确认恢复该帖?')) return;
    setBusy(true);
    try {
      await api.post(`/api/admin/posts/${postId}/restore`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '恢复失败');
    } finally {
      setBusy(false);
    }
  };

  const review = async (action: 'approve' | 'reject') => {
    let reason: string | null = null;
    if (action === 'reject') {
      reason = window.prompt('驳回原因(将展示给作者):');
      if (reason === null) return;
    }
    setBusy(true);
    try {
      await api.patch(`/api/admin/posts/${postId}`, { action, reason });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  if (deleted) {
    return (
      <button
        type="button"
        onClick={restore}
        disabled={busy}
        className="rounded bg-leaf-100 px-2 py-1 text-[10px] text-leaf-700 hover:bg-leaf-200"
      >
        恢复
      </button>
    );
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {reviewStatus === 'pending' && (
        <>
          <button
            type="button"
            onClick={() => review('approve')}
            disabled={busy}
            className="rounded bg-leaf-500 px-2 py-1 text-[10px] text-white hover:bg-leaf-600"
          >
            ✓ 通过
          </button>
          <button
            type="button"
            onClick={() => review('reject')}
            disabled={busy}
            className="rounded bg-amber-100 px-2 py-1 text-[10px] text-amber-700 hover:bg-amber-200"
          >
            驳回
          </button>
        </>
      )}
      {reviewStatus === 'rejected' && (
        <button
          type="button"
          onClick={() => review('approve')}
          disabled={busy}
          className="rounded bg-leaf-500 px-2 py-1 text-[10px] text-white hover:bg-leaf-600"
        >
          重新通过
        </button>
      )}
      <button
        type="button"
        onClick={del}
        disabled={busy}
        className="rounded bg-rose-100 px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-200"
      >
        删除
      </button>
    </div>
  );
}
