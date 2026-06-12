'use client';

import { cn } from '@/lib/utils';
import styles from './TopicTag.module.scss';
import { cx } from '@/lib/style-utils';



interface TopicTagProps {
  tag: string;
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TopicTag({ tag, href, size = 'md', className }: TopicTagProps) {
  const sizeClasses = {
    sm: cx(styles.r_1dc571a3, styles.r_45d82811, styles.r_465609a2),
    md: cx(styles.r_359090c2, styles.r_d5eab218, styles.r_465609a2),
    lg: cx(styles.r_fc7473ca, styles.r_0b91436d, styles.r_660d2eff)
  };

  const baseClasses = cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_ac204c10, styles.r_f2b23104, styles.r_5f6a59f1, styles.r_d8a68f7c, styles.r_ceb69a6b, `${sizeClasses[size]}`);

  if (href) {
    return (
      <a href={href} className={cn(baseClasses, className)}>
        #{tag}
      </a>);

  }

  return (
    <span className={cn(baseClasses, className)}>
      #{tag}
    </span>);

}