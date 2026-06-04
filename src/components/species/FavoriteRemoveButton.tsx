'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';

export function FavoriteRemoveButton({ speciesId }: { speciesId: string }) {
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
      className="rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
    >
      {busy ? '取消中...' : '取消收藏'}
    </button>
  );
}
