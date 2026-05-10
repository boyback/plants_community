/**
 * 顶部「板块 ▼」三级悬浮菜单
 *
 *   板块 ▼
 *     hover 出 1 级菜单(全部科):
 *     ┌───────────────┐
 *     │ 🌿 景天科  →  │ ← hover 出右侧二级菜单(属)
 *     │ 🪨 番杏科  →  │
 *     │ 💎 百合科  →  │
 *     │ 🌵 仙人掌科→  │
 *     ...
 *     │ ─── 查看全部 │
 *     └───────────────┘
 *
 * 鼠标移到「景天科」→ 右侧弹该科下所有属:
 *     ┌──────────────┬──────────────┐
 *     │ 🌿 景天科 → │  拟石莲属      │
 *     │              │  风车草属      │
 *     │              │  长生草属      │
 *     │              │  ...           │
 *     │              │  查看全部 12 属│
 *     └──────────────┴──────────────┘
 */
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/i18n/I18nContext';
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
  kind: string;
  _count: { posts: number; genera: number };
  genera: GenusLite[];
}

export function BoardMegaMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CategoryFull[] | null>(null);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 首次 hover 触发拉数据
  const ensureData = async () => {
    if (data !== null) return;
    try {
      const list = await api.get<CategoryFull[]>('/api/categories?kind=family&withGenera=1');
      setData(list || []);
      if (list && list.length > 0) setActiveCatId(list[0].id);
    } catch {
      setData([]);
    }
  };

  const onEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen(true);
    void ensureData();
  };
  const onLeave = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 200);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const activeCat = data?.find((c) => c.id === activeCatId) ?? null;

  return (
    <div
      className="relative"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <Link
        href="/board"
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors',
          'text-ink-800 hover:bg-leaf-50 hover:text-leaf-700',
        )}
      >
        <Icon name="board" size={17} />
        {t('nav.board')}
        <span className="text-[10px] opacity-50">▼</span>
      </Link>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 flex overflow-hidden rounded-xl border border-leaf-100 bg-white shadow-card">
          {/* 一级:科列表 */}
          <ul className="w-44 border-r border-leaf-100/60 py-1.5">
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
                  onMouseEnter={() => setActiveCatId(c.id)}
                >
                  <Link
                    href={`/board/${c.slug}`}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-2 text-sm',
                      active
                        ? 'bg-leaf-50 text-leaf-700 font-medium'
                        : 'text-ink-800 hover:bg-leaf-50',
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{c.icon}</span>
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="text-[10px] text-leaf-700/40">▸</span>
                  </Link>
                </li>
              );
            })}
            <li className="mt-1 border-t border-leaf-100/60 pt-1">
              <Link
                href="/board"
                className="block px-3 py-2 text-center text-[11px] text-leaf-700 hover:bg-leaf-50 hover:underline"
              >
                查看全部 →
              </Link>
            </li>
          </ul>

          {/* 二级:活跃科下的属 */}
          {activeCat && (
            <div className="w-64">
              <div className="border-b border-leaf-100/60 px-4 py-2 text-xs">
                <div className="font-semibold text-ink-800">
                  {activeCat.icon} {activeCat.name}
                </div>
                {activeCat.latinName && (
                  <div className="mt-0.5 italic text-leaf-700/60">{activeCat.latinName}</div>
                )}
                <div className="mt-1 text-leaf-700/50">
                  {activeCat._count.genera} 属 · {activeCat._count.posts} 帖
                </div>
              </div>
              {activeCat.genera.length === 0 ? (
                <div className="px-4 py-6 text-center text-[11px] text-leaf-700/50">
                  该科暂无属
                </div>
              ) : (
                <ul className="max-h-[60vh] overflow-y-auto py-1.5">
                  {activeCat.genera.map((g) => (
                    <li key={g.id}>
                      <Link
                        href={`/board/${activeCat.slug}/${g.slug}`}
                        className="flex items-baseline justify-between gap-2 px-4 py-1.5 text-sm hover:bg-leaf-50"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-ink-800">{g.name}</div>
                          {g.latinName && (
                            <div className="truncate text-[10px] italic text-leaf-700/60">
                              {g.latinName}
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] text-leaf-700/50">
                          {g._count.species} 品 · {g._count.posts} 帖
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-leaf-100/60 px-4 py-2 text-center">
                <Link
                  href={`/board/${activeCat.slug}`}
                  className="text-[11px] text-leaf-700 hover:underline"
                >
                  进入「{activeCat.name}」全部 →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
