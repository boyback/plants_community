import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import styles from './Card.module.scss';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'compact' | 'default' | 'loose';
  muted?: boolean;
  interactive?: boolean;
}

export function Card({
  className,
  padding = 'default',
  muted = false,
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        styles.card,
        styles[padding],
        muted && styles.muted,
        interactive && styles.interactive,
        className
      )}
      {...props}
    />
  );
}
