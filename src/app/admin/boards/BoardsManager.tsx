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
  type DragEndEvent } from
"@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy } from
"@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api, ApiError } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import { CategoryEditDialog } from './CategoryEditDialog';
import { GenusEditDialog } from './GenusEditDialog';
import { SpeciesEditDialog } from './SpeciesEditDialog';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Toast, useToast, showToast, toast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ConfirmPopover } from '@/components/ui/ConfirmPopover';
import styles from './BoardsManager.module.scss';
import { cx } from '@/lib/style-utils';



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
  linkPath?: string | null;
  genera: GenusNode[];
}

type ViewMode = 'list' | 'tree';

export function BoardsManager({ initial }: {initial: BoardNode[];}) {
  const router = useRouter();
  const { toasts } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin.boards.view') as ViewMode || 'list';
    }
    return 'list';
  });
  const [tree, setTree] = useState<BoardNode[]>(initial);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collapsedGenera, setCollapsedGenera] = useState<Set<string>>(new Set());
  const [editingBoard, setEditingBoard] = useState<BoardNode | 'new' | null>(null);
  const [editingGenus, setEditingGenus] = useState<{genus: GenusNode | 'new';boardId: string;} | null>(null);
  const [editingSpecies, setEditingSpecies] = useState<{species: SpeciesNode | 'new';genusId: string;} | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState<{board: BoardNode;message: string;} | null>(null);

  const refresh = () => startTransition(() => router.refresh());

  const setView = (mode: ViewMode) => {
    localStorage.setItem('admin.boards.view', mode);
    window.location.reload();
  };

  const allIds = useMemo(() => tree.map((c) => c.id), [tree]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());else
    setSelectedIds(new Set(allIds));
  };
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);else
      n.add(id);
      return n;
    });
  };

  const removeBoard = async (c: BoardNode) => {
    // 特殊板块（晒图广场、交易市场）无法删除
    if (c.kind === 'system' || c.slug === 'shaitu' || c.slug === 'jiaoyi') {
      toast.error('该板块为系统功能板块，无法删除，只能启用或关闭');
      return;
    }
    // 检查所有属下是否有帖子
    const totalPosts = c.genera.reduce((sum, g) => sum + g.postsCount, 0);
    if (totalPosts > 0) {
      toast.error('该板块下的属中还有帖子，无法删除');
      return;
    }

    // 显示确认对话框
    const generaCount = c.genera.length;
    const message = generaCount > 0 ?
    `该板块下有 ${generaCount} 个属（无帖子），删除后这些属也会一并删除。\n\n此操作不可恢复！` :
    `此操作不可恢复！`;

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
    setBusy('batch');
    try {
      const result = await api.post<{deleted: number;skipped: string[];}>(
        "/api/admin/boards/batch-delete",
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
    <div className={styles.r_3e7ce58d}>
      {/* 头部 */}
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3)}>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>🌿 板块管理</h1>
          <span className={cx(styles.r_ac204c10, styles.r_febec8f2, styles.r_0b91436d, styles.r_465609a2, styles.r_359090c2, styles.r_02eb621e)}>
            {tree.length} 个板块
          </span>
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <div className={cx(styles.r_60fbb771, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_de8350a3)}>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(cx(styles.r_421ac2be, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_ceb69a6b),

              viewMode === 'list' ? cx(styles.r_01d0b06c, styles.r_72a4c7cd) : cx(styles.r_02eb621e, styles.r_5399e21f)
              )}>

              列表
            </button>
            <button
              type="button"
              onClick={() => setView('tree')}
              className={cn(cx(styles.r_421ac2be, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_ceb69a6b),

              viewMode === 'tree' ? cx(styles.r_01d0b06c, styles.r_72a4c7cd) : cx(styles.r_02eb621e, styles.r_5399e21f)
              )}>

              树状
            </button>
          </div>
          {selectedIds.size > 0 &&
          <ConfirmPopover
            title={`确定批量删除 ${selectedIds.size} 个板块？`}
            message="此操作不可恢复"
            confirmText="删除"
            danger
            onConfirm={batchDelete}>

              <button
              type="button"
              disabled={busy === 'batch'}
              className={cx(styles.r_5f22e64f, styles.r_45a732a4, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_72a4c7cd, styles.r_62129538)}>

                {busy === 'batch' ? '删除中...' : `删除 ${selectedIds.size} 项`}
              </button>
            </ConfirmPopover>
          }
          <button
            type="button"
            onClick={() => setEditingBoard('new')}
            className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_72a4c7cd, styles.r_218d0c3a)}>

            + 新建
          </button>
        </div>
      </div>

      {/* 视图 */}
      {viewMode === 'list' ?
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
        }} /> : (


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
        busy={busy} />)

      }

      {editingBoard &&
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
        }} />

      }
      {editingGenus &&
      <GenusEditDialog
        boardId={editingGenus.boardId}
        genus={editingGenus.genus === 'new' ? null : editingGenus.genus}
        onClose={() => setEditingGenus(null)}
        onSaved={() => {
          showToast(editingGenus.genus === 'new' ? '属创建成功' : '属更新成功', 'success');
          setEditingGenus(null);
          refresh();
        }} />

      }
      {editingSpecies &&
      <SpeciesEditDialog
        genusId={editingSpecies.genusId}
        species={editingSpecies.species === 'new' ? null : editingSpecies.species}
        onClose={() => setEditingSpecies(null)}
        onSaved={() => {
          showToast(editingSpecies.species === 'new' ? '品种创建成功' : '品种更新成功', 'success');
          setEditingSpecies(null);
          refresh();
        }} />

      }

      {/* 删除确认对话框 */}
      {deleteConfirm &&
      <ConfirmDialog
        open={true}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title={`删除板块「${deleteConfirm.board.name}」`}
        message={deleteConfirm.message}
        confirmText="删除"
        cancelText="取消"
        danger={true} />

      }

      {/* Toast 提示 */}
      {toasts.map((toast) =>
      <Toast
        key={toast.id}
        message={toast.message}
        type={toast.type} />

      )}
    </div>);

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
  flex = true









}: {id: string;index: number;total: number;onReorder: (from: number, to: number) => void;children: React.ReactNode;className?: string;handleClassName?: string;flex?: boolean;}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_5f22e64f, styles.r_d5eab218, styles.r_ec0091ee, styles.r_359090c2, styles.r_ceb69a6b, styles.r_f1c2a7a1),

      flex && cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e),
      isDragging && cx(styles.r_236812d6, styles.r_7ebecbb6, styles.r_febc34e4, styles.r_3daca9af, styles.r_3e186800),
      className
      )}>

      <div
        {...attributes}
        {...listeners}
        className={cn(cx(styles.r_012fbd12, styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_67d66567, styles.r_8d083852, styles.r_07389a77, styles.r_6083e9b9, styles.r_dd42d0c0, styles.r_5399e21f, styles.r_d9bff91e, styles.r_51e5622e),

        handleClassName
        )}
        title="拖拽排序">

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
    </div>);

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
  onReorder












}: {boards: BoardNode[];selectedIds: Set<string>;allSelected: boolean;busy: string | null;onToggleAll: () => void;onToggleOne: (id: string) => void;onEdit: (c: BoardNode) => void;onRemove: (c: BoardNode) => void;onToggleEnabled: (c: BoardNode) => void;onEditGenus: (g: GenusNode, boardId: string) => void;onReorder: (ids: string[]) => void;}) {
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
        <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
          <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
            <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
              <tr>
                <th className={cx(styles.r_d854e569, styles.r_d5eab218, styles.r_03b4dd7f)}><input type="checkbox" checked={allSelected} onChange={onToggleAll} className={styles.r_07389a77} /></th>
                <th className={cx(styles.r_2bbcfc3b, styles.r_d5eab218, styles.r_03b4dd7f)}></th>
                <th className={cx(styles.r_e7e37107, styles.r_d5eab218, styles.r_03b4dd7f, styles.r_2eba0d65)}>图标</th>
                <th className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_2eba0d65)}>名字 / slug</th>
                <th className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_2eba0d65)}>类型</th>
                <th className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_308fc069)}>属/帖</th>
                <th className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_ca6bf630)}>状态</th>
                <th className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_308fc069)}>操作</th>
              </tr>
            </thead>
            <tbody>
              {boards.map((c) =>
              <SortableRow
                key={c.id}
                board={c}
                selected={selectedIds.has(c.id)}
                busy={busy === c.id}
                onToggle={() => onToggleOne(c.id)}
                onEdit={() => onEdit(c)}
                onRemove={() => onRemove(c)}
                onToggleEnabled={() => onToggleEnabled(c)}
                onEditGenus={onEditGenus} />

              )}
              {boards.length === 0 && <tr><td colSpan={8} className={cx(styles.r_0e17f2bd, styles.r_1100bef6, styles.r_ca6bf630, styles.r_7b89cd85)}>没有数据</td></tr>}
            </tbody>
          </table>
        </div>
      </SortableContext>
    </DndContext>);

}

