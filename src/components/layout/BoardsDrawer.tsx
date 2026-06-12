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
import { api } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './BoardsDrawer.module.scss';
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

/**
 * mode:
 *   - 'anchor':桌面 Sidebar 旁展开,无遮罩,小巧贴边
 *   - 'fullscreen':移动端全屏抽屉,带遮罩
 */
export function BoardsDrawer({
  open,
  onClose,
  mode = 'fullscreen'




}: {open: boolean;onClose: () => void;mode?: 'anchor' | 'fullscreen';}) {
  const [data, setData] = useState<BoardFull[] | null>(null);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useBodyScrollLock(open && mode === 'fullscreen');

  // 打开时拉数据(只拉一次)
  useEffect(() => {
    if (!open || data !== null) return;
    api.
    get<BoardFull[]>('/api/boards?kind=family&withGenera=1').
    then((list) => {
      setData(list || []);
      if (list && list.length > 0) setActiveCatId(list[0].id);
    }).
    catch(() => setData([]));
  }, [open, data]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // anchor 模式:点外部关闭
  useEffect(() => {
    if (!open || mode !== 'anchor') return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // 但要排除「全部板块」按钮本身,否则 button 的 onClick 又会重开
        const target = e.target as HTMLElement;
        if (target.closest("[data-boards-toggle]")) return;
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
        // sidebar 宽 224px (w-56=224px=224px),Drawer 紧贴右边
        className={cx(styles.r_7bc55599, styles.r_7f79a1d3, styles.r_317cfdc3, styles.r_db5a366a, styles.r_99d72c7f, styles.r_85547d94, styles.r_55cf6e03, styles.r_779cfef1, styles.r_2cd02d11, styles.r_4e8fcc18, styles.r_ca6bcd4b, styles.r_696c4c24, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_14e46609, styles.r_a2a3392c, styles.r_3eb153dc)}>

        <DrawerInner
          data={data}
          activeCat={activeCat}
          activeCatId={activeCatId}
          setActiveCatId={setActiveCatId}
          onClose={onClose}
          showHeader />

      </div>);

  }

  // ============================================================
  // fullscreen 模式 — 移动端全屏 + 遮罩
  // ============================================================
  return (
    <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_7116b85f, styles.r_60fbb771, styles.r_a327049c)}>
      <button
        type="button"
        className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_50ca6ba5, styles.r_8158623f, styles.r_62905785)}
        onClick={onClose}
        aria-label="关闭" />

      <div
        ref={panelRef}
        className={cx(styles.r_d89972fe, styles.r_a1012364, styles.r_60fbb771, styles.r_668b21aa, styles.r_3c8a6ed4, styles.r_c79ccc8a, styles.r_8dddea07, styles.r_5e10cdb8, styles.r_14e46609, styles.r_a2a3392c)}>

        <DrawerInner
          data={data}
          activeCat={activeCat}
          activeCatId={activeCatId}
          setActiveCatId={setActiveCatId}
          onClose={onClose}
          showHeader />

      </div>
    </div>);

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
  showHeader







}: {data: BoardFull[] | null;activeCat: BoardFull | null;activeCatId: string | null;setActiveCatId: (id: string) => void;onClose: () => void;showHeader?: boolean;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_668b21aa, styles.r_36e579c0, styles.r_8dddea07, styles.r_2cd02d11)}>
      {showHeader &&
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_65fdbade, styles.r_88b684d2, styles.r_f0faeb26, styles.r_1b2d54a3)}>
          <h2 className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>🌿 全部板块</h2>
          <button
          type="button"
          onClick={onClose}
          className={cx(styles.r_0c5e9137, styles.r_cd009d7d, styles.r_6c4cc49e, styles.r_5756b7b4, styles.r_9825203a)}
          aria-label="关闭">

            ✕
          </button>
        </div>
      }
      <div className={cx(styles.r_60fbb771, styles.r_36e579c0, styles.r_2cd02d11)}>
          {/* 科列表 */}
          <ul className={cx(styles.r_84789e8a, styles.r_012fbd12, styles.r_92bf82f4, styles.r_5ceb636b, styles.r_38748e06, styles.r_660d2eff)}>
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
                onClick={() => setActiveCatId(c.id)}
                className={cn(cx(styles.r_60fbb771, styles.r_34516836, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e, styles.r_0e17f2bd, styles.r_e7ee55ac, styles.r_fc7473ca),

                active ? cx(styles.r_7ebecbb6, styles.r_2689f395, styles.r_5f6a59f1) : cx(styles.r_399e11a5, styles.r_5756b7b4)


                )}>

                  <span className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_3960ffc2, styles.r_77a2a20e)}>
                    <CategoryIcon icon={c.icon} name={c.name} size="md" />
                    <span className={styles.r_f283ea9b}>{c.name}</span>
                  </span>
                  <span className={cx(styles.r_012fbd12, styles.r_1dc571a3, styles.r_3353f144)}>
                    {c._count.genera}
                  </span>
                </li>);

          })}
          </ul>

          {/* 属网格 */}
          <div className={cx(styles.r_36e579c0, styles.r_92bf82f4, styles.r_8e63407b)}>
            {activeCat ?
          <>
                <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_b7012bb2, styles.r_77a2a20e)}>
                  <h3 className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>
                    {activeCat.icon} {activeCat.name}
                  </h3>
                  {activeCat.latinName &&
              <span className={cx(styles.r_359090c2, styles.r_90665ca6, styles.r_6c4cc49e)}>
                      {activeCat.latinName}
                    </span>
              }
                </div>
                <div className={cx(styles.r_1bb88326, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                  共 {activeCat._count.genera} 属 · {activeCat._count.posts} 帖
                </div>

                {activeCat.genera.length === 0 ?
            <div className={cx(styles.r_61357c0c, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_3353f144)}>
                    该科下还没有属
                  </div> :

            <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_77a2a20e, styles.r_ab1b20c2)}>
                    {activeCat.genera.map((g) =>
              <Link
                key={g.id}
                href={`/board/${activeCat.slug}/${g.slug}`}
                onClick={onClose}
                className={cx(styles.r_64292b1c, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0e17f2bd, styles.r_e7ee55ac, styles.r_ceb69a6b, styles.r_a5c39c39, styles.r_5756b7b4)}>

                        <div className={cx(styles.r_f283ea9b, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5, styles.r_0eb80431)}>
                          {g.name}
                        </div>
                        {g.latinName &&
                <div className={cx(styles.r_15e1b1f4, styles.r_f283ea9b, styles.r_1dc571a3, styles.r_90665ca6, styles.r_6c4cc49e)}>
                            {g.latinName}
                          </div>
                }
                        <div className={cx(styles.r_b6b02c0e, styles.r_1dc571a3, styles.r_3353f144)}>
                          {g._count.species} 品种 · {g._count.posts} 帖
                        </div>
                      </Link>
              )}
                  </div>
            }
              </> :

          <div className={cx(styles.r_60fbb771, styles.r_668b21aa, styles.r_3960ffc2, styles.r_86843cf1, styles.r_fc7473ca, styles.r_3353f144)}>
                选择左侧的科以查看属
              </div>
          }
        </div>
      </div>
    </div>);

}
