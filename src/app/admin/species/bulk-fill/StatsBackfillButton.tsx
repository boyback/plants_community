'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client-api';

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
      const res = await api.post<Record<string, number>>('/api/admin/species/stats-backfill', {});
      setMessage(`回填完成：posts ${res.posts}，collects ${res.collects}，compares ${res.compares}，contributions ${res.contributions}，ratings ${res.ratings}。`);
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : '热度统计回填失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-leaf-200 bg-leaf-50 p-4">
      <div className="font-semibold text-leaf-900">热度趋势历史回填</div>
      <p className="mt-1 text-xs leading-5 text-leaf-800">按历史帖子、收藏、对比、评分、已通过贡献重建日统计。浏览量只能从上线统计后开始积累。</p>
      <button type="button" disabled={busy} onClick={() => void run()} className="mt-3 rounded-lg bg-leaf-700 px-4 py-2 text-xs font-semibold text-white hover:bg-leaf-800 disabled:opacity-60">
        {busy ? '回填中...' : '重建热度统计'}
      </button>
      {message && <div className="mt-2 text-xs text-leaf-900">{message}</div>}
    </div>
  );
}
