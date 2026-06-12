'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import styles from './ProductRowActions.module.scss';
import { cx } from '@/lib/style-utils';



export function ProductRowActions({ productId, status }: {productId: string;status: string;}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const toggle = async (nextStatus: 'on_sale' | 'off_shelf') => {
    const reason = nextStatus === 'off_shelf' ?
    window.prompt("下架原因(将记录到日志):", '违规') :
    '';
    if (reason === null) return;
    if (!confirm(nextStatus === 'off_shelf' ? '确认下架?' : '确认重新上架?')) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/products/${productId}`, { status: nextStatus, reason });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'off_shelf') {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => toggle('on_sale')}
        className={cx(styles.r_07389a77, styles.r_f2b23104, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_5f6a59f1, styles.r_d8a68f7c)}>

        上架
      </button>);

  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => toggle('off_shelf')}
      className={cx(styles.r_07389a77, styles.r_e0467cf5, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_b54428d1, styles.r_fd25c495)}>

      下架
    </button>);

}