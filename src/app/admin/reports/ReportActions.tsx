'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import styles from './ReportActions.module.scss';
import { cx } from '@/lib/style-utils';



export function ReportActions({ reportId }: {reportId: string;}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (status: 'resolved' | 'rejected') => {
    const note = window.prompt(
      status === 'resolved' ? "处理备注(例:已删帖并警告作者)" : '驳回原因(可选)'
    );
    if (note === null) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/reports/${reportId}`, { status, note });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_44ee8ba0)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => act('resolved')}
        className={cx(styles.r_07389a77, styles.r_6bceb016, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_d058ca6d, styles.r_72a4c7cd, styles.r_e269e58c)}>

        ✓ 已处理
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => act('rejected')}
        className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_d058ca6d, styles.r_eb6abb1f, styles.r_5399e21f)}>

        驳回
      </button>
    </div>);

}