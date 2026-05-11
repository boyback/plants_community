'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client-api';

interface Category {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  kind: string;
  description?: string;
  cover: string;
  icon: string;
  members?: number;
  orderIdx: number;
  enabled: boolean;
}

export function CategoryEditDialog({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [name, setName] = useState(category?.name ?? '');
  const [latinName, setLatinName] = useState(category?.latinName ?? '');
  const [kind, setKind] = useState(category?.kind ?? 'family');
  const [description, setDescription] = useState(category?.description ?? '');
  const [cover, setCover] = useState(category?.cover ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '🌿');
  const [orderIdx, setOrderIdx] = useState(category?.orderIdx ?? 0);
  const [enabled, setEnabled] = useState(category?.enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!slug.trim() || !name.trim() || !cover.trim()) {
      return setErr('slug / name / cover 必填');
    }
    setBusy(true);
    try {
      const body = {
        slug: slug.trim(),
        name: name.trim(),
        latinName: latinName.trim() || null,
        kind,
        description: description.trim(),
        cover: cover.trim(),
        icon: icon.trim() || '🌿',
        orderIdx,
        enabled,
      };
      if (category) {
        await api.patch(`/api/admin/categories/${category.id}`, body);
      } else {
        await api.post('/api/admin/categories', body);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4" onClick={onClose}>
      <div
        className="card w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold">{category ? '编辑板块' : '新建板块'}</h3>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <Field label="slug(英文 ID)*">
              <input className="w-full rounded-lg border border-ink-200 px-3 py-2 font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="jingtian" />
            </Field>
            <Field label="图标 emoji">
              <input className="w-full rounded-lg border border-ink-200 px-3 py-2 text-center text-2xl" value={icon} onChange={(e) => setIcon(e.target.value)} />
            </Field>
          </div>
          <Field label="中文名 *">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="景天科" />
          </Field>
          <Field label="拉丁名">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2 italic" value={latinName ?? ''} onChange={(e) => setLatinName(e.target.value)} placeholder="Crassulaceae" />
          </Field>
          <Field label="类型">
            <select className="w-full rounded-lg border border-ink-200 px-3 py-2" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="family">family — 植物科</option>
              <option value="discussion">discussion — 讨论区</option>
              <option value="market">market — 交易区</option>
            </select>
          </Field>
          <Field label="描述">
            <textarea className="w-full min-h-[60px] rounded-lg border border-ink-200 px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </Field>
          <Field label="封面图 URL *">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2 font-mono text-[11px]" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://..." />
          </Field>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-32 w-full rounded-lg object-cover" />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="排序(越小越前)">
              <input type="number" className="w-full rounded-lg border border-ink-200 px-3 py-2" value={orderIdx} onChange={(e) => setOrderIdx(Number(e.target.value))} />
            </Field>
            <Field label="启用">
              <label className="inline-flex h-9 items-center gap-2">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                <span>{enabled ? '启用' : '停用'}</span>
              </label>
            </Field>
          </div>
        </div>

        {err && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-ink-200 px-3 py-2 text-xs hover:bg-ink-50">取消</button>
          <button type="button" disabled={busy} onClick={submit} className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-white hover:bg-ink-700">
            {busy ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-medium text-ink-600">{label}</div>
      {children}
    </label>
  );
}
