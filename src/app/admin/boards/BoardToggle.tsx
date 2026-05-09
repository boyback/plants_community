'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';

/** 启用/停用按钮 */
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

/**
 * 排序权重输入框(orderIdx 越小越靠前)。
 * Sidebar 拉热门板块时按 orderIdx asc 排序,所以这个数字直接控制板块出现在用户首屏的位置。
 */
export function BoardOrderInput({
  id,
  initialOrderIdx,
}: {
  id: string;
  initialOrderIdx: number;
}) {
  const [val, setVal] = useState(initialOrderIdx);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const save = async (next: number) => {
    if (next === initialOrderIdx) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/boards/category/${id}`, { orderIdx: next });
      router.refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '操作失败');
      setVal(initialOrderIdx);
    } finally {
      setBusy(false);
    }
  };

  return (
    <input
      type="number"
      value={val}
      onChange={(e) => setVal(Number(e.target.value))}
      onBlur={() => save(val)}
      disabled={busy}
      title="排序(越小越靠前)"
      className="w-14 rounded border border-ink-200 px-1.5 py-0.5 text-center text-[11px]"
    />
  );
}