function SortableRow({
  board,
  selected,
  busy,
  onToggle,
  onEdit,
  onRemove,
  onToggleEnabled,
  onEditGenus









}: {board: BoardNode;selected: boolean;busy: boolean;onToggle: () => void;onEdit: () => void;onRemove: () => void;onToggleEnabled: () => void;onEditGenus: (g: GenusNode, boardId: string) => void;}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <tr ref={setNodeRef} style={style} className={cn(cx(styles.r_b950dda2, styles.r_358505cf, styles.r_d9a085ef), selected && styles.r_54720a96, isDragging && cx(styles.r_7ebecbb6, styles.r_06bbb431, styles.r_d89972fe, styles.r_236812d6))}>
      <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_ca6bf630)}><input type="checkbox" checked={selected} onChange={onToggle} className={styles.r_07389a77} /></td>
      <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_ca6bf630)}>
        <button {...attributes} {...listeners} className={cx(styles.r_8d083852, styles.r_6083e9b9, styles.r_dd42d0c0, styles.r_d9bff91e)} title="拖拽排序">
          ⠿
        </button>
      </td>
      <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f)}>
        <CategoryIcon icon={board.icons[0] || ''} name={board.name} size="lg" />
      </td>
      <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f)}><div className={styles.r_2689f395}>{board.name}</div><div className={cx(styles.r_1dc571a3, styles.r_7b89cd85, styles.r_0e65706b)}>{board.slug}</div></td>
      <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f)}><span className={cx(styles.r_07389a77, styles.r_febec8f2, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3)}>{board.kind}</span></td>
      <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0, styles.r_02eb621e)}>{board.genera.length} / {board.postsCount}</td>
      <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_ca6bf630)}>
        <button
          type="button"
          onClick={onToggleEnabled}
          disabled={busy}
          className={cn(cx(styles.r_d89972fe, styles.r_52083e7d, styles.r_f6fe9024, styles.r_edaba517, styles.r_3960ffc2, styles.r_ac204c10, styles.r_ceb69a6b),

          board.enabled ? styles.r_45499621 : styles.r_c7489c32,
          busy && cx(styles.r_0b8c506a, styles.r_29b733e4)
          )}
          title={board.enabled ? '点击停用' : '点击启用'}>

          <span
            className={cn(cx(styles.r_bb0c4bfc, styles.r_11e59c6d, styles.r_dc7972eb, styles.r_dd8ce13a, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_eadef238),

            board.enabled ? styles.r_f80f72c0 : styles.r_c3ca6b52
            )} />

        </button>
      </td>
      <td className={cx(styles.r_d5eab218, styles.r_03b4dd7f, styles.r_308fc069)}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77c08e01, styles.r_44ee8ba0)}>
          {/* 特殊板块（晒图广场、交易市场）不显示"属"按钮 */}
          {board.kind !== 'system' && board.slug !== 'shaitu' && board.slug !== 'jiaoyi' &&
          <Link href={`/admin/boards/${board.id}`} className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_5399e21f)}>属</Link>
          }
          <button onClick={onEdit} className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_5399e21f)}>编辑</button>
          {/* 特殊板块不显示删除按钮 */}
          {board.kind !== 'system' && board.slug !== 'shaitu' && board.slug !== 'jiaoyi' ?
          <ConfirmPopover
            title={`确定删除板块「${board.name}」？`}
            message="此操作不可恢复"
            confirmText="删除"
            danger
            onConfirm={() => onRemove()}>

            <button disabled={busy} className={cx(styles.r_07389a77, styles.r_e0467cf5, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_b54428d1, styles.r_fd25c495)}>删除</button>
          </ConfirmPopover> :

          <span className={cx(styles.r_07389a77, styles.r_febec8f2, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_7b89cd85)}>系统板块</span>
          }
        </div>
      </td>
    </tr>);

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
  busy















}: {tree: BoardNode[];setTree: React.Dispatch<React.SetStateAction<BoardNode[]>>;collapsed: Set<string>;setCollapsed: React.Dispatch<React.SetStateAction<Set<string>>>;collapsedGenera: Set<string>;setCollapsedGenera: React.Dispatch<React.SetStateAction<Set<string>>>;setEditingBoard: (c: BoardNode | 'new' | null) => void;setEditingGenus: (g: {genus: GenusNode | 'new';boardId: string;} | null) => void;setEditingSpecies: (s: {species: SpeciesNode | 'new';genusId: string;} | null) => void;removeBoard: (c: BoardNode) => void;removeGenus: (g: GenusNode) => void;removeSpecies: (s: SpeciesNode) => void;onToggleEnabled: (c: BoardNode) => void;busy: string | null;}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));
  const [, startTransition] = useTransition();

  // 查找元素所属的科和属
  const findLocation = (id: string): {type: 'board' | 'genus' | 'species';catId?: string;genusId?: string;} | null => {
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
        ...dstGenus.species.slice(overSpIdx)];

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
      case 'board':{
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
  ...tree.flatMap((c) => c.genera.flatMap((g) => g.species.map((s) => s.id)))];


  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
        <div className={styles.r_da7c36cd}>
          {tree.map((cat, catIdx) => {
            const isCatCollapsed = collapsed.has(cat.id);
            const isLastCat = catIdx === tree.length - 1;
            return (
              <div key={cat.id}>
                {/* 科 - 树节点 */}
                <div className={cx(styles.r_60fbb771, styles.r_60541e1e)}>
                  {/* 树线 */}
                  <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_7ec10f86, styles.r_012fbd12)}>
                    <div className={cn(cx(styles.r_9cea0567, styles.r_6a60c09e, styles.r_ac204c10, styles.r_65935df5, styles.r_012fbd12), cat.enabled ? cx(styles.r_d3b27cd9, styles.r_f2b23104) : cx(styles.r_1176a652, styles.r_febec8f2))} />
                    {!isLastCat && <div className={cx(styles.r_31d2902b, styles.r_36e579c0, styles.r_ae525718, styles.r_15e1b1f4)} />}
                  </div>

                  {/* 科内容 */}
                  <div className={cx(styles.r_36e579c0, styles.r_f58b0257)}>
                    <DndItem
                      id={cat.id}
                      index={catIdx}
                      total={tree.length}
                      onReorder={() => {}}
                      className={cn(cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_5e10cdb8), cat.enabled ? styles.r_691861bc : cx(styles.r_7ae4c063, styles.r_f2868c22))}>

                      {/* 特殊板块不显示展开/收起按钮 */}
                      {cat.kind !== 'market' && cat.slug !== 'shaitu' && cat.slug !== 'market' ?
                      <button onClick={() => setCollapsed((s) => {const n = new Set(s);n.has(cat.id) ? n.delete(cat.id) : n.add(cat.id);return n;})}
                      className={cx(styles.r_012fbd12, styles.r_72470489, styles.r_cd0d9c51, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_07389a77, styles.r_2d91acd3, styles.r_9825203a, styles.r_359090c2)}>
                          {isCatCollapsed ? '▸' : '▾'}
                        </button> :

                      <div className={cx(styles.r_012fbd12, styles.r_72470489, styles.r_cd0d9c51)} />
                      }
                      <CategoryIcon icon={cat.icons[0] || ''} name={cat.name} size="md" />
                      <div className={cx(styles.r_36e579c0, styles.r_7e0b7cdf)}>
                        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                          <span className={cx(styles.r_e83a7042, styles.r_fc7473ca, styles.r_399e11a5)}>{cat.name}</span>
                          {cat.latinName && <span className={cx(styles.r_d058ca6d, styles.r_90665ca6, styles.r_66a36c90)}>{cat.latinName}</span>}
                          {(cat.kind === 'system' || cat.slug === 'shaitu' || cat.slug === 'jiaoyi') &&
                          <span className={cx(styles.r_ac204c10, styles.r_f2b23104, styles.r_d5eab218, styles.r_465609a2, styles.r_e0988086, styles.r_5f6a59f1)}>系统板块</span>
                          }
                        </div>
                        <div className={cx(styles.r_1dc571a3, styles.r_66a36c90)}>
                          {cat.kind !== 'system' && cat.slug !== 'shaitu' && cat.slug !== 'jiaoyi' ?
                          <>{cat.genera.length} 属 · {cat.postsCount} 帖</> :

                          <>{cat.postsCount} 帖</>
                          }
                        </div>
                      </div>
                      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_012fbd12)}>
                        {/* 启用/停用开关 */}
                        <button
                          type="button"
                          onClick={() => onToggleEnabled(cat)}
                          disabled={busy === cat.id}
                          className={cn(cx(styles.r_d89972fe, styles.r_52083e7d, styles.r_cd0d9c51, styles.r_ae2181c7, styles.r_3960ffc2, styles.r_ac204c10, styles.r_ceb69a6b),

                          cat.enabled ? styles.r_45499621 : styles.r_c7489c32,
                          busy === cat.id && cx(styles.r_0b8c506a, styles.r_29b733e4)
                          )}
                          title={cat.enabled ? '点击停用' : '点击启用'}>

                          <span
                            className={cn(cx(styles.r_bb0c4bfc, styles.r_6a60c09e, styles.r_9cea0567, styles.r_dd8ce13a, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_eadef238),

                            cat.enabled ? styles.r_3cbbeaaa : styles.r_c3ca6b52
                            )} />

                        </button>
                        <Link href={`/board/${cat.slug}`} target="_blank" className={cx(styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_02eb621e, styles.r_5399e21f)}>查看</Link>
                        <button onClick={() => setEditingBoard(cat)} className={cx(styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_02eb621e, styles.r_5399e21f)}>编辑</button>
                        {/* 特殊板块不显示删除按钮 */}
                        {cat.kind !== 'system' && cat.slug !== 'shaitu' && cat.slug !== 'jiaoyi' &&
                        <ConfirmPopover
                          title={`确定删除板块「${cat.name}」？`}
                          message="此操作不可恢复"
                          confirmText="删除"
                          danger
                          onConfirm={() => removeBoard(cat)}>

                            <button className={cx(styles.r_421ac2be, styles.r_0759a0f1, styles.r_ca6bcd4b, styles.r_959f4a9f, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_595fceba, styles.r_c29b4826)}>删除</button>
                          </ConfirmPopover>
                        }
                      </div>
                    </DndItem>
                  </div>
                </div>

                {/* 属列表 - 特殊板块不显示 */}
                {!isCatCollapsed && cat.kind !== 'market' && cat.slug !== 'shaitu' && cat.slug !== 'market' &&
                <div className={styles.r_ccdfe155}>
                    {cat.genera.length === 0 ?
                  <div className={cx(styles.r_ccdfe155, styles.r_03b4dd7f, styles.r_d058ca6d, styles.r_66a36c90)}>暂无属</div> :

                  <div className={styles.r_da7c36cd}>
                        {cat.genera.map((genus, gIdx) => {
                      const isGenusCollapsed = collapsedGenera.has(genus.id);
                      const isLastGenus = gIdx === cat.genera.length - 1;
                      return (
                        <div key={genus.id}>
                              {/* 属 - 树节点 */}
                              <div className={cx(styles.r_60fbb771, styles.r_60541e1e)}>
                                {/* 树线 */}
                                <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_7ec10f86, styles.r_012fbd12)}>
                                  <div className={cx(styles.r_650758f4, styles.r_9b3d0721, styles.r_ac204c10, styles.r_65935df5, styles.r_3883b0f9, styles.r_5e10cdb8, styles.r_012fbd12)} />
                                  {!isLastGenus && <div className={cx(styles.r_31d2902b, styles.r_36e579c0, styles.r_ae525718, styles.r_15e1b1f4)} />}
                                </div>

                                {/* 属内容 */}
                                <div className={cx(styles.r_36e579c0, styles.r_f58b0257)}>
                                  <DndItem
                                id={genus.id}
                                index={gIdx}
                                total={cat.genera.length}
                                onReorder={() => {}}
                                className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8)}>

                                    <button onClick={() => setCollapsedGenera((s) => {const n = new Set(s);n.has(genus.id) ? n.delete(genus.id) : n.add(genus.id);return n;})}
                                className={cx(styles.r_012fbd12, styles.r_dc7972eb, styles.r_11e59c6d, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_07389a77, styles.r_43a3d638, styles.r_9825203a, styles.r_1dc571a3)}>
                                      {isGenusCollapsed ? '▸' : '▾'}
                                    </button>
                                    <div className={cx(styles.r_36e579c0, styles.r_7e0b7cdf)}>
                                      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                                        <Link href={`/board/${cat.slug}/${genus.slug}`} target="_blank" className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_c67dcce9)}>
                                          {genus.name}
                                        </Link>
                                        {genus.latinName && <span className={cx(styles.r_1dc571a3, styles.r_90665ca6, styles.r_66a36c90)}>{genus.latinName}</span>}
                                      </div>
                                      <div className={cx(styles.r_1dc571a3, styles.r_66a36c90)}>{genus.species.length} 品种</div>
                                    </div>
                                    <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_012fbd12)}>
                                      <button onClick={() => setEditingGenus({ genus, boardId: cat.id })} className={cx(styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_02eb621e, styles.r_5399e21f)}>编辑</button>
                                      <ConfirmPopover
                                    title={`确定删除「${genus.name}」属？`}
                                    message="此操作不可恢复"
                                    confirmText="删除"
                                    danger
                                    onConfirm={() => removeGenus(genus)}>

                            <button className={cx(styles.r_421ac2be, styles.r_0759a0f1, styles.r_ca6bcd4b, styles.r_959f4a9f, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_595fceba, styles.r_c29b4826)}>删除</button>
                          </ConfirmPopover>
                                    </div>
                                  </DndItem>
                                </div>
                              </div>

                              {/* 品种卡片网格 */}
                              {!isGenusCollapsed &&
                          <div className={cx(styles.r_fbc8d725, styles.r_50d0d216, styles.r_1bb88326)}>
                                  {genus.species.length === 0 ?
                            <div className={cx(styles.r_03b4dd7f, styles.r_ca6bf630, styles.r_1dc571a3, styles.r_66a36c90, styles.r_9ac94195, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc)}>
                                      暂无品种
                                    </div> :

                            <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_77a2a20e, styles.r_898c0bcb, styles.r_74713240, styles.r_76f32b53)}>
                                        {genus.species.map((sp) =>
                              <SpeciesCard key={sp.id} species={sp} onEdit={() => setEditingSpecies({ species: sp, genusId: genus.id })} onRemove={() => removeSpecies(sp)} />
                              )}
                                      </div>
                            }
                                </div>
                          }
                            </div>);

                    })}
                      </div>
                  }
                  </div>
                }
              </div>);

          })}
        </div>
      </SortableContext>
    </DndContext>);

}

