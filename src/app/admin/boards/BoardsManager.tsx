'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { CategoryEditDialog } from './CategoryEditDialog';
import { GenusEditDialog } from './GenusEditDialog';

interface SpeciesNode {
  id: string;
  slug: string;
  name: string;
  latinName: string;
  cover: string;
  orderIdx: number;
  postsCount: number;
}
interface GenusNode {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  cover: string | null;
  orderIdx: number;
  postsCount: number;
  species: SpeciesNode[];
}
interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  icon: string;
  cover: string;
  kind: string;
  enabled: boolean;
  orderIdx: number;
  postsCount: number;
  genera: GenusNode[];
}

type ViewMode = 'list' | 'tree';

export function BoardsManager({ initial }: { initial: CategoryNode[] }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('admin.boards.view') as ViewMode) || 'list';
    }
    return 'list';
  });
  const [tree, setTree] = useState<CategoryNode[]>(initial);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editingCategory, setEditingCategory] = useState<CategoryNode | 'new' | null>(null);
  const [editingGenus, setEditingGenus] = useState<{ genus: GenusNode | 'new'; categoryId: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const refresh = () => startTransition(() => router.refresh());

  const setView = (mode: ViewMode) => {
    localStorage.setItem('admin.boards.view', mode);
    window.location.reload();
  };

  const allIds = useMemo(() => tree.map((c) => c.id), [tree]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const removeCategory = async (c: CategoryNode) => {
    if (c.genera.length > 0 || c.postsCount > 0) {
      alert('该板块下还有属或帖子，无法删除');
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

  const removeGenus = async (g: GenusNode) => {
    if (g.species.length > 0 || g.postsCount > 0) {
      alert('该属下还有品种或帖子，无法删除');
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

  const removeSpecies = async (s: SpeciesNode) => {
    if (s.postsCount > 0) {
      alert('该品种下还有帖子，无法删除');
      return;
    }
    if (!confirm(`删除品种「${s.name}」?`)) return;
    setBusy(s.id);
    try {
      await api.delete(`/api/admin/species/${s.id}`);
      refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '删除失败');
    } finally {
      setBusy(null);
    }
  };

  const batchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`批量删除 ${selectedIds.size} 个板块？`)) return;
    setBusy('batch');
    try {
      const result = await api.post<{ deleted: number; skipped: string[] }>(
        '/api/admin/categories/batch-delete',
        { ids: Array.from(selectedIds) }
      );
      setSelectedIds(new Set());
      if (result.skipped.length > 0) {
        alert(`已删除 ${result.deleted} 个，跳过 ${result.skipped.length} 个（有子项）：${result.skipped.join('、')}`);
      }
      refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '批量删除失败');
    } finally {
      setBusy(null);
    }
  };

  const toggleEnabled = async (c: CategoryNode) => {
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

  const updateOrder = async (c: CategoryNode, n: number) => {
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

  // 通用移动函数
  const moveItem = (arr: string[], idx: number, dir: -1 | 1): string[] => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return arr;
    const next = [...arr];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    return next;
  };

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">🌿 板块管理</h1>
          <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs text-ink-600">
            {tree.length} 个板块
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-ink-200 p-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs transition-colors',
                viewMode === 'list' ? 'bg-ink-800 text-white' : 'text-ink-600 hover:bg-ink-50'
              )}
            >
              列表
            </button>
            <button
              type="button"
              onClick={() => setView('tree')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs transition-colors',
                viewMode === 'tree' ? 'bg-ink-800 text-white' : 'text-ink-600 hover:bg-ink-50'
              )}
            >
              树状
            </button>
          </div>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={batchDelete}
              disabled={busy === 'batch'}
              className="rounded-lg bg-rose-500 px-3 py-2 text-xs text-white hover:bg-rose-600"
            >
              {busy === 'batch' ? '删除中...' : `删除 ${selectedIds.size} 项`}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditingCategory('new')}
            className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-white hover:bg-ink-700"
          >
            + 新建
          </button>
        </div>
      </div>

      {/* 视图 */}
      {viewMode === 'list' ? (
        <DndList
          categories={tree}
          selectedIds={selectedIds}
          allSelected={allSelected}
          busy={busy}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
          onEdit={(c) => setEditingCategory(c)}
          onRemove={removeCategory}
          onToggleEnabled={toggleEnabled}
          onEditGenus={(g, catId) => setEditingGenus({ genus: g, categoryId: catId })}
          onReorder={(ids) => {
            setTree((prev) => {
              const map = new Map(prev.map((c) => [c.id, c]));
              return ids.map((id) => map.get(id)!).filter(Boolean);
            });
            startTransition(() => void api.post('/api/admin/boards/reorder', { kind: 'category', orderedIds: ids }));
          }}
        />
      ) : (
        /* ===== 树状视图 ===== */
        <div className="space-y-2">
          {tree.map((cat, catIdx) => (
            <div key={cat.id} className={cn('rounded-xl border bg-white overflow-hidden', cat.enabled ? 'border-leaf-200' : 'border-ink-200 opacity-50')}>
              {/* 科 */}
              <DndItem
                id={cat.id}
                index={catIdx}
                total={tree.length}
                onReorder={(from, to) => {
                  const ids = tree.map((x) => x.id);
                  const tmp = ids.splice(from, 1)[0];
                  ids.splice(to, 0, tmp);
                  setTree((p) => { const m = new Map(p.map((x) => [x.id, x])); return ids.map((id) => m.get(id)!).filter(Boolean); });
                  startTransition(() => void api.post('/api/admin/boards/reorder', { kind: 'category', orderedIds: ids }));
                }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button onClick={() => setCollapsed((s) => { const n = new Set(s); n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id); return n; })}
                    className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-leaf-600/60 hover:text-leaf-700 text-xs">
                    {collapsed.has(cat.id) ? '▸' : '▾'}
                  </button>
                  <span className="text-base shrink-0">{cat.icon}</span>
                  <span className="font-semibold text-sm text-ink-800 truncate">{cat.name}</span>
                  {cat.latinName && <span className="text-[11px] italic text-ink-400 shrink-0">{cat.latinName}</span>}
                  <span className="text-[10px] text-ink-400 shrink-0 ml-1">{cat.genera.length}属·{cat.postsCount}帖</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/board/${cat.slug}`} target="_blank" className="rounded-md border border-ink-200 px-2 py-1 text-[10px] text-ink-600 hover:bg-ink-50">查看</Link>
                  <button onClick={() => setEditingCategory(cat)} className="rounded-md border border-ink-200 px-2 py-1 text-[10px] text-ink-600 hover:bg-ink-50">编辑</button>
                  <button onClick={() => removeCategory(cat)} className="rounded-md bg-rose-50 border border-rose-200 px-2 py-1 text-[10px] text-rose-600 hover:bg-rose-100">删除</button>
                </div>
              </DndItem>

              {/* 属 */}
              {!collapsed.has(cat.id) && (
                <div className="border-t border-leaf-100/60 bg-leaf-50/20 px-4 py-2">
                  {cat.genera.length === 0 ? (
                    <div className="py-2 text-center text-[11px] text-ink-400">暂无属</div>
                  ) : (
                    <div className="space-y-3">
                      {cat.genera.map((genus, gIdx) => (
                        <div key={genus.id}>
                          <DndItem
                            id={genus.id}
                            index={gIdx}
                            total={cat.genera.length}
                            onReorder={(from, to) => {
                              const ids = cat.genera.map((x) => x.id);
                              const tmp = ids.splice(from, 1)[0];
                              ids.splice(to, 0, tmp);
                              setTree((p) => p.map((c) => c.id !== cat.id ? c : { ...c, genera: ids.map((id) => c.genera.find((g) => g.id === id)!).filter(Boolean) }));
                              startTransition(() => void api.post('/api/admin/boards/reorder', { kind: 'genus', orderedIds: ids }));
                            }}
                            className="bg-white"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Link href={`/board/${cat.slug}/${genus.slug}`} target="_blank" className="text-sm font-medium text-ink-700 hover:text-leaf-600 truncate">
                                {genus.name}
                              </Link>
                              {genus.latinName && <span className="text-[10px] italic text-ink-400 shrink-0">{genus.latinName}</span>}
                              <span className="text-[10px] text-ink-400 shrink-0">{genus.species.length}品种</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => setEditingGenus({ genus, categoryId: cat.id })} className="rounded-md border border-ink-200 px-2 py-1 text-[10px] text-ink-600 hover:bg-ink-50">编辑</button>
                              <button onClick={() => removeGenus(genus)} className="rounded-md bg-rose-50 border border-rose-200 px-2 py-1 text-[10px] text-rose-600 hover:bg-rose-100">删除</button>
                            </div>
                          </DndItem>

                          {/* 该属下的品种卡片 */}
                          {genus.species.length > 0 && (
                            <div className="ml-8 mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                              {genus.species.map((sp, sIdx) => (
                                <DndItem
                                  key={sp.id}
                                  id={sp.id}
                                  index={sIdx}
                                  total={genus.species.length}
                                  onReorder={(from, to) => {
                                    const ids = genus.species.map((x) => x.id);
                                    const tmp = ids.splice(from, 1)[0];
                                    ids.splice(to, 0, tmp);
                                    setTree((p) => p.map((c) => c.id !== cat.id ? c : { ...c, genera: c.genera.map((g) => g.id !== genus.id ? g : { ...g, species: ids.map((id) => g.species.find((s) => s.id === id)!).filter(Boolean) }) }));
                                    startTransition(() => void api.post('/api/admin/boards/reorder', { kind: 'species', orderedIds: ids }));
                                  }}
                                  className="!p-0 overflow-hidden"
                                  handleClassName="!absolute !right-0.5 !top-0.5"
                                >
                                  <div className="relative aspect-square bg-leaf-50">
                                    {sp.cover && <Image src={sp.cover} alt={sp.name} fill className="object-cover" unoptimized />}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                                      <div className="text-[10px] font-medium text-white truncate">{sp.name}</div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); removeSpecies(sp); }}
                                      className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[8px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                      ×
                                    </button>
                                  </div>
                                </DndItem>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editingCategory && (
        <CategoryEditDialog
          category={editingCategory === 'new' ? null : editingCategory}
          onClose={() => setEditingCategory(null)}
          onSaved={() => { setEditingCategory(null); refresh(); }}
        />
      )}
      {editingGenus && (
        <GenusEditDialog
          categoryId={editingGenus.categoryId}
          genus={editingGenus.genus === 'new' ? null : editingGenus.genus}
          onClose={() => setEditingGenus(null)}
          onSaved={() => { setEditingGenus(null); refresh(); }}
        />
      )}
    </div>
  );
}

/* ============================================================
 * 通用可拖拽行组件
 * ============================================================ */
function DndItem({
  id,
  index,
  total,
  onReorder,
  children,
  className,
  handleClassName,
}: {
  id: string;
  index: number;
  total: number;
  onReorder: (from: number, to: number) => void;
  children: React.ReactNode;
  className?: string;
  handleClassName?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-leaf-50/80',
        isDragging && 'z-10 bg-leaf-50 shadow-md ring-1 ring-leaf-200',
        className,
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className={cn(
          'shrink-0 cursor-grab text-ink-300 hover:text-ink-600 active:cursor-grabbing',
          handleClassName,
        )}
        title="拖拽排序"
      >
        ⠿
      </button>
      {children}
    </div>
  );
}

/* ============================================================
 * 列表视图 - 支持拖拽排序
 * ============================================================ */
function DndList({
  categories,
  selectedIds,
  allSelected,
  busy,
  onToggleAll,
  onToggleOne,
  onEdit,
  onRemove,
  onToggleEnabled,
  onEditGenus,
  onReorder,
}: {
  categories: CategoryNode[];
  selectedIds: Set<string>;
  allSelected: boolean;
  busy: string | null;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onEdit: (c: CategoryNode) => void;
  onRemove: (c: CategoryNode) => void;
  onToggleEnabled: (c: CategoryNode) => void;
  onEditGenus: (g: GenusNode, categoryId: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = categories.map((c) => c.id);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    onReorder(arrayMove(ids, oldIdx, newIdx));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-ink-50 text-ink-600">
              <tr>
                <th className="w-10 px-2 py-2"><input type="checkbox" checked={allSelected} onChange={onToggleAll} className="rounded" /></th>
                <th className="w-8 px-2 py-2"></th>
                <th className="w-12 px-2 py-2 text-left">图标</th>
                <th className="px-2 py-2 text-left">名字 / slug</th>
                <th className="px-2 py-2 text-left">类型</th>
                <th className="px-2 py-2 text-right">属/帖</th>
                <th className="px-2 py-2 text-center">状态</th>
                <th className="px-2 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <SortableRow
                  key={c.id}
                  category={c}
                  selected={selectedIds.has(c.id)}
                  busy={busy === c.id}
                  onToggle={() => onToggleOne(c.id)}
                  onEdit={() => onEdit(c)}
                  onRemove={() => onRemove(c)}
                  onToggleEnabled={() => onToggleEnabled(c)}
                  onEditGenus={onEditGenus}
                />
              ))}
              {categories.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-ink-500">没有数据</td></tr>}
            </tbody>
          </table>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  category,
  selected,
  busy,
  onToggle,
  onEdit,
  onRemove,
  onToggleEnabled,
  onEditGenus,
}: {
  category: CategoryNode;
  selected: boolean;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onToggleEnabled: () => void;
  onEditGenus: (g: GenusNode, categoryId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={cn('border-t border-ink-100 hover:bg-ink-50/50', selected && 'bg-leaf-50/30', isDragging && 'bg-leaf-50 shadow-lg relative z-10')}>
      <td className="px-2 py-2 text-center"><input type="checkbox" checked={selected} onChange={onToggle} className="rounded" /></td>
      <td className="px-2 py-2 text-center">
        <button {...attributes} {...listeners} className="cursor-grab text-ink-300 hover:text-ink-600 active:cursor-grabbing" title="拖拽排序">
          ⠿
        </button>
      </td>
      <td className="px-2 py-2 text-2xl">{category.icon}</td>
      <td className="px-2 py-2"><div className="font-medium">{category.name}</div><div className="text-[10px] text-ink-500 font-mono">{category.slug}</div></td>
      <td className="px-2 py-2"><span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px]">{category.kind}</span></td>
      <td className="px-2 py-2 text-right tabular-nums text-ink-600">{category.genera.length} / {category.postsCount}</td>
      <td className="px-2 py-2 text-center">
        <button type="button" onClick={onToggleEnabled} disabled={busy}
          className={category.enabled ? 'rounded bg-leaf-500 px-2 py-0.5 text-[10px] text-white' : 'rounded bg-ink-200 px-2 py-0.5 text-[10px] text-ink-700'}>
          {category.enabled ? '启用' : '停用'}
        </button>
      </td>
      <td className="px-2 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Link href={`/admin/boards/${category.id}`} className="rounded border border-ink-200 px-2 py-1 text-[10px] hover:bg-ink-50">属</Link>
          <button onClick={onEdit} className="rounded border border-ink-200 px-2 py-1 text-[10px] hover:bg-ink-50">编辑</button>
          <button onClick={onRemove} disabled={busy} className="rounded bg-rose-100 px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-200">删除</button>
        </div>
      </td>
    </tr>
  );
}
