'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';

interface BadgeItem {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  obtainedCount: number;
}

export function BadgeGrantClient({
  badges,
  userTotal,
}: {
  badges: BadgeItem[];
  userTotal: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<BadgeItem | null>(null);
  const [userIds, setUserIds] = useState('');
  const [toAll, setToAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const grant = async () => {
    if (!selected) return;
    const ids = userIds.split(/\s+|,|;/).map((s) => s.trim()).filter(Boolean);
    if (!toAll && ids.length === 0) return toast.error('请输入至少一个用户 ID,或勾选「发给所有用户」');
    if (toAll && !confirm(`确认给全部 ${userTotal} 个用户发放徽章「${selected.name}」?此操作不可撤销。`)) return;
    if (!toAll && !confirm(`给 ${ids.length} 个用户发放徽章「${selected.name}」?`)) return;
    setBusy(true);
    try {
      const r = await api.post<{ granted: number; total: number; badgeName: string }>(
        '/api/admin/badges/grant',
        {
          badgeId: selected.id,
          userIds: toAll ? undefined : ids,
          all: toAll,
        }
      );
      setResult(`✅ 已给 ${r.granted}/${r.total} 人发放「${r.badgeName}」`);
      setUserIds('');
      setToAll(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '发放失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🏅 徽章发放</h1>
        <p className="mt-1 text-xs text-ink-600">点击下方徽章卡片选择,然后输入用户 ID 列表发放</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        {badges.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              setSelected(b);
              setResult(null);
            }}
            className={
              'flex flex-col items-center rounded-xl border-2 bg-white p-4 text-center transition-all ' +
              (selected?.id === b.id
                ? 'border-ink-800 shadow-lg'
                : 'border-ink-100 hover:border-ink-300')
            }
          >
            <span className="text-3xl">{b.icon}</span>
            <div className="mt-2 text-xs font-medium text-ink-800">{b.name}</div>
            <div className="mt-0.5 line-clamp-2 text-[10px] text-ink-500">{b.description}</div>
            <div className="mt-2 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-700">
              已发 {b.obtainedCount}
            </div>
          </button>
        ))}
        {badges.length === 0 && (
          <div className="col-span-full rounded-xl border border-ink-100 bg-white p-10 text-center text-sm text-ink-500">
            没有徽章(请先在 Prisma Studio 创建 Badge)
          </div>
        )}
      </div>

      {selected && (
        <section className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">
            发放「{selected.icon} {selected.name}」
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-ink-600">
                用户 ID 列表(空格 / 逗号 / 换行分隔)
              </label>
              <textarea
                className="w-full min-h-[100px] rounded-lg border border-ink-200 px-3 py-2 font-mono text-[11px]"
                value={userIds}
                onChange={(e) => setUserIds(e.target.value)}
                placeholder="cmojwbr74000czc8wxsx0umvo&#10;cmojwbr79000dzc8w2nnm2ehu"
                disabled={toAll}
              />
            </div>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={toAll}
                onChange={(e) => setToAll(e.target.checked)}
              />
              <span>发给全部 {userTotal} 个用户(小心使用)</span>
            </label>
          </div>

          {result && (
            <div className="mt-3 rounded-lg bg-leaf-50 px-3 py-2 text-xs text-leaf-700">
              {result}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setResult(null);
              }}
              className="rounded-lg border border-ink-200 px-3 py-2 text-xs hover:bg-ink-50"
            >
              取消
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={grant}
              className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-white hover:bg-ink-700"
            >
              {busy ? '发放中...' : '发放'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
