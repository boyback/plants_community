'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/client-api';

interface Genus {
  id: string;
  boardId: string;
  slug: string;
  name: string;
  latinName: string | null;
  description: string;
  cover: string | null;
  orderIdx: number;
  speciesCount: number;
  postCount: number;
}

export function GenusClient({
  boardId,
  initial,
}: {
  boardId: string;
  initial: Genus[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Genus | 'new' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const remove = async (g: Genus) => {
    if (g.speciesCount > 0 || g.postCount > 0) {
      alert('该属下还有品种或帖子,无法删除');
      return;
    }
    if (!confirm(`删除「${g.name}」属?`)) return;
    setBusy(g.id);
    try {
      await api.delete(`/api/admin/genera/${g.id}`);
      refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '删除失败');
    } finally {
      setBusy(null);
    }
  };

  const updateOrder = async (g: Genus, n: number) => {
    if (n === g.orderIdx) return;
    setBusy(g.id);
    try {
      await api.patch(`/api/admin/genera/${g.id}`, { orderIdx: n });
      refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-white hover:bg-ink-700"
        >
          + 新建属
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="px-2 py-2 text-left">名字 / slug</th>
              <th className="px-2 py-2 text-left">拉丁名</th>
              <th className="px-2 py-2 text-right">品种/帖</th>
              <th className="px-2 py-2 text-center">排序</th>
              <th className="px-2 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((g) => (
              <tr key={g.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                <td className="px-2 py-2">
                  <div className="font-medium">{g.name}</div>
                  <div className="text-[10px] text-ink-500 font-mono">{g.slug}</div>
                </td>
                <td className="px-2 py-2 italic text-ink-600">{g.latinName ?? '—'}</td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-600">
                  {g.speciesCount} / {g.postCount}
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="number"
                    defaultValue={g.orderIdx}
                    onBlur={(e) => updateOrder(g, Number(e.target.value))}
                    disabled={busy === g.id}
                    className="w-14 rounded border border-ink-200 px-1.5 py-0.5 text-center text-[11px]"
                  />
                </td>
                <td className="px-2 py-2 text-right">
                  <Link
                    href={`/admin/species?genusId=${g.id}`}
                    className="rounded border border-ink-200 px-2 py-1 text-[10px] hover:bg-ink-50"
                  >
                    品种
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditing(g)}
                    className="ml-1 rounded border border-ink-200 px-2 py-1 text-[10px] hover:bg-ink-50"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(g)}
                    disabled={busy === g.id}
                    className="ml-1 rounded bg-rose-100 px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-200"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {initial.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-ink-500">
                  还没有属,点右上角「+ 新建属」开始
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <GenusEditDialog
          boardId={boardId}
          genus={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function GenusEditDialog({
  boardId,
  genus,
  onClose,
  onSaved,
}: {
  boardId: string;
  genus: Genus | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [slug, setSlug] = useState(genus?.slug ?? '');
  const [name, setName] = useState(genus?.name ?? '');
  const [latinName, setLatinName] = useState(genus?.latinName ?? '');
  const [description, setDescription] = useState(genus?.description ?? '');
  const [cover, setCover] = useState(genus?.cover ?? '');
  const [orderIdx, setOrderIdx] = useState(genus?.orderIdx ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!slug.trim() || !name.trim()) return setErr('slug / name 必填');
    setBusy(true);
    try {
      const body = {
        boardId,
        slug: slug.trim(),
        name: name.trim(),
        latinName: latinName.trim() || null,
        description: description.trim(),
        cover: cover.trim() || null,
        orderIdx,
      };
      if (genus) {
        await api.patch(`/api/admin/genera/${genus.id}`, body);
      } else {
        await api.post('/api/admin/genera', body);
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
        <h3 className="mb-4 text-base font-semibold">{genus ? '编辑属' : '新建属'}</h3>

        <div className="space-y-3 text-xs">
          <Field label="slug *">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2 font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="echeveria" />
          </Field>
          <Field label="中文名 *">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="拟石莲花属" />
          </Field>
          <Field label="拉丁名">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2 italic" value={latinName ?? ''} onChange={(e) => setLatinName(e.target.value)} placeholder="Echeveria" />
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
