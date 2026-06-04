'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/client-api';

type SimilarityItem = {
  similarSpeciesId: string;
  score: number;
  reason: string;
  name?: string;
  latinName?: string;
};

type SpeciesOption = {
  id: string;
  slug: string;
  name: string;
  latinName: string;
  familySlug: string;
  genusSlug: string;
};

export function SpeciesSimilarityEditor({ speciesId }: { speciesId?: string }) {
  const [items, setItems] = useState<SimilarityItem[]>([]);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<SpeciesOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [syncReverse, setSyncReverse] = useState(true);

  useEffect(() => {
    if (!speciesId) return;
    let cancelled = false;
    setLoading(true);
    api.get<Array<{ similarSpeciesId: string; score: number; reason: string | null; name: string; latinName: string }>>(`/api/admin/species/${speciesId}/similarities`)
      .then((rows) => {
        if (cancelled) return;
        setItems(rows.map((row) => ({
          similarSpeciesId: row.similarSpeciesId,
          score: row.score,
          reason: row.reason ?? '',
          name: row.name,
          latinName: row.latinName,
        })));
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof ApiError ? e.message : '加载相似品种失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [speciesId]);

  useEffect(() => {
    if (!speciesId || query.trim().length < 1) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      api.get<SpeciesOption[]>(`/api/species?q=${encodeURIComponent(query.trim())}&limit=12&excludeId=${encodeURIComponent(speciesId)}`)
        .then((rows) => {
          if (!cancelled) setOptions(rows);
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, speciesId]);

  const selectedIds = useMemo(() => new Set(items.map((item) => item.similarSpeciesId)), [items]);

  const addOption = (option: SpeciesOption) => {
    if (selectedIds.has(option.id)) return;
    setItems((prev) => [
      ...prev,
      {
        similarSpeciesId: option.id,
        score: 80,
        reason: '',
        name: option.name,
        latinName: option.latinName,
      },
    ]);
    setQuery('');
    setOptions([]);
  };

  const save = async () => {
    if (!speciesId) return;
    setErr(null);
    setSaving(true);
    try {
      await api.put(`/api/admin/species/${speciesId}/similarities`, {
        syncReverse,
        items: items.map((item) => ({
          speciesId: item.similarSpeciesId,
          score: Number(item.score) || 80,
          reason: item.reason.trim(),
        })),
      });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '保存相似品种失败');
    } finally {
      setSaving(false);
    }
  };

  if (!speciesId) {
    return <div className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">新建品种保存后再配置相似品种。</div>;
  }

  return (
    <div className="space-y-3">
      {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">{err}</div>}
      {loading && <div className="rounded-lg bg-ink-50 px-3 py-2 text-ink-500">加载中...</div>}

      <div className="relative">
        <input
          className="w-full rounded-lg border border-ink-200 px-3 py-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索中文名 / 拉丁名 / slug"
        />
        {(options.length > 0 || searching) && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-ink-100 bg-white shadow-lg">
            {searching && <div className="px-3 py-2 text-xs text-ink-500">搜索中...</div>}
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={selectedIds.has(option.id)}
                onClick={() => addOption(option)}
                className="block w-full px-3 py-2 text-left hover:bg-leaf-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="text-sm font-medium text-ink-800">{option.name}</div>
                <div className="text-[11px] text-ink-500">{option.latinName} · {option.familySlug}/{option.genusSlug}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.similarSpeciesId} className="grid grid-cols-[minmax(0,1fr)_80px_1.4fr_auto] gap-2 rounded-lg border border-ink-100 p-2">
            <div className="min-w-0 rounded-lg bg-ink-50 px-3 py-2">
              <div className="truncate text-sm font-medium text-ink-800">{item.name ?? item.similarSpeciesId}</div>
              {item.latinName && <div className="truncate text-[11px] italic text-ink-500">{item.latinName}</div>}
            </div>
            <input
              type="number"
              min={1}
              max={100}
              className="rounded-lg border border-ink-200 px-3 py-2"
              value={item.score}
              onChange={(e) => setItems((prev) => prev.map((row, i) => i === index ? { ...row, score: Number(e.target.value) } : row))}
            />
            <input
              className="rounded-lg border border-ink-200 px-3 py-2"
              value={item.reason}
              onChange={(e) => setItems((prev) => prev.map((row, i) => i === index ? { ...row, reason: e.target.value } : row))}
              placeholder="相似理由"
            />
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
              className="rounded-lg border border-rose-200 px-2 py-1 text-rose-700 hover:bg-rose-50"
            >
              删除
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-ink-600">
          <input type="checkbox" checked={syncReverse} onChange={(e) => setSyncReverse(e.target.checked)} />
          同步双向关系
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-lg bg-ink-800 px-3 py-2 text-white hover:bg-ink-700 disabled:opacity-60"
        >
          {saving ? '保存中...' : '保存相似关系'}
        </button>
      </div>
    </div>
  );
}
