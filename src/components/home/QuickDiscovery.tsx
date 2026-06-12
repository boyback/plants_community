/**
 * 首页右栏「快速发现」单卡
 *
 * 一张卡里 2 段:
 *   - 🌱 热门品种  — 从 API 抽,点击跳品种页
 *   - 🏷️ 板块       — 全部板块,本地洗牌,点击进板块页
 *
 * 每段右上有独立「换一换 ↻」按钮,只刷自己那一段。
 */
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './QuickDiscovery.module.scss';
import { cx } from '@/lib/style-utils';



export interface DiscoverySpecies {
  id: string;
  name: string;
  url: string;
}

export interface DiscoveryCategory {
  id: string;
  slug: string;
  name: string;
}

export function QuickDiscovery({
  initialSpecies,
  initialCategories



}: {initialSpecies: DiscoverySpecies[];initialCategories: DiscoveryCategory[];}) {
  const [species, setSpecies] = useState(initialSpecies);
  const [boards, setCategories] = useState(initialCategories);

  const [speciesBusy, setSpeciesBusy] = useState(false);
  const [boardsBusy, setBoardsBusy] = useState(false);

  const refreshSpecies = async () => {
    setSpeciesBusy(true);
    try {
      const r = await fetch("/api/home/quick-discovery?n=12&shuffle=1");
      const data = await r.json();
      if (data?.data?.species) setSpecies(data.data.species);
    } finally {
      setSpeciesBusy(false);
    }
  };

  const refreshBoards = () => {
    setBoardsBusy(true);
    setCategories((arr) => [...arr].sort(() => Math.random() - 0.5));
    setTimeout(() => setBoardsBusy(false), 200);
  };

  const hasSpecies = species.length > 0;
  const hasCategories = boards.length > 0;

  if (!hasSpecies && !hasCategories) return null;

  return (
    <div className={styles.r_2cd02d11}>
      <div className={cx(styles.r_fa6acbf8, styles.r_c849a1ac)}>
        {hasSpecies &&
        <Section title="🌱 热门品种" onRefresh={refreshSpecies} busy={speciesBusy}>
            <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_58284b4e)}>
              {species.
            filter((s) => s.url).
            map((s) =>
            <Link
              key={s.id}
              href={s.url}
              className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_ceb69a6b, styles.r_2efc423a)}>

                    {s.name}
                  </Link>
            )}
            </div>
          </Section>
        }

        {hasCategories &&
        <Section title="🏷️ 板块" onRefresh={refreshBoards} busy={boardsBusy}>
            <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_58284b4e)}>
              {boards.map((c) =>
            <Link
              key={c.id}
              href={`/board/${c.slug}`}
              className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_b85c981b, styles.r_ceb69a6b, styles.r_0a7c2f87, styles.r_9825203a)}>

                  {c.name}
                </Link>
            )}
            </div>
          </Section>
        }
      </div>
    </div>);

}

function Section({
  title,
  onRefresh,
  busy,
  children





}: {title: string;onRefresh: () => void;busy?: boolean;children: React.ReactNode;}) {
  return (
    <div className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>
      <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <span className={cx(styles.r_69cdf25a, styles.r_2689f395, styles.r_399e11a5)}>{title}</span>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className={cn(cx(styles.r_d058ca6d, styles.r_69335b95, styles.r_ceb69a6b, styles.r_9825203a),

          busy && styles.r_0b8c506a
          )}>

          {busy ? '换一换…' : '换一换 ↻'}
        </button>
      </div>
      {children}
    </div>);

}