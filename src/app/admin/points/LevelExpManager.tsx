'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';

export type LevelExpRow = {
  level: number;
  name: string;
  expRequired: number;
};

export function LevelExpManager({ rows }: { rows: LevelExpRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState<LevelExpRow[]>(rows);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const updateItem = (level: number, patch: Partial<LevelExpRow>) => {
    setItems((list) => list.map((item) => (item.level === level ? { ...item, ...patch } : item)));
  };

  const save = async () => {
    const ordered = [...items].sort((a, b) => a.level - b.level);
    if (ordered[0]?.expRequired !== 0) {
      toast.error('Lv.1 所需经验必须为 0');
      return;
    }
    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i].expRequired <= ordered[i - 1].expRequired) {
        toast.error(`Lv.${ordered[i].level} 所需经验必须大于 Lv.${ordered[i - 1].level}`);
        return;
      }
    }

    setBusy(true);
    try {
      await api.patch('/api/admin/level-exp', { levels: ordered, note });
      toast.success('已保存等级经验配置');
      router.refresh();
      setNote('');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-ink-100 bg-white p-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-ink-800">等级经验配置</h2>
        <p className="mt-1 text-xs text-ink-500">
          配置累计经验 EXP 达到多少时升到对应等级。这里不是积分余额，积分余额用于消费和兑换。
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-ink-100">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="px-3 py-2 text-left">等级</th>
              <th className="px-3 py-2 text-left">等级名</th>
              <th className="px-3 py-2 text-left">累计经验 EXP</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.level} className="border-t border-ink-100">
                <td className="px-3 py-2 font-mono text-ink-600">Lv.{item.level}</td>
                <td className="px-3 py-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateItem(item.level, { name: e.target.value })}
                    className="w-full rounded-lg border border-ink-200 px-2 py-1.5 outline-none focus:border-ink-400"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={item.expRequired}
                    disabled={item.level === 1}
                    onChange={(e) =>
                      updateItem(item.level, {
                        expRequired: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full rounded-lg border border-ink-200 px-2 py-1.5 outline-none focus:border-ink-400 disabled:bg-ink-50 disabled:text-ink-400"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <textarea
        className="mt-3 w-full rounded-lg border border-ink-200 px-3 py-2 text-xs outline-none focus:border-ink-400"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="备注原因(可选)"
      />
      <button type="button" className="btn-primary mt-3 w-full !text-xs" disabled={busy} onClick={save}>
        {busy ? '保存中...' : '保存等级经验配置'}
      </button>
    </section>
  );
}
