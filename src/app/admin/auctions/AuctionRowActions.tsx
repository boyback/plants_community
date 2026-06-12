'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import styles from './AuctionRowActions.module.scss';
import { cx } from '@/lib/style-utils';



export function AuctionRowActions({ id, status }: {id: string;status: string;}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const canCancel = status === 'scheduled' || status === 'live' || status === 'draft';
  const canFinish = status === 'live';

  const doPatch = async (body: unknown) => {
    setBusy(true);
    try {
      await api.patch(`/api/admin/auctions/${id}`, body);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    const reason = window.prompt("取消原因:", '');
    if (reason === null) return;
    if (!confirm('确认取消本场拍卖?')) return;
    void doPatch({ action: 'cancel', reason });
  };

  const finish = () => {
    if (!confirm('确认强制结束?将按当前最高价出售(无出价则流拍)')) return;
    void doPatch({ action: 'finish' });
  };

  if (!canCancel && !canFinish) {
    return <span className={cx(styles.r_1dc571a3, styles.r_66a36c90)}>—</span>;
  }

  return (
    <div className={cx(styles.r_52083e7d, styles.r_44ee8ba0)}>
      {canFinish &&
      <button
        type="button"
        disabled={busy}
        onClick={finish}
        className={cx(styles.r_07389a77, styles.r_735dd972, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_85d79ebf, styles.r_bfa526ce)}>

          强结
        </button>
      }
      {canCancel &&
      <button
        type="button"
        disabled={busy}
        onClick={cancel}
        className={cx(styles.r_07389a77, styles.r_e0467cf5, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_b54428d1, styles.r_fd25c495)}>

          取消
        </button>
      }
    </div>);

}