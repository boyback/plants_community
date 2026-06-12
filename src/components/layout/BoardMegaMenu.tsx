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

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/i18n/I18nContext';
import { isJsonDifferent, loadLocalJson, saveLocalJson } from "@/lib/local-json-cache";
import styles from './BoardMegaMenu.module.scss';
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
  kind: string;
  _count: {posts: number;genera: number;};
  genera: GenusLite[];
}

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

export function BoardMegaMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BoardFull[] | null>(() => {
    if (cachedData) return cachedData;
    const local = loadBoardsCache();
    if (local) cachedData = local;
    return local;
  });
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureData = async () => {
    const list = await syncBoardsTree();
    setData((prev) => isJsonDifferent(prev, list) ? list : prev);
    if (list.length > 0) {
      setActiveCatId((current) => current ?? list[0].id);
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
      className={styles.r_d89972fe}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}>

      <Link
        href="/board"
        className={cn(cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e, styles.r_0c5e9137, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_ceb69a6b), cx(styles.r_399e11a5, styles.r_5756b7b4, styles.r_9825203a)


        )}>

        <Icon name="board" size={17} />
        {t('nav.board')}
        <span className={cx(styles.r_1dc571a3, styles.r_0b8c506a)}>▼</span>
      </Link>

      {open &&
      <div className={cx(styles.r_da4dbfbc, styles.r_c78facc7, styles.r_5e8a03e0, styles.r_4802bd5b, styles.r_b6b02c0e, styles.r_60fbb771, styles.r_2cd02d11, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_21b12502)}>
          {/* 一级:科列表 */}
          <ul className={cx(styles.r_9af42799, styles.r_5ceb636b, styles.r_38748e06, styles.r_ec0091ee)}>
            {data === null &&
          <li className={cx(styles.r_0e17f2bd, styles.r_1b2d54a3, styles.r_359090c2, styles.r_3353f144)}>加载中…</li>
          }
            {data !== null && data.length === 0 &&
          <li className={cx(styles.r_0e17f2bd, styles.r_1b2d54a3, styles.r_359090c2, styles.r_3353f144)}>暂无板块</li>
          }
            {data?.map((c) => {
            const active = c.id === activeCatId;
            return (
              <li
                key={c.id}
                onMouseEnter={() => setActiveCatId(c.id)}
                className={cn(cx(styles.r_60fbb771, styles.r_50ca6ba5, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca),

                active ? cx(styles.r_7ebecbb6, styles.r_5f6a59f1, styles.r_2689f395) : styles.r_399e11a5


                )}>

                  <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_7e0b7cdf)}>
                    <CategoryIcon icon={c.icon} name={c.name} size="md" />
                    <span className={styles.r_f283ea9b}>{c.name}</span>
                  </span>
                  <span className={cx(styles.r_1dc571a3, styles.r_4d094717)}>▸</span>
                </li>);

          })}
          </ul>

          {/* 二级:活跃科下的属 */}
          {activeCat &&
        <div className={styles.r_6ca62528}>
              <div className={cx(styles.r_65fdbade, styles.r_38748e06, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_359090c2)}>
                <div className={cx(styles.r_e83a7042, styles.r_399e11a5)}>
                  {activeCat.icon} {activeCat.name}
                </div>
                {activeCat.latinName &&
            <div className={cx(styles.r_15e1b1f4, styles.r_90665ca6, styles.r_6c4cc49e)}>{activeCat.latinName}</div>
            }
                <div className={cx(styles.r_b6b02c0e, styles.r_3353f144)}>
                  {activeCat._count.genera} 属 · {activeCat._count.posts} 帖
                </div>
              </div>
              {activeCat.genera.length === 0 ?
          <div className={cx(styles.r_f0faeb26, styles.r_940911bf, styles.r_ca6bf630, styles.r_d058ca6d, styles.r_3353f144)}>
                  该科暂无属
                </div> :

          <ul className={cx(styles.r_5be605a0, styles.r_92bf82f4, styles.r_ec0091ee)}>
                  {activeCat.genera.map((g) =>
            <li key={g.id}>
                      <Link
                href={`/board/${activeCat.slug}/${g.slug}`}
                className={cx(styles.r_60fbb771, styles.r_b7012bb2, styles.r_8ef2268e, styles.r_77a2a20e, styles.r_f0faeb26, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_5756b7b4)}>

                        <div className={styles.r_7e0b7cdf}>
                          <div className={cx(styles.r_f283ea9b, styles.r_399e11a5)}>{g.name}</div>
                          {g.latinName &&
                  <div className={cx(styles.r_f283ea9b, styles.r_1dc571a3, styles.r_90665ca6, styles.r_6c4cc49e)}>
                              {g.latinName}
                            </div>
                  }
                        </div>
                        <span className={cx(styles.r_012fbd12, styles.r_1dc571a3, styles.r_3353f144)}>
                          {g._count.species} 品 · {g._count.posts} 帖
                        </span>
                      </Link>
                    </li>
            )}
                </ul>
          }

            </div>
        }
        </div>
      }
    </div>);

}