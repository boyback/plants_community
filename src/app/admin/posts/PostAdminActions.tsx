'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import styles from './PostAdminActions.module.scss';
import { cx } from '@/lib/style-utils';



export function PostAdminActions({
  postId,
  deleted,
  reviewStatus




}: {postId: string;deleted: boolean;reviewStatus?: string;}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const del = async () => {
    const reason = window.prompt("删除原因(将展示给作者,可选):");
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
      reason = window.prompt("驳回原因(将展示给作者):");
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
        className={cx(styles.r_07389a77, styles.r_f2b23104, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_5f6a59f1, styles.r_d8a68f7c)}>

        恢复
      </button>);

  }

  return (
    <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77c08e01, styles.r_44ee8ba0)}>
      {reviewStatus === 'pending' &&
      <>
          <button
          type="button"
          onClick={() => review('approve')}
          disabled={busy}
          className={cx(styles.r_07389a77, styles.r_45499621, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_72a4c7cd, styles.r_24f5f8c9)}>

            ✓ 通过
          </button>
          <button
          type="button"
          onClick={() => review('reject')}
          disabled={busy}
          className={cx(styles.r_07389a77, styles.r_735dd972, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_85d79ebf, styles.r_bfa526ce)}>

            驳回
          </button>
        </>
      }
      {reviewStatus === 'rejected' &&
      <button
        type="button"
        onClick={() => review('approve')}
        disabled={busy}
        className={cx(styles.r_07389a77, styles.r_45499621, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_72a4c7cd, styles.r_24f5f8c9)}>

          重新通过
        </button>
      }
      <button
        type="button"
        onClick={del}
        disabled={busy}
        className={cx(styles.r_07389a77, styles.r_e0467cf5, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_b54428d1, styles.r_fd25c495)}>

        删除
      </button>
    </div>);

}