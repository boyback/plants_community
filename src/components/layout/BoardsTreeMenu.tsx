'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { isJsonDifferent, loadLocalJson, saveLocalJson } from "@/lib/local-json-cache";
import styles from './BoardsTreeMenu.module.scss';
import { cx } from '@/lib/style-utils';



interface GenusLite {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  _count: {posts: number;species: number;};
}

interface BoardFull {
  id: string;
  slug: string;
  name: string;
  latinName: string | null;
  icon: string;
  _count: {posts: number;genera: number;};
  genera: GenusLite[];
}

// 全局缓存，避免重复加载
const STORAGE_KEY = "rouyou.boards-tree.v1";
let cachedData: BoardFull[] | null = null;
let cachePromise: Promise<BoardFull[]> | null = null;

function loadBoardsCache() {
  return loadLocalJson<BoardFull[]>(STORAGE_KEY);
}

function syncBoardsTree() {
  if (!cachePromise) {
    cachePromise = api.
    get<BoardFull[]>('/api/boards?kind=family&withGenera=1').
    then((list) => {
      const fresh = list || [];
      if (isJsonDifferent(cachedData, fresh)) {
        cachedData = fresh;
        saveLocalJson(STORAGE_KEY, fresh);
      }
      return cachedData ?? fresh;
    }).
    catch(() => cachedData ?? loadBoardsCache() ?? []).
    finally(() => {
      cachePromise = null;
    });
  }
  return cachePromise;
}

export function BoardsTreeMenu({
  onNavigate


}: {onNavigate?: () => void;}) {
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
  const currentPath = pathname?.startsWith('/board/') ?
  pathname.slice(7).split('/').filter(Boolean) :
  [];
  const [currentCategorySlug, currentGenusSlug] = currentPath;

  // 首次加载数据（使用全局缓存）
  useEffect(() => {
    syncBoardsTree().then((list) => {
      setData((prev) => isJsonDifferent(prev, list) ? list : prev);
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
      if (n.has(id)) n.delete(id);else
      n.add(id);
      return n;
    });
  };

  if (data === null) {
    return null;
  }
  if (loaded && data.length === 0) {
    return <div className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_d058ca6d, styles.r_3353f144)}>暂无板块</div>;
  }

  return (
    <div className={styles.r_e2eedc57}>
      {data.map((c) => {
        const open = openCatIds.has(c.id);
        const isActiveCategory = c.slug === currentCategorySlug;
        return (
          <div key={c.id}>
            <button
              type="button"
              onClick={() => toggleCat(c.id)}
              className={cn(cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_0c5e9137, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_ceb69a6b),

              isActiveCategory ? cx(styles.r_f2b23104, styles.r_2689f395, styles.r_e7eab4cb) : cx(styles.r_399e11a5, styles.r_5756b7b4, styles.r_9825203a)


              )}>

              <CategoryIcon icon={c.icon} name={c.name} size="md" />
              <span className={styles.r_f283ea9b}>{c.name}</span>
              <span className={cx(styles.r_fb56d9cf, styles.r_012fbd12, styles.r_1dc571a3, styles.r_4d094717)}>
                {open ? '▾' : '▸'}
              </span>
            </button>

            {open &&
            <div className={cx(styles.r_f242aff2, styles.r_15e1b1f4, styles.r_e2eedc57, styles.r_d4f78465, styles.r_88b684d2, styles.r_989541ad)}>
                {!c.genera || c.genera.length === 0 ?
              <div className={cx(styles.r_d5eab218, styles.r_ec0091ee, styles.r_d058ca6d, styles.r_3353f144)}>
                    该科暂无属
                  </div> :

              c.genera.map((g) => {
                const isActive = c.slug === currentCategorySlug && g.slug === currentGenusSlug;
                return (
                  <Link
                    key={g.id}
                    href={`/board/${c.slug}/${g.slug}`}
                    onClick={onNavigate}
                    className={cn(cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e, styles.r_0c5e9137, styles.r_d5eab218, styles.r_ec0091ee, styles.r_359090c2, styles.r_ceb69a6b),

                    isActive ? cx(styles.r_45499621, styles.r_72a4c7cd, styles.r_2689f395) : cx(styles.r_eb6abb1f, styles.r_5756b7b4, styles.r_9825203a)


                    )}>

                        <span className={styles.r_7e0b7cdf}>
                          <span className={cx(styles.r_0214b4b3, styles.r_f283ea9b)}>{g.name}</span>
                          {g.latinName &&
                      <span className={cn(cx(styles.r_0214b4b3, styles.r_f283ea9b, styles.r_1dc571a3, styles.r_90665ca6),

                      isActive ? styles.r_201d4d37 : styles.r_3353f144
                      )}>
                              {g.latinName}
                            </span>
                      }
                        </span>
                        <span className={cn(cx(styles.r_012fbd12, styles.r_1dc571a3),

                    isActive ? styles.r_201d4d37 : styles.r_4d094717
                    )}>
                          {g._count.posts}
                        </span>
                      </Link>);

              })
              }
              </div>
            }
          </div>);

      })}
    </div>);

}