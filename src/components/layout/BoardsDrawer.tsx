/**
 * 「全部板块」 Drawer
 *
 * 桌面端(lg+):**从 Sidebar 右边贴着展开**(锚点在「全部板块」按钮旁)
 *   - 不覆盖全屏,不需要遮罩
 *   - 点外部 / ESC 关闭
 *
 * 移动端(< lg):全屏从左侧滑入,带遮罩
 *
 * 布局:
 *   左侧栏:科列表
 *   右侧:科下属网格,点属直达 /board/cat/genus
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/CategoryIcon';

interface GenusLite {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  _count: { posts: number; species: number };
}

interface BoardFull {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  icon: string;
  _count: { posts: number; genera: number };
  genera: GenusLite[];
}

/**
 * mode:
 *   - 'anchor':桌面 Sidebar 旁展开,无遮罩,小巧贴边
 *   - 'fullscreen':移动端全屏抽屉,带遮罩
 */
export function BoardsDrawer({
  open,
  onClose,
  mode = 'fullscreen',
}: {
  open: boolean;
  onClose: () => void;
  mode?: 'anchor' | 'fullscreen';
}) {
  const [data, setData] = useState<BoardFull[] | null>(null);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 打开时拉数据(只拉一次)
  useEffect(() => {
    if (!open || data !== null) return;
    api
      .get<BoardFull[]>('/api/boards?kind=family&withGenera=1')
      .then((list) => {
        setData(list || []);
        if (list && list.length > 0) setActiveCatId(list[0].id);
      })
      .catch(() => setData([]));
  }, [open, data]);

  // ESC 关闭 + 锁滚动(仅 fullscreen 锁)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    if (mode === 'fullscreen') {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, mode]);

  // anchor 模式:点外部关闭
  useEffect(() => {
    if (!open || mode !== 'anchor') return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // 但要排除「全部板块」按钮本身,否则 button 的 onClick 又会重开
        const target = e.target as HTMLElement;
        if (target.closest('[data-boards-toggle]')) return;
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose, mode]);

  if (!open) return null;

  const activeCat = data?.find((c) => c.id === activeCatId) ?? null;

  // ============================================================
  // anchor 模式 — 桌面端贴 Sidebar 右边
  // ============================================================
  if (mode === 'anchor') {
    return (
      <div
        ref={panelRef}
        // sidebar 宽 14rem (w-56=14rem=224px),Drawer 紧贴右边
        className="fixed left-[14rem] top-[60px] z-[100] hidden h-[calc(100vh-72px)] w-[640px] max-w-[calc(100vw-15rem)] overflow-hidden rounded-r-2xl border border-l-0 border-leaf-100 bg-white shadow-2xl animate-slide-in-left lg:flex"
      >
        <DrawerInner
          data={data}
          activeCat={activeCat}
          activeCatId={activeCatId}
          setActiveCatId={setActiveCatId}
          onClose={onClose}
          showHeader
        />
      </div>
    );
  }

  // ============================================================
  // fullscreen 模式 — 移动端全屏 + 遮罩
  // ============================================================
  return (
    <div className="fixed inset-0 z-[200] flex lg:hidden">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-ink-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="关闭"
      />
      <div
        ref={panelRef}
        className="relative ml-0 flex h-full w-[88%] max-w-[720px] flex-col bg-white shadow-2xl animate-slide-in-left"
      >
        <DrawerInner
          data={data}
          activeCat={activeCat}
          activeCatId={activeCatId}
          setActiveCatId={setActiveCatId}
          onClose={onClose}
          showHeader
        />
      </div>
    </div>
  );
}

// ============================================================
// 内部主体(两种模式共用)
// ============================================================

function DrawerInner({
  data,
  activeCat,
  activeCatId,
  setActiveCatId,
  onClose,
  showHeader,
}: {
  data: BoardFull[] | null;
  activeCat: BoardFull | null;
  activeCatId: string | null;
  setActiveCatId: (id: string) => void;
  onClose: () => void;
  showHeader?: boolean;
}) {
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      {showHeader && (
        <div className="flex items-center justify-between border-b border-leaf-100 px-4 py-3">
          <h2 className="text-base font-semibold text-ink-800">🌿 全部板块</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-none p-1.5 text-leaf-700/60 hover:bg-leaf-50 hover:text-leaf-700"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
      )}
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
                    <CategoryIcon icon={c.icon} name={c.name} size="md" />
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
                        className="group rounded-none border border-leaf-100 px-3 py-2.5 transition-colors hover:border-leaf-300 hover:bg-leaf-50"
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
  );
}
