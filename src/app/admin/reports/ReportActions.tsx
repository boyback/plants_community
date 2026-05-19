'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';

export function ReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const act = async (status: 'resolved' | 'rejected') => {
    const note = window.prompt(
      status === 'resolved' ? '处理备注(例:已删帖并警告作者)' : '驳回原因(可选)'
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
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => act('resolved')}
        className="rounded bg-leaf-600 px-3 py-1 text-[11px] text-white hover:bg-leaf-700"
      >
        ✓ 已处理
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => act('rejected')}
        className="rounded border border-ink-200 px-3 py-1 text-[11px] text-ink-700 hover:bg-ink-50"
      >
        驳回
      </button>
    </div>
  );
}
