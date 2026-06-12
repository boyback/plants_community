'use client';

import { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { SiteFooter } from '@/components/layout/SiteFooter';
import styles from './Shell.module.scss';
import { cx } from '@/lib/style-utils';



export function Shell({
  children,
  withSidebar = true,
  recommendUsers = []




}: {children: ReactNode;withSidebar?: boolean;recommendUsers?: any[];}) {
  return (
    <AppShell showFloatingAi={false} className={cx(styles.r_d14dc4ed, styles.r_173fa8f0)}>
      <div className={cx(styles.r_60fbb771, styles.r_0d304f90)}>
        {withSidebar && <Sidebar recommendUsers={recommendUsers} />}
        <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>{children}</div>
      </div>
      <SiteFooter />
    </AppShell>);

}
