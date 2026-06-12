'use client';

import Link from 'next/link';
import { useFeatureFlags } from '@/context/FeatureFlagsContext';
import styles from './SystemMenuShortcuts.module.scss';
import { cx } from '@/lib/style-utils';



export function SystemMenuShortcuts() {
  const { systemMenus } = useFeatureFlags();
  const enabledMenus = systemMenus.filter((m) => m.path);

  if (enabledMenus.length === 0) return null;

  return (
    <div className={styles.r_2cd02d11}>
      <div className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>
        <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <span className={cx(styles.r_69cdf25a, styles.r_2689f395, styles.r_399e11a5)}>快捷入口</span>
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
          {enabledMenus.map((menu) =>
          <Link
            key={menu.id}
            href={menu.path}
            className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_58284b4e, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_0b91436d, styles.r_660d2eff, styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_ceb69a6b, styles.r_2efc423a)}>

              {menu.icon?.startsWith('http') ?
            <img src={menu.icon} alt="" className={cx(styles.r_7fc7f732, styles.r_bf600f8e, styles.r_0c5e9137, styles.r_7d85d0c2)} /> :

            <span>{menu.icon || '📌'}</span>
            }
              {menu.name}
            </Link>
          )}
        </div>
      </div>
    </div>);

}