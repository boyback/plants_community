'use client';

import { useRef, useState } from 'react';
import { api, ApiError } from '@/lib/client-api';
import { CropImageDialog } from '@/components/upload/CropImageDialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Board {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  kind: string;
  description?: string;
  cover: string;
  icons: string[];
  members?: number;
  orderIdx: number;
  enabled: boolean;
}

function SortableIcon({ id, url, onRemove }: { id: string; url: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="relative flex h-20 w-20 rounded-none border-2 border-ink-200 bg-ink-50 cursor-move hover:border-leaf-500 transition-colors"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="h-full w-full rounded-none object-cover" />
        <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/10 rounded-none transition-colors" />
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] text-white hover:bg-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
}

export function CategoryEditDialog({
  board,
  onClose,
  onSaved,
}: {
  board: Board | null;
  onClose: () => void;
  onSaved: (updated?: { id: string; icons: string[]; name: string; latinName: string | null }) => void;
}) {
  const [slug, setSlug] = useState(board?.slug ?? '');
  const [name, setName] = useState(board?.name ?? '');
  const [latinName, setLatinName] = useState(board?.latinName ?? '');
  const [kind, setKind] = useState(board?.kind ?? 'family');
  const [description, setDescription] = useState(board?.description ?? '');
  const [cover, setCover] = useState(board?.cover ?? '');
  const [icons, setIcons] = useState<string[]>(board?.icons ?? []);
  const [orderIdx, setOrderIdx] = useState(board?.orderIdx ?? 0);
  const [enabled, setEnabled] = useState(board?.enabled ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [iconDragOver, setIconDragOver] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const [iconCropEnabled, setIconCropEnabled] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
          setIcons((prev) => [...prev, url]);
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
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (file.type.startsWith('image/')) void uploadIcon(file);
    });
  };

  const handleIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    iconInputRef.current?.click();
  };

  const handleRemoveIcon = (index: number) => {
    setIcons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setIcons((items) => {
        const oldIndex = items.findIndex((_, i) => `icon-${i}` === active.id);
        const newIndex = items.findIndex((_, i) => `icon-${i}` === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const uploadCover = async (file: File) => {
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error('上传失败');
      const data = await resp.json();
      const url = data.url || data.data?.url;
      if (url) setCover(url);
    } catch {
      setErr('封面上传失败');
    } finally {
      setCoverUploading(false);
    }
  };

  const submit = async () => {
    setErr(null);

    const isSpecialBoard = board && (board.kind === 'system' || board.slug === 'shaitu' || board.slug === 'jiaoyi');

    if (!name.trim()) {
      return setErr('名称必填');
    }

    if (!isSpecialBoard && !slug.trim()) {
      return setErr('slug 和 name 必填');
    }

    setBusy(true);
    try {
      if (board) {
        const body = isSpecialBoard
          ? {
              icons: JSON.stringify(icons),
              name: name.trim(),
            }
          : {
              slug: slug.trim(),
              name: name.trim(),
              latinName: latinName.trim() || null,
              kind,
              description: description.trim(),
              cover: cover.trim(),
              icons: JSON.stringify(icons),
              orderIdx,
            };

        await api.patch(`/api/admin/boards/board/${board.id}`, body);
        onSaved({
          id: board.id,
          icons,
          name: body.name,
          latinName: isSpecialBoard ? board.latinName : body.latinName ?? null,
        });
      } else {
        const body = {
          slug: slug.trim(),
          name: name.trim(),
          latinName: latinName.trim() || null,
          kind,
          description: description.trim(),
          cover: cover.trim(),
          icons: JSON.stringify(icons),
          orderIdx,
        };
        await api.post('/api/admin/boards', body);
        onSaved();
      }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  const isSpecialBoard = board && (board.kind === 'system' || board.slug === 'shaitu' || board.slug === 'jiaoyi');

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4" onClick={onClose}>
      <div
        className="card w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold">{board ? '编辑板块' : '新建板块'}</h3>

        {isSpecialBoard ? (
          <div className="space-y-4 text-xs">
            <div className="rounded bg-amber-50 border border-amber-200 px-4 py-3">
              <div className="flex items-start gap-2">
                <span className="text-amber-600">⚠️</span>
                <div className="flex-1">
                  <div className="font-medium text-amber-900 mb-1">系统功能板块</div>
                  <div className="text-amber-700 text-[11px] leading-relaxed">
                    该板块为系统功能板块，只能编辑图标和名字，其他信息不可修改。
                  </div>
                </div>
              </div>
            </div>

            <Field label="中文名 *">
              <input className="w-full rounded-none border border-ink-200 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="板块名称" />
            </Field>

            <Field label="图标（可上传多个，拖拽排序，前台显示第一个）">
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach((file) => void uploadIcon(file));
                  e.target.value = '';
                }}
              />
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {icons.length > 0 && (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={icons.map((_, i) => `icon-${i}`)}>
                        {icons.map((url, index) => (
                          <SortableIcon key={`icon-${index}`} id={`icon-${index}`} url={url} onRemove={() => handleRemoveIcon(index)} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIconDragOver(true); }}
                    onDragLeave={(e) => { e.stopPropagation(); setIconDragOver(false); }}
                    onDrop={handleIconDrop}
                    className={`relative flex h-20 w-20 rounded-none border-2 border-dashed transition-colors ${
                      iconDragOver ? 'border-leaf-500 bg-leaf-50' : 'border-ink-200 bg-ink-50'
                    }`}
                  >
                    {iconUploading ? (
                      <div className="flex items-center justify-center w-full h-full text-[10px] text-leaf-600">上传中…</div>
                    ) : (
                      <div
                        onClick={handleIconClick}
                        className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-leaf-50/50"
                      >
                        <div className="text-lg">📤</div>
                        <div className="text-[9px] text-ink-400 mt-0.5">添加图标</div>
                      </div>
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={iconCropEnabled}
                    onChange={(e) => setIconCropEnabled(e.target.checked)}
                    className="h-3 w-3 accent-leaf-500 rounded-none"
                  />
                  <span className="text-[10px] text-ink-500">上传后裁剪</span>
                </label>
              </div>
            </Field>

            <div className="rounded bg-ink-50 border border-ink-200 px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink-600">板块类型</span>
                <span className="font-mono text-[11px] text-ink-500">system</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink-600">当前状态</span>
                <span className="text-[11px] text-ink-500">{board.enabled ? '✓ 已启用' : '✗ 已停用'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            {/* 第一行：中文名 + 英文 slug */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="中文名 *">
                <input className="w-full rounded-none border border-ink-200 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="景天科" />
              </Field>
              <Field label="英文 slug *">
                <input className="w-full rounded-none border border-ink-200 px-3 py-2 font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="jingtian" />
              </Field>
            </div>

            {/* 第二行：拉丁文 + 类型 + 排序 */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="拉丁名">
                <input className="w-full rounded-none border border-ink-200 px-3 py-2 italic" value={latinName ?? ''} onChange={(e) => setLatinName(e.target.value)} placeholder="Crassulaceae" />
              </Field>
              <Field label="类型">
                <select className="w-full rounded-none border border-ink-200 px-3 py-2" value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="family">family</option>
                  <option value="discussion">discussion</option>
                  <option value="market">market</option>
                </select>
              </Field>
              <Field label="排序">
                <input type="number" className="w-full rounded-none border border-ink-200 px-3 py-2" value={orderIdx} onChange={(e) => setOrderIdx(Number(e.target.value))} />
              </Field>
            </div>

            {/* 图标 */}
            <Field label="图标（可上传多个，拖拽排序，前台显示第一个）">
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach((file) => void uploadIcon(file));
                  e.target.value = '';
                }}
              />
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {icons.length > 0 && (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={icons.map((_, i) => `icon-${i}`)}>
                        {icons.map((url, index) => (
                          <SortableIcon key={`icon-${index}`} id={`icon-${index}`} url={url} onRemove={() => handleRemoveIcon(index)} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIconDragOver(true); }}
                    onDragLeave={(e) => { e.stopPropagation(); setIconDragOver(false); }}
                    onDrop={handleIconDrop}
                    className={`relative flex h-20 w-20 rounded-none border-2 border-dashed transition-colors ${
                      iconDragOver ? 'border-leaf-500 bg-leaf-50' : 'border-ink-200 bg-ink-50'
                    }`}
                  >
                    {iconUploading ? (
                      <div className="flex items-center justify-center w-full h-full text-[10px] text-leaf-600">上传中…</div>
                    ) : (
                      <div
                        onClick={handleIconClick}
                        className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-leaf-50/50"
                      >
                        <div className="text-lg">📤</div>
                        <div className="text-[9px] text-ink-400 mt-0.5">添加</div>
                      </div>
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={iconCropEnabled}
                    onChange={(e) => setIconCropEnabled(e.target.checked)}
                    className="h-3 w-3 accent-leaf-500 rounded-none"
                  />
                  <span className="text-[10px] text-ink-500">上传后裁剪</span>
                </label>
              </div>
            </Field>

            {/* 描述 */}
            <Field label="描述">
              <textarea className="w-full min-h-[60px] rounded-none border border-ink-200 px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </Field>

            {/* 封面图 */}
            <Field label="封面图">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadCover(file);
                  e.target.value = '';
                }}
              />
              {cover ? (
                <div className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover} alt="" className="h-32 w-full rounded-none object-cover border border-ink-200" />
                  <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/40 transition-colors flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="opacity-0 group-hover:opacity-100 rounded-none bg-white px-3 py-1.5 text-[11px] font-medium hover:bg-ink-50 transition-opacity"
                    >
                      更换封面
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="relative flex h-32 w-full rounded-none border-2 border-dashed border-ink-200 bg-ink-50 cursor-pointer hover:border-leaf-500 hover:bg-leaf-50 transition-colors"
                >
                  {coverUploading ? (
                    <div className="flex items-center justify-center w-full h-full text-xs text-leaf-600">上传中…</div>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <div className="text-2xl mb-1">📤</div>
                      <div className="text-[11px] text-ink-400">点击上传封面图</div>
                    </div>
                  )}
                </div>
              )}
            </Field>
          </div>
        )}

        {err && <div className="mt-3 rounded bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-none border border-ink-200 px-3 py-2 text-xs hover:bg-ink-50">
            取消
          </button>
          <button type="button" disabled={busy} onClick={submit} className="rounded-none bg-ink-800 px-3 py-2 text-xs text-white hover:bg-ink-700">
            {busy ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {cropSrc && (
        <CropImageDialog
          src={cropSrc}
          outputSize={75}
          onCancel={() => setCropSrc(null)}
          onConfirm={(croppedUrl) => {
            setIcons((prev) => [...prev, croppedUrl]);
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
