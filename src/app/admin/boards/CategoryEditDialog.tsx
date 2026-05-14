'use client';

import { useRef, useState } from 'react';
import { api, ApiError } from '@/lib/client-api';
import { CropImageDialog } from '@/components/upload/CropImageDialog';

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
  onSaved: (updated?: { id: string; icon: string; name: string; latinName: string | null }) => void;
}) {
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [name, setName] = useState(category?.name ?? '');
  const [latinName, setLatinName] = useState(category?.latinName ?? '');
  const [kind, setKind] = useState(category?.kind ?? 'family');
  const [description, setDescription] = useState(category?.description ?? '');
  const [cover, setCover] = useState(category?.cover ?? '');
  const [icon, setIcon] = useState(category?.icon ?? '');
  const [orderIdx, setOrderIdx] = useState(category?.orderIdx ?? 0);
  const [enabled, setEnabled] = useState(category?.enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [iconDragOver, setIconDragOver] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const [iconCropEnabled, setIconCropEnabled] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  const uploadIcon = async (file: File) => {
    setIconUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('上传失败');
      const data = await resp.json();
      const url = data.url || data.data?.url;
      if (url) {
        if (iconCropEnabled) {
          setCropSrc(url);
        } else {
          setIcon(url);
        }
      }
    } catch {
      setErr('图标上传失败');
    } finally {
      setIconUploading(false);
    }
  };

  const handleIconDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIconDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) void uploadIcon(file);
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    iconInputRef.current?.click();
  };

  const handleRemoveIcon = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIcon('');
  };

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
        icon: icon.trim() || '',
        orderIdx,
        enabled,
      };
      if (category) {
        await api.patch(`/api/admin/categories/${category.id}`, body);
        // 返回更新后的数据
        onSaved({
          id: category.id,
          icon: body.icon,
          name: body.name,
          latinName: body.latinName,
        });
      } else {
        await api.post('/api/admin/categories', body);
        onSaved();
      }
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
            <Field label="图标">
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadIcon(file);
                  e.target.value = '';
                }}
              />
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIconDragOver(true); }}
                onDragLeave={(e) => { e.stopPropagation(); setIconDragOver(false); }}
                onDrop={handleIconDrop}
                className={`relative flex h-20 w-20 rounded-xl border-2 border-dashed transition-colors ${
                  iconDragOver
                    ? 'border-leaf-500 bg-leaf-50'
                    : 'border-ink-200 bg-ink-50'
                }`}
              >
                {iconUploading ? (
                  <div className="flex items-center justify-center w-full h-full text-[10px] text-leaf-600">上传中…</div>
                ) : icon ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={icon}
                      alt=""
                      className="h-full w-full rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={handleIconClick}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveIcon}
                      className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] text-white hover:bg-rose-600"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <div
                    onClick={handleIconClick}
                    className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-leaf-50/50"
                  >
                    <div className="text-lg">📤</div>
                    <div className="text-[9px] text-ink-400 mt-0.5">拖拽/点击</div>
                  </div>
                )}
              </div>
              {/* 裁剪开关 */}
              <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={iconCropEnabled}
                  onChange={(e) => setIconCropEnabled(e.target.checked)}
                  className="h-3 w-3 accent-leaf-500 rounded"
                />
                <span className="text-[10px] text-ink-500">上传后裁剪</span>
              </label>
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

      {/* 裁剪对话框 */}
      {cropSrc && (
        <CropImageDialog
          src={cropSrc}
          outputSize={75}
          onCancel={() => setCropSrc(null)}
          onConfirm={(croppedUrl) => {
            setIcon(croppedUrl);
            setCropSrc(null);
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <div className="mb-1 text-[11px] font-medium text-ink-600">{label}</div>
      {children}
    </div>
  );
}
