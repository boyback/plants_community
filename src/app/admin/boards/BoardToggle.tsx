'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';

export function BoardToggle({
  type,
  id,
  enabled,
  compact,
}: {
  type: 'category';
  id: string;
  enabled: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState(enabled);

  const toggle = async () => {
    setBusy(true);
    const next = !value;
    try {
      await api.patch(`/api/admin/boards/${type}/${id}`, { enabled: next });
      setValue(next);
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={
        (value
          ? 'bg-leaf-500 text-white'
          : 'bg-ink-200 text-ink-600') +
        (compact
          ? ' rounded px-2 py-0.5 text-[10px]'
          : ' rounded px-2.5 py-1 text-xs')
      }
    >
      {value ? '启用中' : '已禁用'}
    </button>
  );
}
