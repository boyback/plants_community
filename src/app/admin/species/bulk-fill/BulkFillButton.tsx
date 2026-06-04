'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';

type BoardOption = { id: string; name: string };
type GenusOption = { id: string; name: string; boardId: string };
type Candidate = { id: string; name: string; group: string; fields: string[] };
type Result = { scanned: number; updated: number; candidates: Candidate[] };

const fields = [
  ['growthSpeed', '生长速度'],
  ['summerDormancy', '夏眠'],
  ['lightRequirement', '光照需求'],
  ['idealTemperature', '适宜温度'],
  ['minTemperature', '最低温度'],
  ['maxTemperature', '最高温度'],
  ['humidity', '适宜湿度'],
  ['soil', '配土建议'],
  ['riskTips', 'AI 风险提示'],
] as const;

export function BulkFillButton({
  boards,
  genera,
}: {
  boards: BoardOption[];
  genera: GenusOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [boardId, setBoardId] = useState('');
  const [genusId, setGenusId] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>(fields.map(([key]) => key));
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState('');
  const visibleGenera = useMemo(() => genera.filter((item) => !boardId || item.boardId === boardId), [boardId, genera]);

  const submit = async (dryRun: boolean) => {
    if (busy) return;
    if (!dryRun) {
      const ok = window.confirm('确认批量补齐空缺字段？已有字段不会被覆盖。');
      if (!ok) return;
    }
    setBusy(true);
    setMessage('');
    try {
      const res = await api.post<Result>('/api/admin/species/bulk-fill', {
        dryRun,
        boardId: boardId || undefined,
        genusId: genusId || undefined,
        fields: selectedFields,
      });
      setResult(res);
      setMessage(dryRun ? `预览完成：扫描 ${res.scanned} 个品种，命中 ${res.candidates.length} 个候选。` : `执行完成：扫描 ${res.scanned} 个品种，更新 ${res.updated} 个品种。`);
      if (!dryRun) router.refresh();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : '批量补数据失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div>
        <div className="font-semibold text-amber-900">批量补齐默认养护字段</div>
        <p className="mt-1 text-xs leading-5 text-amber-800">只处理空字段。建议先预览，再执行。</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-amber-900">
          <span className="mb-1 block font-medium">科</span>
          <select value={boardId} onChange={(e) => { setBoardId(e.target.value); setGenusId(''); }} className="h-9 w-full rounded-lg border border-amber-200 bg-white px-2">
            <option value="">全部科</option>
            {boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-amber-900">
          <span className="mb-1 block font-medium">属</span>
          <select value={genusId} onChange={(e) => setGenusId(e.target.value)} className="h-9 w-full rounded-lg border border-amber-200 bg-white px-2">
            <option value="">全部属</option>
            {visibleGenera.map((genus) => <option key={genus.id} value={genus.id}>{genus.name}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {fields.map(([key, label]) => (
          <label key={key} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs text-amber-900">
            <input
              type="checkbox"
              checked={selectedFields.includes(key)}
              onChange={(e) => setSelectedFields((prev) => e.target.checked ? [...prev, key] : prev.filter((item) => item !== key))}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" disabled={busy || selectedFields.length === 0} onClick={() => void submit(true)} className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60">
          {busy ? '处理中...' : '预览'}
        </button>
        <button type="button" disabled={busy || selectedFields.length === 0} onClick={() => void submit(false)} className="rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-60">
          执行补齐
        </button>
      </div>

      {message && <div className="text-xs text-amber-900">{message}</div>}
      {result?.candidates.length ? (
        <div className="max-h-64 overflow-auto rounded-lg border border-amber-100 bg-white">
          <table className="w-full text-xs">
            <tbody>
              {result.candidates.map((item) => (
                <tr key={item.id} className="border-t border-amber-50 first:border-t-0">
                  <td className="px-3 py-2 font-medium text-ink-800">{item.name}</td>
                  <td className="px-3 py-2 text-ink-500">{item.group}</td>
                  <td className="px-3 py-2 text-amber-800">{item.fields.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