/* 品种卡片组件 */
function SpeciesCard({ species, onEdit, onRemove }: {species: SpeciesNode;onEdit: () => void;onRemove: () => void;}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: species.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={cn(cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_9e85ac05, styles.r_b8627687), isDragging && cx(styles.r_236812d6, styles.r_06bbb431, styles.r_16b1efa5, styles.r_9b87abcd))}>
      {/* 拖拽手柄 */}
      <div {...attributes} {...listeners} className={cx(styles.r_da4dbfbc, styles.r_7971386c, styles.r_c55dcda2, styles.r_236812d6, styles.r_f3c543ad, styles.r_f6fe9024, styles.r_7ec10f86, styles.r_67d66567, styles.r_07389a77, styles.r_84591855, styles.r_1ca6dd1e, styles.r_8d083852, styles.r_6083e9b9, styles.r_dd42d0c0, styles.r_d9bff91e, styles.r_7065497e, styles.r_181f3d6c, styles.r_67d6184a, styles.r_51e5622e)}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
        </svg>
      </div>

      {/* 封面图 */}
      <div className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_7ebecbb6)}>
        {species.cover && <Image src={species.cover} alt={species.name} fill className={styles.r_7d85d0c2} unoptimized />}
        <div className={cx(styles.r_da4dbfbc, styles.r_3f6397bf, styles.r_189f036c, styles.r_79257b8c, styles.r_b4cc46dc, styles.r_0fe2b3da, styles.r_cd009d7d)}>
          <div className={cx(styles.r_1dc571a3, styles.r_2689f395, styles.r_72a4c7cd, styles.r_f283ea9b)}>{species.name}</div>
        </div>
      </div>

      {/* 信息区 */}
      <div className={cx(styles.r_d5eab218, styles.r_ec0091ee)}>
        <div className={cx(styles.r_d058ca6d, styles.r_2689f395, styles.r_399e11a5, styles.r_f283ea9b)}>{species.name}</div>
        {species.latinName && <div className={cx(styles.r_e0988086, styles.r_90665ca6, styles.r_66a36c90, styles.r_f283ea9b)}>{species.latinName}</div>}
        <div className={cx(styles.r_e0988086, styles.r_66a36c90)}>{species.postsCount} 帖</div>
        <div className={cx(styles.r_aac62f0e, styles.r_60fbb771, styles.r_44ee8ba0)}>
          <button onClick={(e) => {e.stopPropagation();onEdit();}}
          className={cx(styles.r_36e579c0, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_45d82811, styles.r_465609a2, styles.r_e0988086, styles.r_02eb621e, styles.r_5399e21f)}>
            编辑
          </button>
          <ConfirmPopover
            title="确定删除品种？"
            message="此操作不可恢复"
            confirmText="删除"
            danger
            onConfirm={() => onRemove()}>

                        <button
              onClick={(e) => {e.stopPropagation();}}
              className={cx(styles.r_36e579c0, styles.r_07389a77, styles.r_0759a0f1, styles.r_ca6bcd4b, styles.r_959f4a9f, styles.r_45d82811, styles.r_465609a2, styles.r_e0988086, styles.r_595fceba, styles.r_c29b4826)}>

                          删除
                        </button>
                      </ConfirmPopover>
        </div>
      </div>
    </div>);

}