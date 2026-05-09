'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/client-api';

interface Category {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  kind: string;
  description: string;
  cover: string;
  icon: string;
  members: number;
  orderIdx: number;
  enabled: boolean;
  genusCount: number;
  postCount: number;
}

export function CategoriesClient({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const remove = async (c: Category) => {
    if (c.genusCount > 0 || c.postCount > 0) {
      alert('该 Category 下还有属或帖子,无法删除');
      return;
    }
    if (!confirm(`删除 ${c.name}(${c.slug})?`)) return;
    setBusy(c.id);
    try {
      await api.delete(`/api/admin/categories/${c.id}`);
      refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '删除失败');
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (c: Category) => {
    setBusy(c.id);
    try {
      await api.patch(`/api/admin/categories/${c.id}`, { enabled: !c.enabled });
      refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(null);
    }
  };

  const updateOrder = async (c: Category, n: number) => {
    if (n === c.orderIdx) return;
    setBusy(c.id);
    try {
      await api.patch(`/api/admin/categories/${c.id}`, { orderIdx: n });
      refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🌿 Category 管理</h1>
          <p className="mt-1 text-xs text-ink-600">
            共 {initial.length} 个科 · 排序数字越小越靠前
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-white hover:bg-ink-700"
        >
          + 新建
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="w-12 px-2 py-2 text-left">图标</th>
              <th className="px-2 py-2 text-left">名字 / slug</th>
              <th className="px-2 py-2 text-left">类型</th>
              <th className="px-2 py-2 text-right">属/帖</th>
              <th className="px-2 py-2 text-center">排序</th>
              <th className="px-2 py-2 text-center">状态</th>
              <th className="px-2 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((c) => (
              <tr key={c.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                <td className="px-2 py-2 text-2xl">{c.icon}</td>
                <td className="px-2 py-2">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-[10px] text-ink-500 font-mono">{c.slug}</div>
                </td>
                <td className="px-2 py-2">
                  <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px]">{c.kind}</span>
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ink-600">
                  {c.genusCount} / {c.postCount}
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="number"
                    defaultValue={c.orderIdx}
                    onBlur={(e) => updateOrder(c, Number(e.target.value))}
                    disabled={busy === c.id}
                    className="w-14 rounded border border-ink-200 px-1.5 py-0.5 text-center text-[11px]"
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => toggle(c)}
                    disabled={busy === c.id}
                    className={
                      c.enabled
                        ? 'rounded bg-leaf-500 px-2 py-0.5 text-[10px] text-white'
                        : 'rounded bg-ink-200 px-2 py-0.5 text-[10px] text-ink-700'
                    }
                  >
                    {c.enabled ? '启用' : '停用'}
                  </button>
                </td>
                <td className="px-2 py-2 text-right">
                  <Link
                    href={`/admin/boards/${c.id}`}
                    className="rounded border border-ink-200 px-2 py-1 text-[10px] hover:bg-ink-50"
                  >
                    属
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="ml-1 rounded border border-ink-200 px-2 py-1 text-[10px] hover:bg-ink-50"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    disabled={busy === c.id}
                    className="ml-1 rounded bg-rose-100 px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-200"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {initial.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-ink-500">没有数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <CategoryEditDialog
          category={editing === 'new' ? null : editing}
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

function CategoryEditDialog({
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
        <h3 className="mb-4 text-base font-semibold">{category ? '编辑 Category' : '新建 Category'}</h3>

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
