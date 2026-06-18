import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import styles from './Timeline.module.scss';

export interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  children: ReactNode;
}

export function Timeline({ className, children, ...props }: TimelineProps) {
  return (
    <ol className={cn(styles.timeline, className)} {...props}>
      {children}
    </ol>
  );
}

export interface TimelineItemProps extends HTMLAttributes<HTMLLIElement> {
  date?: ReactNode;
  heading: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export function TimelineItem({
  className,
  date,
  heading,
  actions,
  children,
  ...props
}: TimelineItemProps) {
  return (
    <li className={cn(styles.item, className)} {...props}>
      <div className={styles.date}>
        {date}
      </div>
      <span className={styles.point} aria-hidden />
      <article className={styles.card}>
        <header className={styles.header}>
          <span className={styles.title}>{heading}</span>
        </header>
        <div className={styles.body}>{children}</div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </article>
    </li>
  );
}
