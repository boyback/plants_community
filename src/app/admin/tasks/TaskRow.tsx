'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';

interface Task {
  id: string;
  slug: string;
  kind: string;
  title: string;
  description: string;
  icon: string;
  rewardPoints: number;
  rewardExp: number;
  rewardActivity: number;
  target: number;
  triggerEvent: string;
  enabled: boolean;
}

export function TaskRow({ task }: { task: Task }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    rewardPoints: task.rewardPoints,
    rewardExp: task.rewardExp,
    rewardActivity: task.rewardActivity,
    target: task.target,
  });

  const patch = async (body: unknown) => {
    setBusy(true);
    try {
      await api.patch(`/api/admin/tasks/${task.id}`, body);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    void patch(draft).then(() => setEditing(false));
  };

  return (
    <tr className="border-t border-ink-100">
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ enabled: !task.enabled })}
          className={
            task.enabled
              ? 'rounded bg-leaf-100 px-2 py-0.5 text-[10px] text-leaf-700 hover:bg-leaf-200'
              : 'rounded bg-ink-100 px-2 py-0.5 text-[10px] text-ink-600 hover:bg-ink-200'
          }
        >
          {task.enabled ? '启用' : '停用'}
        </button>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span>{task.icon}</span>
          <div>
            <div className="font-medium text-ink-800">{task.title}</div>
            <div className="text-[10px] text-ink-500 font-mono">{task.slug}</div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-ink-600">{task.triggerEvent}</td>

      {editing ? (
        <>
          <NumCell value={draft.target} onChange={(v) => setDraft({ ...draft, target: v })} min={1} />
          <NumCell value={draft.rewardPoints} onChange={(v) => setDraft({ ...draft, rewardPoints: v })} />
          <NumCell value={draft.rewardExp} onChange={(v) => setDraft({ ...draft, rewardExp: v })} />
          <NumCell value={draft.rewardActivity} onChange={(v) => setDraft({ ...draft, rewardActivity: v })} />
          <td className="px-3 py-2 text-right">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="mr-1 rounded bg-leaf-600 px-2 py-0.5 text-[10px] text-white"
            >
              存
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft({
                  rewardPoints: task.rewardPoints,
                  rewardExp: task.rewardExp,
                  rewardActivity: task.rewardActivity,
                  target: task.target,
                });
              }}
              className="rounded border border-ink-200 px-2 py-0.5 text-[10px]"
            >
              取
            </button>
          </td>
        </>
      ) : (
        <>
          <td className="px-3 py-2 text-right tabular-nums">{task.target}</td>
          <td className="px-3 py-2 text-right tabular-nums text-rose-600">{task.rewardPoints}</td>
          <td className="px-3 py-2 text-right tabular-nums text-leaf-600">{task.rewardExp}</td>
          <td className="px-3 py-2 text-right tabular-nums text-violet-600">{task.rewardActivity}</td>
          <td className="px-3 py-2 text-right">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-ink-200 px-2 py-0.5 text-[10px] hover:bg-ink-50"
            >
              编辑
            </button>
          </td>
        </>
      )}
    </tr>
  );
}

function NumCell({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <td className="px-2 py-1">
      <input
        type="number"
        min={min}
        className="w-16 rounded border border-ink-200 px-1 py-0.5 text-right text-[11px] tabular-nums"
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
      />
    </td>
  );
}
