'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import styles from './FavoriteRemoveButton.module.scss';
import { cx } from '@/lib/style-utils';



export function FavoriteRemoveButton({ speciesId }: {speciesId: string;}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.post(`/api/species/${speciesId}/collect`);
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '取消收藏失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={remove}
      className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_959f4a9f, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_2689f395, styles.r_b54428d1, styles.r_85cfcc24, styles.r_d463b664)}>

      {busy ? '取消中...' : '取消收藏'}
    </button>);

}