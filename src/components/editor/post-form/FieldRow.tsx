import type { ReactNode } from 'react';
import styles from './FieldRow.module.scss';
import { cx } from '@/lib/style-utils';



export function FieldRow({
  label,
  className,
  children




}: {label: ReactNode;className?: string;children: ReactNode;}) {
  return (
    <div className={className}>
      <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{label}</label>
      {children}
    </div>);

}