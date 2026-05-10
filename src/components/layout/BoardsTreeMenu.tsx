/**
 * Sidebar / MobileNav 内联折叠树
 *
 *  ▸ 全部板块               ← 点击切换
 *      ▸ 🌿 景天科           ← 点击展开
 *          拟石莲属
 *          风车草属
 *          ...
 *      ▸ 🪨 番杏科
 *      ...
 *
 * 整体折叠 / 单科展开,父点收起会折叠所有
 */
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
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
  _count: { posts: number; genera: number };
  genera: GenusLite[];
}

export function BoardsTreeMenu({
  /** 链接被点击后的回调(MobileNav 用来关掉抽屉) */
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const [rootOpen, setRootOpen] = useState(false);
  const [data, setData] = useState<CategoryFull[] | null>(null);
  const [openCatIds, setOpenCatIds] = useState<Set<string>>(new Set());

  // 首次展开根节点时拉数据(只拉一次)
  useEffect(() => {
    if (!rootOpen || data !== null) return;
    api
      .get<CategoryFull[]>('/api/categories?kind=family&withGenera=1')
      .then((list) => setData(list || []))
      .catch(() => setData([]));
  }, [rootOpen, data]);

  const toggleCat = (id: string) => {
    setOpenCatIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <div className="space-y-0.5">
      {/* 一级:「全部板块」 */}
      <button
        type="button"
        onClick={() => setRootOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          rootOpen
            ? 'bg-leaf-100 text-leaf-800 font-medium'
            : 'text-ink-800 hover:bg-leaf-50 hover:text-leaf-700',
        )}
      >
        <Icon name="board" size={17} />
        <span>{t('nav.sidebar.allBoards')}</span>
        <span className="ml-auto text-[10px] text-leaf-700/40">
          {rootOpen ? '▾' : '▸'}
        </span>
      </button>

      {/* 二级:科列表 */}
      {rootOpen && (
        <div className="space-y-0.5 pl-2">
          {data === null && (
            <div className="px-3 py-2 text-[11px] text-leaf-700/50">加载中…</div>
          )}
          {data !== null && data.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-leaf-700/50">暂无板块</div>
          )}
          {data?.map((c) => {
            const open = openCatIds.has(c.id);
            return (
              <div key={c.id}>
                <button
                  type="button"
                  onClick={() => toggleCat(c.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] transition-colors',
                    open ? 'bg-leaf-50 font-medium text-leaf-700' : 'text-ink-800 hover:bg-leaf-50',
                  )}
                >
                  <span className="text-base shrink-0">{c.icon}</span>
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-leaf-700/40">
                    {open ? '▾' : '▸'}
                  </span>
                </button>

                {/* 三级:属 */}
                {open && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-leaf-100 pl-2">
                    {c.genera.length === 0 ? (
                      <div className="px-2 py-1.5 text-[11px] text-leaf-700/50">
                        该科暂无属
                      </div>
                    ) : (
                      c.genera.map((g) => (
                        <Link
                          key={g.id}
                          href={`/board/${c.slug}/${g.slug}`}
                          onClick={onNavigate}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[12px] text-ink-700 hover:bg-leaf-50 hover:text-leaf-700"
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{g.name}</span>
                            {g.latinName && (
                              <span className="block truncate text-[10px] italic text-leaf-700/50">
                                {g.latinName}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-[10px] text-leaf-700/40">
                            {g._count.posts}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
