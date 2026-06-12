'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from "@/lib/client-api";
import { useAuth } from '@/context/AuthContext';
import styles from './FollowedBoardsCard.module.scss';
import { cx } from '@/lib/style-utils';



interface FollowedItem {
  level: 'category' | 'genus' | 'species';
  id: string;
  name: string;
  slug: string;
  cover?: string;
  path?: {level: string;slug: string;name: string;}[];
}

export function FollowedBoardsCard() {
  const { user } = useAuth();
  const [items, setItems] = useState<FollowedItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.
    get<FollowedItem[]>('/api/boards/followed').
    then((list) => setItems((list || []).filter((f) => f.level === 'species'))).
    catch(() => {});
  }, [user]);

  if (!user || items.length === 0) return null;

  return (
    <div className={cx(styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_2cd02d11)}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_6da6a3c3, styles.r_0e17f2bd, styles.r_e7ee55ac, styles.r_2eba0d65, styles.r_98dc6304, styles.r_ceb69a6b)}>

        <span className={cx(styles.r_36e579c0, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>关注的品种</span>
        <span className={cx(styles.r_ac204c10, styles.r_f2b23104, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_b17d6a13, styles.r_2689f395)}>
          {items.length}
        </span>
        <span className={cx(styles.r_6083e9b9, styles.r_359090c2)}>{collapsed ? '▸' : '▾'}</span>
      </button>
      {!collapsed &&
      <div className={cx(styles.r_b950dda2, styles.r_38748e06, styles.r_d5eab218, styles.r_ec0091ee, styles.r_e2eedc57)}>
          {items.map((f) => {
          const catPath = f.path?.find((p) => p.level === 'category');
          const genusPath = f.path?.find((p) => p.level === 'genus');
          const href =
          catPath && genusPath ?
          `/board/${catPath.slug}/${genusPath.slug}/${f.slug}` :
          `/board/${f.slug}`;
          return (
            <Link
              key={f.id}
              href={href}
              className={cx(styles.r_0214b4b3, styles.r_0c5e9137, styles.r_0b91436d, styles.r_ec0091ee, styles.r_359090c2, styles.r_eb6abb1f, styles.r_5756b7b4, styles.r_9825203a, styles.r_ceb69a6b)}>

                <span className={styles.r_2689f395}>{f.name}</span>
              </Link>);

        })}
        </div>
      }
    </div>);

}