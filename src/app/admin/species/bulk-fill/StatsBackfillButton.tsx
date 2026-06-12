'use client';

import { useState } from 'react';
import { api, ApiError } from "@/lib/client-api";
import styles from './StatsBackfillButton.module.scss';
import { cx } from '@/lib/style-utils';



export function StatsBackfillButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async () => {
    if (busy) return;
    const ok = window.confirm('确认重建图鉴热度历史统计？会先清空 species_daily_stats 再按历史数据回填。');
    if (!ok) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await api.post<Record<string, number>>("/api/admin/species/stats-backfill", {});
      setMessage(`回填完成：posts ${res.posts}，collects ${res.collects}，compares ${res.compares}，contributions ${res.contributions}，ratings ${res.ratings}。`);
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : '热度统计回填失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_7ebecbb6, styles.r_8e63407b)}>
      <div className={cx(styles.r_e83a7042, styles.r_fa5fa43b)}>热度趋势历史回填</div>
      <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7054e276, styles.r_e7eab4cb)}>按历史帖子、收藏、对比、评分、已通过贡献重建日统计。浏览量只能从上线统计后开始积累。</p>
      <button type="button" disabled={busy} onClick={() => void run()} className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_b81efa1b, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_359090c2, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_bad69f8a, styles.r_d463b664)}>
        {busy ? '回填中...' : '重建热度统计'}
      </button>
      {message && <div className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_fa5fa43b)}>{message}</div>}
    </div>);

}