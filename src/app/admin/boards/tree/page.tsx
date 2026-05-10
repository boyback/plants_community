/**
 * Admin · 板块树状预览
 *
 * 一屏看完 Category → Genus → Species 三级树
 *  - Category 折叠/展开(默认全展开)
 *  - Genus 在 Category 下,左侧细栏
 *  - Species 平铺为小卡片(图+名+帖子数)
 *
 * 拖拽:
 *  - 同辈拖拽 → reorder
 *  - 跨父拖拽 → move(改 Category 或改 Genus)
 *
 * 入口快捷:
 *  - 点击 Genus 头部 → 跳到「编辑属」页
 *  - 点击 Species 卡片 → 跳到「编辑品种」页
 *  - 顶部「+ 新增科」「+ 新增品种」
 */
'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import { api } from '@/lib/client-api';
import { cn } from '@/lib/utils';

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

export default function BoardsTreePage() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<CategoryNode[]>('/api/admin/boards/tree');
      setTree(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleCollapse = (id: string) => {
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  // category 排序
  const onCategoryReorder = (orderedIds: string[]) => {
    setTree((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      return orderedIds.map((id) => map.get(id)!).filter(Boolean);
    });
    startTransition(() => {
      void api.post('/api/admin/boards/reorder', { kind: 'category', orderedIds });
    });
  };

  // genus 排序(在某 category 下)
  const onGenusReorder = (categoryId: string, orderedIds: string[]) => {
    setTree((prev) =>
      prev.map((c) => {
        if (c.id !== categoryId) return c;
        const map = new Map(c.genera.map((g) => [g.id, g]));
        return { ...c, genera: orderedIds.map((id) => map.get(id)!).filter(Boolean) };
      }),
    );
    startTransition(() => {
      void api.post('/api/admin/boards/reorder', { kind: 'genus', orderedIds });
    });
  };

  // species 排序(在某 genus 下)
  const onSpeciesReorder = (genusId: string, orderedIds: string[]) => {
    setTree((prev) =>
      prev.map((c) => ({
        ...c,
        genera: c.genera.map((g) => {
          if (g.id !== genusId) return g;
          const map = new Map(g.species.map((s) => [s.id, s]));
          return {
            ...g,
            species: orderedIds.map((id) => map.get(id)!).filter(Boolean),
          };
        }),
      })),
    );
    startTransition(() => {
      void api.post('/api/admin/boards/reorder', { kind: 'species', orderedIds });
    });
  };

  if (loading) {
    return (
      <div className="card p-12 text-center text-sm text-leaf-700/60">加载中…</div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-sm text-leaf-700/60">还没有任何板块</div>
        <Link
          href="/admin/boards"
          className="btn-primary mt-3 inline-flex !text-xs"
        >
          + 新增第一个科
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center justify-between p-4">
        <div>
          <h1 className="text-lg font-bold text-ink-800">🌲 板块树状预览</h1>
          <p className="mt-0.5 text-[11px] text-leaf-700/60">
            拖动可调整顺序;同级排序自动保存。点击品种卡片进入编辑。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/boards" className="btn-ghost !text-xs">
            列表视图
          </Link>
          <Link href="/admin/species/new" className="btn-primary !text-xs">
            + 新增品种
          </Link>
        </div>
      </div>

      <CategoryList
        categories={tree}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        onCategoryReorder={onCategoryReorder}
        onGenusReorder={onGenusReorder}
        onSpeciesReorder={onSpeciesReorder}
      />
    </div>
  );
}

/* ============================================================
 * Category 列表(可拖拽排序)
 * ============================================================ */
function CategoryList({
  categories,
  collapsed,
  onToggleCollapse,
  onCategoryReorder,
  onGenusReorder,
  onSpeciesReorder,
}: {
  categories: CategoryNode[];
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  onCategoryReorder: (ids: string[]) => void;
  onGenusReorder: (categoryId: string, ids: string[]) => void;
  onSpeciesReorder: (genusId: string, ids: string[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ids = categories.map((c) => c.id);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    onCategoryReorder(arrayMove(ids, oldIdx, newIdx));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {categories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              collapsed={collapsed.has(c.id)}
              onToggleCollapse={() => onToggleCollapse(c.id)}
              onGenusReorder={onGenusReorder}
              onSpeciesReorder={onSpeciesReorder}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function CategoryRow({
  category,
  collapsed,
  onToggleCollapse,
  onGenusReorder,
  onSpeciesReorder,
}: {
  category: CategoryNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onGenusReorder: (categoryId: string, ids: string[]) => void;
  onSpeciesReorder: (genusId: string, ids: string[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'card overflow-hidden',
        !category.enabled && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-2 border-b border-leaf-100/60 bg-leaf-50/40 px-3 py-2.5">
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab text-leaf-700/40 hover:text-leaf-700 active:cursor-grabbing"
          title="拖动排序"
        >
          ⋮⋮
        </button>
        <button
          onClick={onToggleCollapse}
          className="shrink-0 text-leaf-700/60 hover:text-leaf-700"
        >
          {collapsed ? '▶' : '▼'}
        </button>
        <span className="text-base">{category.icon}</span>
        <span className="font-semibold text-ink-800">{category.name}</span>
        {category.latinName && (
          <span className="text-[11px] italic text-leaf-700/60">
            {category.latinName}
          </span>
        )}
        <span className="text-[11px] text-leaf-700/50">
          {category.genera.length} 属 · {category.postsCount} 帖
        </span>
        <Link
          href={`/admin/boards/${category.id}`}
          className="ml-auto text-[11px] text-leaf-700 hover:underline"
        >
          编辑科
        </Link>
      </div>

      {!collapsed && (
        <GenusList
          categoryId={category.id}
          genera={category.genera}
          onGenusReorder={onGenusReorder}
          onSpeciesReorder={onSpeciesReorder}
        />
      )}
    </div>
  );
}

/* ============================================================
 * Genus 列表
 * ============================================================ */
function GenusList({
  categoryId,
  genera,
  onGenusReorder,
  onSpeciesReorder,
}: {
  categoryId: string;
  genera: GenusNode[];
  onGenusReorder: (categoryId: string, ids: string[]) => void;
  onSpeciesReorder: (genusId: string, ids: string[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ids = genera.map((g) => g.id);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    onGenusReorder(categoryId, arrayMove(ids, oldIdx, newIdx));
  };

  if (genera.length === 0) {
    return (
      <div className="px-4 py-3 text-[11px] text-leaf-700/50">
        该科下还没有属
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 p-3">
          {genera.map((g) => (
            <GenusRow
              key={g.id}
              genus={g}
              onSpeciesReorder={onSpeciesReorder}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function GenusRow({
  genus,
  onSpeciesReorder,
}: {
  genus: GenusNode;
  onSpeciesReorder: (genusId: string, ids: string[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: genus.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-leaf-100"
    >
      <div className="flex items-center gap-2 border-b border-leaf-100/60 px-3 py-1.5">
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab text-leaf-700/40 hover:text-leaf-700 active:cursor-grabbing"
        >
          ⋮⋮
        </button>
        <span className="text-sm font-medium text-ink-800">{genus.name}</span>
        {genus.latinName && (
          <span className="text-[11px] italic text-leaf-700/60">{genus.latinName}</span>
        )}
        <span className="text-[10px] text-leaf-700/50">
          {genus.species.length} 品种
        </span>
        <Link
          href={`/admin/boards/${genus.id}`}
          className="ml-auto text-[11px] text-leaf-700 hover:underline"
        >
          编辑属
        </Link>
      </div>

      <SpeciesGrid
        genusId={genus.id}
        species={genus.species}
        onSpeciesReorder={onSpeciesReorder}
      />
    </div>
  );
}

/* ============================================================
 * Species 小卡片网格
 * ============================================================ */
function SpeciesGrid({
  genusId,
  species,
  onSpeciesReorder,
}: {
  genusId: string;
  species: SpeciesNode[];
  onSpeciesReorder: (genusId: string, ids: string[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ids = species.map((s) => s.id);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    onSpeciesReorder(genusId, arrayMove(ids, oldIdx, newIdx));
  };

  if (species.length === 0) {
    return (
      <div className="px-3 py-3 text-[11px] text-leaf-700/50">
        该属下还没有品种
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {species.map((s) => (
            <SpeciesCard key={s.id} species={s} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SpeciesCard({ species }: { species: SpeciesNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: species.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative cursor-grab overflow-hidden rounded-lg border border-leaf-100 bg-white active:cursor-grabbing"
    >
      <div className="relative aspect-square bg-leaf-50">
        {species.cover && (
          <Image
            src={species.cover}
            alt={species.name}
            fill
            className="object-cover"
            unoptimized
          />
        )}
      </div>
      <div className="p-1.5">
        <div className="line-clamp-1 text-[11px] font-medium text-ink-800">
          {species.name}
        </div>
        {species.latinName && (
          <div className="line-clamp-1 text-[10px] italic text-leaf-700/60">
            {species.latinName}
          </div>
        )}
        <div className="mt-0.5 flex items-center justify-between text-[9px] text-leaf-700/50">
          <span>{species.postsCount} 帖</span>
          <Link
            href={`/admin/species/${species.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-leaf-700 hover:underline"
          >
            编辑
          </Link>
        </div>
      </div>
    </div>
  );
}
