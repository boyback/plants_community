'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nContext';
import styles from './MobileTabBar.module.scss';
import { cx } from '@/lib/style-utils';



const items: {href: string;labelKey: string;icon: IconName;center?: boolean;match?: (p: string) => boolean;}[] = [
{ href: '/', labelKey: 'nav.home', icon: 'home', match: (p) => p === '/' },
{ href: '/board', labelKey: 'nav.board', icon: 'board', match: (p) => p.startsWith('/board') },
{ href: '/editor', labelKey: 'nav.mobileTabEditor', icon: 'plus', center: true },
{ href: '/plants', labelKey: 'nav.plants', icon: 'plants', match: (p) => p.startsWith('/plants') },
{ href: '/tasks', labelKey: 'nav.tasks', icon: 'check', match: (p) => p.startsWith('/tasks') }];


/** 仅在 lg 以下显示的底部 Tabbar */
export function MobileTabBar() {
  const pathname = usePathname();
  const { t } = useI18n();

  const hidden = ['/login', '/register'].includes(pathname);
  if (hidden) return null;

  return (
    <>
      <div className={cx(styles.r_acaee621, styles.r_a327049c)} aria-hidden />
      <nav
        className={cx(styles.r_7bc55599, styles.r_3f6397bf, styles.r_189f036c, styles.r_0f2fff0a, styles.r_b950dda2, styles.r_88b684d2, styles.r_f5ebd4d0, styles.r_0b2e8c28, styles.r_a327049c)}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>

        <div className={cx(styles.r_0e12dc7d, styles.r_60fbb771, styles.r_2cc8041e, styles.r_a13d486c)}>
          {items.map((it) => {
            const active = it.match ? it.match(pathname) : pathname === it.href;
            const label = t(it.labelKey);
            if (it.center) {
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_baceed34, styles.r_012fbd12, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_a3899220, styles.r_ec0091ee, styles.r_1dc571a3)}>

                  <span className={cx(styles.r_f3c543ad, styles.r_508ebf85, styles.r_e7e37107, styles.r_0ad21a23, styles.r_67d66567, styles.r_0c5e9137, styles.r_39b2e003, styles.r_78ce000e, styles.r_0a6f1c29, styles.r_72a4c7cd, styles.r_06bbb431, styles.r_a84b3b45, styles.r_eadef238, styles.r_625a4c3f, styles.r_abcc287e)}>
                    <Icon name="plus" size={22} />
                  </span>
                  <span className={cx(styles.r_8ac08c89, styles.r_5f6a59f1)}>{label}</span>
                </Link>);

            }
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_36e579c0, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_a3899220, styles.r_03b4dd7f, styles.r_1dc571a3, styles.r_ceb69a6b),

                active ? cx(styles.r_5f6a59f1, styles.r_2689f395) : styles.r_5fa66415
                )}>

                <Icon
                  name={it.icon}
                  size={20}
                  className={cn(cx(styles.r_eadef238, styles.r_625a4c3f),

                  active && styles.r_fecb6ec6
                  )} />

                {label}
                {active &&
                <span className={cx(styles.r_da4dbfbc, styles.r_57045bd8, styles.r_3a1268a4, styles.r_0b00578a, styles.r_ac204c10, styles.r_45499621)} />
                }
              </Link>);

          })}
        </div>
      </nav>
    </>);

}