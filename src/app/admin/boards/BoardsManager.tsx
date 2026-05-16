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
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { CategoryEditDialog } from './CategoryEditDialog';
import { GenusEditDialog } from './GenusEditDialog';
import { SpeciesEditDialog } from './SpeciesEditDialog';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Toast, useToast, showToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/Dialog';

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
interface BoardNode {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  icons: string[];
  cover: string;
  kind: string;
  enabled: boolean;
  orderIdx: number;
  postsCount: number;
  genera: GenusNode[];
}

type ViewMode = 'list' | 'tree';

export function BoardsManager({ initial }: { initial: BoardNode[] }) {
  const router = useRouter();
  const { toasts, removeToast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('admin.boards.view') as ViewMode) || 'list';
    }
    return 'list';
  });
  const [tree, setTree] = useState<BoardNode[]>(initial);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collapsedGenera, setCollapsedGenera] = useState<Set<string>>(new Set());
  const [editingBoard, setEditingBoard] = useState<BoardNode | 'new' | null>(null);
  const [editingGenus, setEditingGenus] = useState<{ genus: GenusNode | 'new'; boardId: string } | null>(null);
  const [editingSpecies, setEditingSpecies] = useState<{ species: SpeciesNode | 'new'; genusId: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState<{ board: BoardNode; message: string } | null>(null);

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

  const removeBoard = async (c: BoardNode) => {
    // 特殊板块（晒图广场、交易市场）无法删除
    if (c.kind === 'system' || c.slug === 'shaitu' || c.slug === 'jiaoyi') {
      alert('该板块为系统功能板块，无法删除，只能启用或关闭');
      return;
    }
    // 检查所有属下是否有帖子
    const totalPosts = c.genera.reduce((sum, g) => sum + g.postsCount, 0);
    if (totalPosts > 0) {
      alert('该板块下的属中还有帖子，无法删除');
      return;
    }

    // 显示确认对话框
    const generaCount = c.genera.length;
    const message = generaCount > 0
      ? `该板块下有 ${generaCount} 个属（无帖子），删除后这些属也会一并删除。\n\n此操作不可恢复！`
      : `此操作不可恢复！`;

    setDeleteConfirm({ board: c, message });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const c = deleteConfirm.board;
    setDeleteConfirm(null);

    setBusy(c.id);
    try {
      await api.delete(`/api/admin/boards/board/${c.id}`);
      showToast(`板块「${c.name}」已删除`, 'success');
      refresh();
    } catch (e) {
      showToast(`删除失败: ${e instanceof ApiError ? e.message : '未知错误'}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const removeGenus = async (g: GenusNode) => {
    if (g.species.length > 0 || g.postsCount > 0) {
      showToast('该属下还有品种或帖子，无法删除', 'error');
      return;
    }
    if (!confirm(`删除「${g.name}」属?`)) return;
    setBusy(g.id);
    try {
      await api.delete(`/api/admin/genera/${g.id}`);
      showToast(`属「${g.name}」已删除`, 'success');
      refresh();
    } catch (e) {
      showToast(`删除失败: ${e instanceof ApiError ? e.message : '未知错误'}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const removeSpecies = async (s: SpeciesNode) => {
    if (s.postsCount > 0) {
      showToast('该品种下还有帖子，无法删除', 'error');
      return;
    }
    if (!confirm(`删除品种「${s.name}」?`)) return;
    setBusy(s.id);
    try {
      await api.delete(`/api/admin/species/${s.id}`);
      showToast(`品种「${s.name}」已删除`, 'success');
      refresh();
    } catch (e) {
      showToast(`删除失败: ${e instanceof ApiError ? e.message : '未知错误'}`, 'error');
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
        '/api/admin/boards/batch-delete',
        { ids: Array.from(selectedIds) }
      );
      setSelectedIds(new Set());
      if (result.skipped.length > 0) {
        showToast(`已删除 ${result.deleted} 个，跳过 ${result.skipped.length} 个（有子项）`, 'success');
      } else {
        showToast(`已删除 ${result.deleted} 个板块`, 'success');
      }
      refresh();
    } catch (e) {
      showToast(`批量删除失败: ${e instanceof ApiError ? e.message : '未知错误'}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const toggleEnabled = async (c: BoardNode) => {
    setBusy(c.id);
    try {
      const newEnabled = !c.enabled;
      await api.patch(`/api/admin/boards/board/${c.id}`, { enabled: newEnabled });

      // 立即更新本地状态
      setTree((prev) => prev.map((cat) =>
        cat.id === c.id ? { ...cat, enabled: newEnabled } : cat
      ));

      const newStatus = newEnabled ? '已启用' : '已停用';
      showToast(`${c.name} ${newStatus}`, 'success');
      refresh();
    } catch (e) {
      showToast(`操作失败: ${e instanceof ApiError ? e.message : '未知错误'}`, 'error');
    } finally {
      setBusy(null);
    }
  };

  const updateOrder = async (c: BoardNode, n: number) => {
    if (n === c.orderIdx) return;
    setBusy(c.id);
    try {
      await api.patch(`/api/admin/boards/board/${c.id}`, { orderIdx: n });
      showToast(`排序已更新`, 'success');
      refresh();
    } catch (e) {
      showToast(`操作失败: ${e instanceof ApiError ? e.message : '未知错误'}`, 'error');
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
            onClick={() => setEditingBoard('new')}
            className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-white hover:bg-ink-700"
          >
            + 新建
          </button>
        </div>
      </div>

      {/* 视图 */}
      {viewMode === 'list' ? (
        <DndList
          boards={tree}
          selectedIds={selectedIds}
          allSelected={allSelected}
          busy={busy}
          onToggleAll={toggleAll}
          onToggleOne={toggleOne}
          onEdit={(c) => setEditingBoard(c)}
          onRemove={removeBoard}
          onToggleEnabled={toggleEnabled}
          onEditGenus={(g, catId) => setEditingGenus({ genus: g, boardId: catId })}
          onReorder={(ids) => {
            setTree((prev) => {
              const map = new Map(prev.map((c) => [c.id, c]));
              return ids.map((id) => map.get(id)!).filter(Boolean);
            });
            startTransition(() => void api.post('/api/admin/boards/reorder', { kind: 'board', orderedIds: ids }));
          }}
        />
      ) : (
        /* ===== 树状视图 ===== */
        <TreeDndView
          tree={tree}
          setTree={setTree}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          collapsedGenera={collapsedGenera}
          setCollapsedGenera={setCollapsedGenera}
          setEditingBoard={setEditingBoard}
          setEditingGenus={setEditingGenus}
          setEditingSpecies={setEditingSpecies}
          removeBoard={removeBoard}
          removeGenus={removeGenus}
          removeSpecies={removeSpecies}
          onToggleEnabled={toggleEnabled}
          busy={busy}
        />
      )}

      {editingBoard && (
        <CategoryEditDialog
          board={editingBoard === 'new' ? null : editingBoard}
          onClose={() => setEditingBoard(null)}
          onSaved={(updated) => {
            // 更新本地状态
            if (updated && editingBoard !== 'new') {
              setTree((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
              showToast(`板块「${updated.name}」已更新`, 'success');
            } else {
              showToast('板块创建成功', 'success');
            }
            setEditingBoard(null);
            refresh();
          }}
        />
      )}
      {editingGenus && (
        <GenusEditDialog
          boardId={editingGenus.boardId}
          genus={editingGenus.genus === 'new' ? null : editingGenus.genus}
          onClose={() => setEditingGenus(null)}
          onSaved={() => {
            showToast(editingGenus.genus === 'new' ? '属创建成功' : '属更新成功', 'success');
            setEditingGenus(null);
            refresh();
          }}
        />
      )}
      {editingSpecies && (
        <SpeciesEditDialog
          genusId={editingSpecies.genusId}
          species={editingSpecies.species === 'new' ? null : editingSpecies.species}
          onClose={() => setEditingSpecies(null)}
          onSaved={() => {
            showToast(editingSpecies.species === 'new' ? '品种创建成功' : '品种更新成功', 'success');
            setEditingSpecies(null);
            refresh();
          }}
        />
      )}

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <ConfirmDialog
          open={true}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={confirmDelete}
          title={`删除板块「${deleteConfirm.board.name}」`}
          message={deleteConfirm.message}
          confirmText="删除"
          cancelText="取消"
          danger={true}
        />
      )}

      {/* Toast 提示 */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
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
  flex = true,
}: {
  id: string;
  index: number;
  total: number;
  onReorder: (from: number, to: number) => void;
  children: React.ReactNode;
  className?: string;
  handleClassName?: string;
  flex?: boolean;
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
        'group relative rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-leaf-50/80',
        flex && 'flex items-center gap-2',
        isDragging && 'z-10 bg-leaf-50 shadow-md ring-1 ring-leaf-200',
        className,
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'shrink-0 grid h-8 w-8 place-items-center cursor-grab rounded text-ink-300 hover:text-ink-600 hover:bg-ink-50 active:cursor-grabbing touch-none',
          handleClassName,
        )}
        title="拖拽排序"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </div>
      {children}
    </div>
  );
}

/* ============================================================
 * 列表视图 - 支持拖拽排序
 * ============================================================ */
function DndList({
  boards,
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
  boards: BoardNode[];
  selectedIds: Set<string>;
  allSelected: boolean;
  busy: string | null;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onEdit: (c: BoardNode) => void;
  onRemove: (c: BoardNode) => void;
  onToggleEnabled: (c: BoardNode) => void;
  onEditGenus: (g: GenusNode, boardId: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = boards.map((c) => c.id);

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
              {boards.map((c) => (
                <SortableRow
                  key={c.id}
                  board={c}
                  selected={selectedIds.has(c.id)}
                  busy={busy === c.id}
                  onToggle={() => onToggleOne(c.id)}
                  onEdit={() => onEdit(c)}
                  onRemove={() => onRemove(c)}
                  onToggleEnabled={() => onToggleEnabled(c)}
                  onEditGenus={onEditGenus}
                />
              ))}
              {boards.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center text-ink-500">没有数据</td></tr>}
            </tbody>
          </table>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  board,
  selected,
  busy,
  onToggle,
  onEdit,
  onRemove,
  onToggleEnabled,
  onEditGenus,
}: {
  board: BoardNode;
  selected: boolean;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onToggleEnabled: () => void;
  onEditGenus: (g: GenusNode, boardId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id,
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
      <td className="px-2 py-2">
        <CategoryIcon icon={board.icons[0] || ''} name={board.name} size="lg" />
      </td>
      <td className="px-2 py-2"><div className="font-medium">{board.name}</div><div className="text-[10px] text-ink-500 font-mono">{board.slug}</div></td>
      <td className="px-2 py-2"><span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px]">{board.kind}</span></td>
      <td className="px-2 py-2 text-right tabular-nums text-ink-600">{board.genera.length} / {board.postsCount}</td>
      <td className="px-2 py-2 text-center">
        <button
          type="button"
          onClick={onToggleEnabled}
          disabled={busy}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            board.enabled ? 'bg-leaf-500' : 'bg-rose-400',
            busy && 'opacity-50 cursor-not-allowed'
          )}
          title={board.enabled ? '点击停用' : '点击启用'}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              board.enabled ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </td>
      <td className="px-2 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          {/* 特殊板块（晒图广场、交易市场）不显示"属"按钮 */}
          {board.kind !== 'system' && board.slug !== 'shaitu' && board.slug !== 'jiaoyi' && (
            <Link href={`/admin/boards/${board.id}`} className="rounded border border-ink-200 px-2 py-1 text-[10px] hover:bg-ink-50">属</Link>
          )}
          <button onClick={onEdit} className="rounded border border-ink-200 px-2 py-1 text-[10px] hover:bg-ink-50">编辑</button>
          {/* 特殊板块不显示删除按钮 */}
          {board.kind !== 'system' && board.slug !== 'shaitu' && board.slug !== 'jiaoyi' ? (
            <button onClick={onRemove} disabled={busy} className="rounded bg-rose-100 px-2 py-1 text-[10px] text-rose-700 hover:bg-rose-200">删除</button>
          ) : (
            <span className="rounded bg-ink-100 px-2 py-1 text-[10px] text-ink-500">系统板块</span>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ============================================================
 * 树状视图 - 支持跨属跨科拖拽
 * ============================================================ */
function TreeDndView({
  tree,
  setTree,
  collapsed,
  setCollapsed,
  collapsedGenera,
  setCollapsedGenera,
  setEditingBoard,
  setEditingGenus,
  setEditingSpecies,
  removeBoard,
  removeGenus,
  removeSpecies,
  onToggleEnabled,
  busy,
}: {
  tree: BoardNode[];
  setTree: React.Dispatch<React.SetStateAction<BoardNode[]>>;
  collapsed: Set<string>;
  setCollapsed: React.Dispatch<React.SetStateAction<Set<string>>>;
  collapsedGenera: Set<string>;
  setCollapsedGenera: React.Dispatch<React.SetStateAction<Set<string>>>;
  setEditingBoard: (c: BoardNode | 'new' | null) => void;
  setEditingGenus: (g: { genus: GenusNode | 'new'; boardId: string } | null) => void;
  setEditingSpecies: (s: { species: SpeciesNode | 'new'; genusId: string } | null) => void;
  removeBoard: (c: BoardNode) => void;
  removeGenus: (g: GenusNode) => void;
  removeSpecies: (s: SpeciesNode) => void;
  onToggleEnabled: (c: BoardNode) => void;
  busy: string | null;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));
  const [, startTransition] = useTransition();

  // 查找元素所属的科和属
  const findLocation = (id: string): { type: 'board' | 'genus' | 'species'; catId?: string; genusId?: string } | null => {
    for (const cat of tree) {
      if (cat.id === id) return { type: 'board', catId: cat.id };
      for (const genus of cat.genera) {
        if (genus.id === id) return { type: 'genus', catId: cat.id, genusId: genus.id };
        for (const sp of genus.species) {
          if (sp.id === id) return { type: 'species', catId: cat.id, genusId: genus.id };
        }
      }
    }
    return null;
  };

  // 移动科（同级排序）
  const moveBoard = (fromIdx: number, toIdx: number) => {
    const ids = tree.map((x) => x.id);
    const [removed] = ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, removed);
    setTree((p) => {
      const m = new Map(p.map((x) => [x.id, x]));
      return ids.map((id) => m.get(id)!).filter(Boolean);
    });
    startTransition(() => void api.post('/api/admin/boards/reorder', { kind: 'board', orderedIds: ids }));
  };

  // 移动属（仅同科内排序）
  const moveGenus = (activeId: string, overId: string) => {
    const activeLoc = findLocation(activeId);
    const overLoc = findLocation(overId);
    if (!activeLoc || !overLoc || activeLoc.type !== 'genus' || overLoc.type !== 'genus') return;
    // 必须在同一科内
    if (activeLoc.catId !== overLoc.catId) return;

    setTree((prev) => {
      const next = [...prev];
      const catIdx = next.findIndex((c) => c.id === activeLoc.catId);
      if (catIdx === -1) return prev;

      const cat = { ...next[catIdx] };
      const fromIdx = cat.genera.findIndex((g) => g.id === activeId);
      const toIdx = cat.genera.findIndex((g) => g.id === overId);
      if (fromIdx === -1 || toIdx === -1) return prev;

      const newGenera = [...cat.genera];
      const [removed] = newGenera.splice(fromIdx, 1);
      newGenera.splice(toIdx, 0, removed);
      cat.genera = newGenera;
      next[catIdx] = cat;

      // 保存排序
      const allGenusIds = next.flatMap((c) => c.genera.map((g) => g.id));
      startTransition(() => void api.post('/api/admin/boards/reorder', { kind: 'genus', orderedIds: allGenusIds }));

      return next;
    });
  };

  // 移动品种（支持跨属跨科）
  const moveSpecies = (activeId: string, overId: string) => {
    const activeLoc = findLocation(activeId);
    const overLoc = findLocation(overId);
    if (!activeLoc || !overLoc || activeLoc.type !== 'species' || overLoc.type !== 'species') return;

    setTree((prev) => {
      const next = [...prev];

      // 找到源和目标的科、属
      const srcCatIdx = next.findIndex((c) => c.id === activeLoc.catId);
      if (srcCatIdx === -1) return prev;
      const srcCat = { ...next[srcCatIdx] };
      const srcGenusIdx = srcCat.genera.findIndex((g) => g.id === activeLoc.genusId);
      if (srcGenusIdx === -1) return prev;
      const srcGenus = { ...srcCat.genera[srcGenusIdx] };

      // 从源移除品种
      const spIdx = srcGenus.species.findIndex((s) => s.id === activeId);
      if (spIdx === -1) return prev;
      const [species] = srcGenus.species.splice(spIdx, 1);
      srcGenus.species = [...srcGenus.species];
      srcCat.genera[srcGenusIdx] = srcGenus;

      // 找到目标位置
      const dstCatIdx = next.findIndex((c) => c.id === overLoc.catId);
      if (dstCatIdx === -1) return prev;
      const dstCat = srcCatIdx === dstCatIdx ? srcCat : { ...next[dstCatIdx] };
      const dstGenusIdx = dstCat.genera.findIndex((g) => g.id === overLoc.genusId);
      if (dstGenusIdx === -1) return prev;
      const dstGenus = { ...dstCat.genera[dstGenusIdx] };

      // 插入品种到目标位置
      const overSpIdx = dstGenus.species.findIndex((s) => s.id === overId);
      if (overSpIdx !== -1) {
        // 插入到目标位置
        dstGenus.species = [
          ...dstGenus.species.slice(0, overSpIdx),
          species,
          ...dstGenus.species.slice(overSpIdx),
        ];
      } else {
        // 追加到末尾
        dstGenus.species = [...dstGenus.species, species];
      }
      dstCat.genera[dstGenusIdx] = dstGenus;

      next[srcCatIdx] = srcCat;
      if (srcCatIdx !== dstCatIdx) {
        next[dstCatIdx] = dstCat;
      }

      // 按属分别提交排序（只提交受影响的属）
      const isSameGenus = activeLoc.genusId === overLoc.genusId;
      if (isSameGenus) {
        // 同属内排序：只提交一个属
        const ids = srcGenus.species.map((s) => s.id);
        startTransition(() => void api.post('/api/admin/boards/reorder', { kind: 'species', genusId: activeLoc.genusId, orderedIds: ids }));
      } else {
        // 跨属移动：提交源属和目标属
        const srcIds = srcGenus.species.map((s) => s.id);
        const dstIds = dstGenus.species.map((s) => s.id);
        startTransition(() => {
          void api.post('/api/admin/boards/reorder', { kind: 'species', genusId: activeLoc.genusId, orderedIds: srcIds });
          void api.post('/api/admin/boards/reorder', { kind: 'species', genusId: overLoc.genusId, orderedIds: dstIds });
        });
      }

      return next;
    });
  };

  // 处理拖拽结束
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeLoc = findLocation(active.id as string);
    const overLoc = findLocation(over.id as string);
    if (!activeLoc || !overLoc) return;

    // 同类型才能拖拽
    if (activeLoc.type !== overLoc.type) return;

    switch (activeLoc.type) {
      case 'board': {
        const fromIdx = tree.findIndex((c) => c.id === active.id);
        const toIdx = tree.findIndex((c) => c.id === over.id);
        if (fromIdx !== -1 && toIdx !== -1) {
          moveBoard(fromIdx, toIdx);
        }
        break;
      }
      case 'genus':
        moveGenus(active.id as string, over.id as string);
        break;
      case 'species':
        moveSpecies(active.id as string, over.id as string);
        break;
    }
  };

  // 收集所有可拖拽的 ID（科、属、品种）
  const allIds = [
    ...tree.map((c) => c.id),
    ...tree.flatMap((c) => c.genera.map((g) => g.id)),
    ...tree.flatMap((c) => c.genera.flatMap((g) => g.species.map((s) => s.id))),
  ];

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {tree.map((cat, catIdx) => {
            const isCatCollapsed = collapsed.has(cat.id);
            const isLastCat = catIdx === tree.length - 1;
            return (
              <div key={cat.id}>
                {/* 科 - 树节点 */}
                <div className="flex items-start">
                  {/* 树线 */}
                  <div className="flex flex-col items-center w-6 shrink-0">
                    <div className={cn("w-3 h-3 rounded-full border-2 shrink-0", cat.enabled ? "border-leaf-500 bg-leaf-100" : "border-ink-300 bg-ink-100")} />
                    {!isLastCat && <div className="w-0.5 flex-1 bg-leaf-200 mt-0.5" />}
                  </div>
                  
                  {/* 科内容 */}
                  <div className="flex-1 ml-1">
                    <DndItem
                      id={cat.id}
                      index={catIdx}
                      total={tree.length}
                      onReorder={() => {}}
                      className={cn("rounded-lg border bg-white", cat.enabled ? "border-leaf-200" : "border-ink-200 opacity-60")}
                    >
                      {/* 特殊板块不显示展开/收起按钮 */}
                      {cat.kind !== 'market' && cat.slug !== 'shaitu' && cat.slug !== 'market' ? (
                        <button onClick={() => setCollapsed((s) => { const n = new Set(s); n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id); return n; })}
                          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-leaf-600/60 hover:text-leaf-700 text-xs">
                          {isCatCollapsed ? '▸' : '▾'}
                        </button>
                      ) : (
                        <div className="shrink-0 w-5 h-5" />
                      )}
                      <CategoryIcon icon={cat.icons[0] || ''} name={cat.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-ink-800">{cat.name}</span>
                          {cat.latinName && <span className="text-[11px] italic text-ink-400">{cat.latinName}</span>}
                          {(cat.kind === 'system' || cat.slug === 'shaitu' || cat.slug === 'jiaoyi') && (
                            <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-[9px] text-leaf-700">系统板块</span>
                          )}
                        </div>
                        <div className="text-[10px] text-ink-400">
                          {cat.kind !== 'system' && cat.slug !== 'shaitu' && cat.slug !== 'jiaoyi' ? (
                            <>{cat.genera.length} 属 · {cat.postsCount} 帖</>
                          ) : (
                            <>{cat.postsCount} 帖</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* 启用/停用开关 */}
                        <button
                          type="button"
                          onClick={() => onToggleEnabled(cat)}
                          disabled={busy === cat.id}
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            cat.enabled ? 'bg-leaf-500' : 'bg-rose-400',
                            busy === cat.id && 'opacity-50 cursor-not-allowed'
                          )}
                          title={cat.enabled ? '点击停用' : '点击启用'}
                        >
                          <span
                            className={cn(
                              'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
                              cat.enabled ? 'translate-x-5' : 'translate-x-1'
                            )}
                          />
                        </button>
                        <Link href={`/board/${cat.slug}`} target="_blank" className="rounded-md border border-ink-200 px-2 py-1 text-[10px] text-ink-600 hover:bg-ink-50">查看</Link>
                        <button onClick={() => setEditingBoard(cat)} className="rounded-md border border-ink-200 px-2 py-1 text-[10px] text-ink-600 hover:bg-ink-50">编辑</button>
                        {/* 特殊板块不显示删除按钮 */}
                        {cat.kind !== 'system' && cat.slug !== 'shaitu' && cat.slug !== 'jiaoyi' && (
                          <button onClick={() => removeBoard(cat)} className="rounded-md bg-rose-50 border border-rose-200 px-2 py-1 text-[10px] text-rose-600 hover:bg-rose-100">删除</button>
                        )}
                      </div>
                    </DndItem>
                  </div>
                </div>

                {/* 属列表 - 特殊板块不显示 */}
                {!isCatCollapsed && cat.kind !== 'market' && cat.slug !== 'shaitu' && cat.slug !== 'market' && (
                  <div className="ml-6">
                    {cat.genera.length === 0 ? (
                      <div className="ml-6 py-2 text-[11px] text-ink-400">暂无属</div>
                    ) : (
                      <div className="space-y-1">
                        {cat.genera.map((genus, gIdx) => {
                          const isGenusCollapsed = collapsedGenera.has(genus.id);
                          const isLastGenus = gIdx === cat.genera.length - 1;
                          return (
                            <div key={genus.id}>
                              {/* 属 - 树节点 */}
                              <div className="flex items-start">
                                {/* 树线 */}
                                <div className="flex flex-col items-center w-6 shrink-0">
                                  <div className="w-2.5 h-2.5 rounded-full border-2 border-leaf-400 bg-white shrink-0" />
                                  {!isLastGenus && <div className="w-0.5 flex-1 bg-leaf-200 mt-0.5" />}
                                </div>
                                
                                {/* 属内容 */}
                                <div className="flex-1 ml-1">
                                  <DndItem
                                    id={genus.id}
                                    index={gIdx}
                                    total={cat.genera.length}
                                    onReorder={() => {}}
                                    className="rounded-lg border border-leaf-100 bg-white"
                                  >
                                    <button onClick={() => setCollapsedGenera((s) => { const n = new Set(s); n.has(genus.id) ? n.delete(genus.id) : n.add(genus.id); return n; })}
                                      className="shrink-0 w-4 h-4 flex items-center justify-center rounded text-leaf-600/50 hover:text-leaf-700 text-[10px]">
                                      {isGenusCollapsed ? '▸' : '▾'}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <Link href={`/board/${cat.slug}/${genus.slug}`} target="_blank" className="text-sm font-medium text-ink-700 hover:text-leaf-600">
                                          {genus.name}
                                        </Link>
                                        {genus.latinName && <span className="text-[10px] italic text-ink-400">{genus.latinName}</span>}
                                      </div>
                                      <div className="text-[10px] text-ink-400">{genus.species.length} 品种</div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button onClick={() => setEditingGenus({ genus, boardId: cat.id })} className="rounded-md border border-ink-200 px-2 py-1 text-[10px] text-ink-600 hover:bg-ink-50">编辑</button>
                                      <button onClick={() => removeGenus(genus)} className="rounded-md bg-rose-50 border border-rose-200 px-2 py-1 text-[10px] text-rose-600 hover:bg-rose-100">删除</button>
                                    </div>
                                  </DndItem>
                                </div>
                              </div>

                              {/* 品种卡片网格 */}
                              {!isGenusCollapsed && (
                                <div className="ml-12 mt-2 mb-3">
                                  {genus.species.length === 0 ? (
                                    <div className="py-2 text-center text-[10px] text-ink-400 bg-leaf-50/50 rounded-lg border border-dashed border-leaf-200">
                                      暂无品种
                                    </div>
                                  ) : (
                                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                                        {genus.species.map((sp) => (
                                          <SpeciesCard key={sp.id} species={sp} onEdit={() => setEditingSpecies({ species: sp, genusId: genus.id })} onRemove={() => removeSpecies(sp)} />
                                        ))}
                                      </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* 品种卡片组件 */
function SpeciesCard({ species, onEdit, onRemove }: { species: SpeciesNode; onEdit: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: species.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={cn("group relative rounded-lg border border-leaf-100 bg-white overflow-hidden hover:shadow-md transition-shadow", isDragging && "z-10 shadow-lg ring-2 ring-leaf-300")}>
      {/* 拖拽手柄 */}
      <div {...attributes} {...listeners} className="absolute left-1 top-1 z-10 grid h-6 w-6 place-items-center rounded bg-white/80 backdrop-blur-sm cursor-grab text-ink-300 hover:text-ink-600 active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
        </svg>
      </div>
      
      {/* 封面图 */}
      <div className="relative aspect-square bg-leaf-50">
        {species.cover && <Image src={species.cover} alt={species.name} fill className="object-cover" unoptimized />}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
          <div className="text-[10px] font-medium text-white truncate">{species.name}</div>
        </div>
      </div>
      
      {/* 信息区 */}
      <div className="px-2 py-1.5">
        <div className="text-[11px] font-medium text-ink-800 truncate">{species.name}</div>
        {species.latinName && <div className="text-[9px] italic text-ink-400 truncate">{species.latinName}</div>}
        <div className="text-[9px] text-ink-400">{species.postsCount} 帖</div>
        <div className="mt-1.5 flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex-1 rounded border border-ink-200 px-1.5 py-0.5 text-[9px] text-ink-600 hover:bg-ink-50">
            编辑
          </button>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="flex-1 rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 text-[9px] text-rose-600 hover:bg-rose-100">
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
