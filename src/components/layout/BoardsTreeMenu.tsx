'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { isJsonDifferent, loadLocalJson, saveLocalJson } from '@/lib/local-json-cache';

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

// 全局缓存，避免重复加载
const STORAGE_KEY = 'rouyou.boards-tree.v1';
let cachedData: BoardFull[] | null = null;
let cachePromise: Promise<BoardFull[]> | null = null;

function loadBoardsCache() {
  return loadLocalJson<BoardFull[]>(STORAGE_KEY);
}

function syncBoardsTree() {
  if (!cachePromise) {
    cachePromise = api
      .get<BoardFull[]>('/api/boards?kind=family&withGenera=1')
      .then((list) => {
        const fresh = list || [];
        if (isJsonDifferent(cachedData, fresh)) {
          cachedData = fresh;
          saveLocalJson(STORAGE_KEY, fresh);
        }
        return cachedData ?? fresh;
      })
      .catch(() => cachedData ?? loadBoardsCache() ?? [])
      .finally(() => {
        cachePromise = null;
      });
  }
  return cachePromise;
}

export function BoardsTreeMenu({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [data, setData] = useState<BoardFull[] | null>(() => {
    if (cachedData) return cachedData;
    const local = loadBoardsCache();
    if (local) cachedData = local;
    return local;
  });
  const [loaded, setLoaded] = useState(Boolean(data));
  const [openCatIds, setOpenCatIds] = useState<Set<string>>(new Set());

  // 解析当前路径，提取 categorySlug 和 genusSlug
  const currentPath = pathname?.startsWith('/board/') 
    ? pathname.slice(7).split('/').filter(Boolean) 
    : [];
  const [currentCategorySlug, currentGenusSlug] = currentPath;

  // 首次加载数据（使用全局缓存）
  useEffect(() => {
    syncBoardsTree().then((list) => {
      setData((prev) => (isJsonDifferent(prev, list) ? list : prev));
      setLoaded(true);
    });
  }, []);

  // 当路径变化时，自动展开对应的科（只在路径变化时执行，不依赖 openCatIds）
  useEffect(() => {
    if (currentCategorySlug && data) {
      const currentCat = data.find((c) => c.slug === currentCategorySlug);
      if (currentCat) {
        setOpenCatIds((prev) => {
          if (prev.has(currentCat.id)) return prev;
          return new Set([...prev, currentCat.id]);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategorySlug, data]);

  const toggleCat = (id: string) => {
    setOpenCatIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  if (data === null) {
    return null;
  }
  if (loaded && data.length === 0) {
    return <div className="px-3 py-2 text-[11px] text-leaf-700/50">暂无板块</div>;
  }

  return (
    <div className="space-y-0.5">
      {data.map((c) => {
        const open = openCatIds.has(c.id);
        const isActiveCategory = c.slug === currentCategorySlug;
        return (
          <div key={c.id}>
            <button
              type="button"
              onClick={() => toggleCat(c.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-none px-3 py-2 text-sm transition-colors',
                isActiveCategory
                  ? 'bg-leaf-100 font-medium text-leaf-800'
                  : 'text-ink-800 hover:bg-leaf-50 hover:text-leaf-700',
              )}
            >
              <CategoryIcon icon={c.icon} name={c.name} size="md" />
              <span className="truncate">{c.name}</span>
              <span className="ml-auto shrink-0 text-[10px] text-leaf-700/40">
                {open ? '▾' : '▸'}
              </span>
            </button>

            {open && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-leaf-100 pl-2">
                {!c.genera || c.genera.length === 0 ? (
                  <div className="px-2 py-1.5 text-[11px] text-leaf-700/50">
                    该科暂无属
                  </div>
                ) : (
                  c.genera.map((g) => {
                    const isActive = c.slug === currentCategorySlug && g.slug === currentGenusSlug;
                    return (
                      <Link
                        key={g.id}
                        href={`/board/${c.slug}/${g.slug}`}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-none px-2 py-1.5 text-xs transition-colors",
                          isActive
                            ? "bg-leaf-500 text-white font-medium"
                            : "text-ink-700 hover:bg-leaf-50 hover:text-leaf-700"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate">{g.name}</span>
                          {g.latinName && (
                            <span className={cn(
                              "block truncate text-[10px] italic",
                              isActive ? "text-white/80" : "text-leaf-700/50"
                            )}>
                              {g.latinName}
                            </span>
                          )}
                        </span>
                        <span className={cn(
                          "shrink-0 text-[10px]",
                          isActive ? "text-white/80" : "text-leaf-700/40"
                        )}>
                          {g._count.posts}
                        </span>
                      </Link>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
