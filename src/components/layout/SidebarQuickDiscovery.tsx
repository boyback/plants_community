'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './SidebarQuickDiscovery.module.scss';
import { cx } from '@/lib/style-utils';



interface DiscoverySpecies {
  id: string;
  name: string;
  url: string;
}

export function SidebarQuickDiscovery() {
  const [species, setSpecies] = useState<DiscoverySpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [speciesBusy, setSpeciesBusy] = useState(false);

  useEffect(() => {
    fetch("/api/home/quick-discovery?n=12").
    then((r) => r.json()).
    then((data) => {
      if (data?.data?.species) setSpecies(data.data.species);
    }).
    catch(() => {}).
    finally(() => setLoading(false));
  }, []);

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

  if (loading || species.length === 0) return null;

  return (
    <div className={cx(styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_2cd02d11)}>
      {/* 热门品种 */}
      <div className={cx(styles.r_0e17f2bd, styles.r_e7ee55ac)}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_a77ed4d9)}>
          <span className={cx(styles.r_fc7473ca, styles.r_69450ef1, styles.r_399e11a5)}>🌱 热门品种</span>
          <button
            type="button"
            onClick={refreshSpecies}
            disabled={speciesBusy}
            className={cn(cx(styles.r_359090c2, styles.r_69335b95, styles.r_9825203a),

            speciesBusy && styles.r_0b8c506a
            )}>

            换一换 ↻
          </button>
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_58284b4e)}>
          {species.
          filter((s) => s.url).
          map((s) =>
          <Link
            key={s.id}
            href={s.url}
            className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_0b91436d, styles.r_660d2eff, styles.r_1dc571a3, styles.r_5f6a59f1, styles.r_2efc423a, styles.r_ceb69a6b)}>

                {s.name}
              </Link>
          )}
        </div>
      </div>
    </div>);

}