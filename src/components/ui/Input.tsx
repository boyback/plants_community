'use client';

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import styles from './Input.module.scss';
import { cx } from '@/lib/style-utils';



export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  showCount?: boolean;
  countClassName?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
  {
    className,
    error,
    showCount,
    countClassName,
    wrapperClassName,
    value,
    maxLength,
    ...props
  },
  ref) =>
  {
    const count =
    typeof value === 'string' || typeof value === 'number' ?
    String(value).length :
    undefined;
    const hasCount = showCount && typeof count === 'number' && maxLength;

    return (
      <div className={cn(styles.r_d89972fe, wrapperClassName)}>
        <input
          ref={ref}
          value={value}
          maxLength={maxLength}
          className={cn(
            'input',
            hasCount && styles.r_d5d24030,
            error && cx(styles.r_3b7f9781, styles.r_fdae7b46),
            className
          )}
          {...props} />

        {hasCount &&
        <div
          className={cn(cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_c100b64c, styles.r_d694ba66, styles.r_36b381be, styles.r_07389a77, styles.r_6c21de57, styles.r_d8e0e382, styles.r_359090c2, styles.r_517d113c, styles.r_bb18baef),

          error && cx(styles.r_061457f2, styles.r_fa512798),
          countClassName
          )}>

            {count} / {maxLength}
          </div>
        }
      </div>);

  }
);

Input.displayName = 'Input';