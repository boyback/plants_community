'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client-api';

interface Species {
  id: string;
  genusId?: string;
  slug: string;
  name: string;
  latinName: string | null;
  description?: string;
  cover: string | null;
  orderIdx: number;
}

export function SpeciesEditDialog({
  genusId,
  species,
  onClose,
  onSaved,
}: {
  genusId: string;
  species: Species | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [slug, setSlug] = useState(species?.slug ?? '');
  const [name, setName] = useState(species?.name ?? '');
  const [latinName, setLatinName] = useState(species?.latinName ?? '');
  const [description, setDescription] = useState(species?.description ?? '');
  const [cover, setCover] = useState(species?.cover ?? '');
  const [orderIdx, setOrderIdx] = useState(species?.orderIdx ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!slug.trim() || !name.trim()) return setErr('slug / name 必填');
    setBusy(true);
    try {
      const body = {
        genusId,
        slug: slug.trim(),
        name: name.trim(),
        latinName: latinName.trim() || null,
        description: description.trim(),
        cover: cover.trim() || null,
        orderIdx,
      };
      if (species) {
        await api.patch(`/api/admin/species/${species.id}`, body);
      } else {
        await api.post('/api/admin/species', body);
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
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-base font-semibold">{species ? '编辑品种' : '新建品种'}</h3>

        <div className="space-y-3 text-xs">
          <Field label="slug *">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2 font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="echeveria-elegans" />
          </Field>
          <Field label="中文名 *">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="月影" />
          </Field>
          <Field label="拉丁名">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2 italic" value={latinName ?? ''} onChange={(e) => setLatinName(e.target.value)} placeholder="Echeveria elegans" />
          </Field>
          <Field label="描述">
            <textarea className="w-full min-h-[60px] rounded-lg border border-ink-200 px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </Field>
          <Field label="封面图 URL(选填)">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2 font-mono text-[11px]" value={cover ?? ''} onChange={(e) => setCover(e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="排序(越小越前)">
            <input type="number" className="w-32 rounded-lg border border-ink-200 px-3 py-2" value={orderIdx} onChange={(e) => setOrderIdx(Number(e.target.value))} />
          </Field>
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
