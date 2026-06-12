'use client';

import Link from 'next/link';
import styles from './SystemMenuShortcutsRight.module.scss';
import { cx } from '@/lib/style-utils';



interface MenuItem {
  id: string;
  name: string;
  icon: string;
  path: string | null;
}

export function SystemMenuShortcutsRight({ menus }: {menus?: MenuItem[];}) {
  const displayMenus = menus || [];

  if (displayMenus.length === 0) return null;

  return (
    <div className={styles.r_2cd02d11}>
      <div className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
          {displayMenus.map((menu) =>
          menu.path ?
          <Link
            key={menu.id}
            href={menu.path}
            className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_58284b4e, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_0b91436d, styles.r_660d2eff, styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_ceb69a6b, styles.r_2efc423a)}>

                {menu.icon?.startsWith('http') ?
            <img src={menu.icon} alt="" className={cx(styles.r_7fc7f732, styles.r_bf600f8e, styles.r_0c5e9137, styles.r_7d85d0c2)} /> :

            <span className={styles.r_fc7473ca}>{menu.icon}</span>
            }
                {menu.name}
              </Link> :

          <span
            key={menu.id}
            className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_58284b4e, styles.r_ac204c10, styles.r_febec8f2, styles.r_0b91436d, styles.r_660d2eff, styles.r_d058ca6d, styles.r_66a36c90, styles.r_50ca6ba5)}>

                {menu.icon?.startsWith('http') ?
            <img src={menu.icon} alt="" className={cx(styles.r_7fc7f732, styles.r_bf600f8e, styles.r_0c5e9137, styles.r_7d85d0c2)} /> :

            <span className={styles.r_fc7473ca}>{menu.icon}</span>
            }
                {menu.name}
              </span>

          )}
        </div>
      </div>
    </div>);

}