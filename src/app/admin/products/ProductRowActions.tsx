'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';

export function ProductRowActions({ productId, status }: { productId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const toggle = async (nextStatus: 'on_sale' | 'off_shelf') => {
    const reason = nextStatus === 'off_shelf'
      ? window.prompt('下架原因(将记录到日志):', '违规')
      : '';
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
        className="rounded bg-leaf-100 px-2 py-1 text-[10px] text-leaf-700 hover:bg-leaf-200"
      >
        上架
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => toggle('off_shelf')}
      className="rounded bg-rose-100 px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-200"
    >
      下架
    </button>
  );
}
