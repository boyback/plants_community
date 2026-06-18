'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import styles from './SettingsPanel.module.scss';

type Tone = 'blue' | 'green' | 'rose' | 'purple' | 'orange' | 'teal';

export function SettingsPanel({
  icon,
  title,
  description,
  action,
  children
}: {
  icon: IconName;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.heroTitleRow}>
            <Icon name={icon} size={28} />
            <h1>{title}</h1>
          </div>
          {description && <p>{description}</p>}
        </div>
        {action && <div className={styles.heroAction}>{action}</div>}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

export function SettingsRows({ children }: { children: ReactNode }) {
  return <div className={styles.rows}>{children}</div>;
}

export function SettingsRow({
  icon,
  title,
  description,
  tone = 'blue',
  action,
  children
}: {
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  tone?: Tone;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        {icon && (
          <span className={`${styles.iconBox} ${styles[tone]}`}>
            <Icon name={icon} size={28} />
          </span>
        )}
        <div>
          <div className={styles.rowTitle}>{title}</div>
          {description && <div className={styles.rowDesc}>{description}</div>}
          {children}
        </div>
      </div>
      {action && <div className={styles.rowAction}>{action}</div>}
    </div>
  );
}
