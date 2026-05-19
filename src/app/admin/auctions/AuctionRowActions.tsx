'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';

export function AuctionRowActions({ id, status }: { id: string; status: string }) {
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
    const reason = window.prompt('取消原因:', '');
    if (reason === null) return;
    if (!confirm('确认取消本场拍卖?')) return;
    void doPatch({ action: 'cancel', reason });
  };

  const finish = () => {
    if (!confirm('确认强制结束?将按当前最高价出售(无出价则流拍)')) return;
    void doPatch({ action: 'finish' });
  };

  if (!canCancel && !canFinish) {
    return <span className="text-[10px] text-ink-400">—</span>;
  }

  return (
    <div className="inline-flex gap-1">
      {canFinish && (
        <button
          type="button"
          disabled={busy}
          onClick={finish}
          className="rounded bg-amber-100 px-2 py-1 text-[10px] text-amber-700 hover:bg-amber-200"
        >
          强结
        </button>
      )}
      {canCancel && (
        <button
          type="button"
          disabled={busy}
          onClick={cancel}
          className="rounded bg-rose-100 px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-200"
        >
          取消
        </button>
      )}
    </div>
  );
}
