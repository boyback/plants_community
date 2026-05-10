/**
 * 「全部板块」 Drawer — 从左侧滑出的全屏三级树
 *
 * 布局:
 *   左侧栏:科列表(图标+名+属计数),hover 切换右侧
 *   右侧:被选中科下的属网格,点属直达 /board/cat/genus
 *
 * 触发:Sidebar / MobileNav 的「全部板块」 onClick
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { cn } from '@/lib/utils';

interface GenusLite {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  _count: { posts: number; species: number };
}

interface CategoryFull {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  icon: string;
  _count: { posts: number; genera: number };
  genera: GenusLite[];
}

export function BoardsDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<CategoryFull[] | null>(null);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);

  // 打开时拉数据(只拉一次)
  useEffect(() => {
    if (!open || data !== null) return;
    api
      .get<CategoryFull[]>('/api/categories?kind=family&withGenera=1')
      .then((list) => {
        setData(list || []);
        if (list && list.length > 0) setActiveCatId(list[0].id);
      })
      .catch(() => setData([]));
  }, [open, data]);

  // ESC 关闭 + 锁滚动
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const activeCat = data?.find((c) => c.id === activeCatId) ?? null;

  return (
    <div className="fixed inset-0 z-[200] flex">
      {/* 半透明遮罩 */}
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-ink-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="关闭"
      />

      {/* Drawer 主面板 — 左侧滑出,占 88% 宽 max 720px */}
      <div className="relative ml-0 flex h-full w-[88%] max-w-[720px] flex-col bg-white shadow-2xl animate-slide-in-left">
        {/* 顶部 */}
        <div className="flex items-center justify-between border-b border-leaf-100 px-4 py-3">
          <h2 className="text-base font-semibold text-ink-800">🌿 全部板块</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-leaf-700/60 hover:bg-leaf-50 hover:text-leaf-700"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 主体:左科 / 右属 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 科列表 */}
          <ul className="w-40 shrink-0 overflow-y-auto border-r border-leaf-100/60 py-1">
            {data === null && (
              <li className="px-3 py-3 text-xs text-leaf-700/50">加载中…</li>
            )}
            {data !== null && data.length === 0 && (
              <li className="px-3 py-3 text-xs text-leaf-700/50">暂无板块</li>
            )}
            {data?.map((c) => {
              const active = c.id === activeCatId;
              return (
                <li
                  key={c.id}
                  onClick={() => setActiveCatId(c.id)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm',
                    active
                      ? 'bg-leaf-50 font-medium text-leaf-700'
                      : 'text-ink-800 hover:bg-leaf-50',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="text-base shrink-0">{c.icon}</span>
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-leaf-700/50">
                    {c._count.genera}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* 属网格 */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeCat ? (
              <>
                <div className="mb-3 flex items-baseline gap-2">
                  <h3 className="text-base font-semibold text-ink-800">
                    {activeCat.icon} {activeCat.name}
                  </h3>
                  {activeCat.latinName && (
                    <span className="text-xs italic text-leaf-700/60">
                      {activeCat.latinName}
                    </span>
                  )}
                </div>
                <div className="mb-3 text-[11px] text-leaf-700/60">
                  共 {activeCat._count.genera} 属 · {activeCat._count.posts} 帖
                </div>

                {activeCat.genera.length === 0 ? (
                  <div className="py-12 text-center text-sm text-leaf-700/50">
                    该科下还没有属
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {activeCat.genera.map((g) => (
                      <Link
                        key={g.id}
                        href={`/board/${activeCat.slug}/${g.slug}`}
                        onClick={onClose}
                        className="group rounded-lg border border-leaf-100 px-3 py-2.5 transition-colors hover:border-leaf-300 hover:bg-leaf-50"
                      >
                        <div className="truncate text-sm font-medium text-ink-800 group-hover:text-leaf-700">
                          {g.name}
                        </div>
                        {g.latinName && (
                          <div className="mt-0.5 truncate text-[10px] italic text-leaf-700/60">
                            {g.latinName}
                          </div>
                        )}
                        <div className="mt-1 text-[10px] text-leaf-700/50">
                          {g._count.species} 品种 · {g._count.posts} 帖
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-leaf-700/50">
                选择左侧的科以查看属
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
