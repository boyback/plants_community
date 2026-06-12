'use client';

import { forwardRef } from 'react';
import TextareaAutosize from "react-textarea-autosize";
import type { TextareaAutosizeProps } from "react-textarea-autosize";
import { cn } from '@/lib/utils';
import styles from './Textarea.module.scss';
import { cx } from '@/lib/style-utils';



export interface TextareaProps extends TextareaAutosizeProps {
  error?: boolean;
  showCount?: boolean;
  countClassName?: string;
  autoResize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
  {
    className,
    error,
    showCount,
    countClassName,
    autoResize = false,
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
      <div className={styles.r_d89972fe}>
        {autoResize ?
        <TextareaAutosize
          ref={ref}
          value={value}
          maxLength={maxLength}
          className={cn('input', styles.r_5bd7b080,

          hasCount && styles.r_b402c0df,
          error && cx(styles.r_3b7f9781, styles.r_fdae7b46),
          className
          )}
          {...props} /> :


        <textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          className={cn('input', styles.r_5bd7b080,

          hasCount && styles.r_b402c0df,
          error && cx(styles.r_3b7f9781, styles.r_fdae7b46),
          className
          )}
          {...props} />

        }
        {hasCount &&
        <div
          className={cn(cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_f795cd13, styles.r_c100b64c, styles.r_07389a77, styles.r_6c21de57, styles.r_d8e0e382, styles.r_359090c2, styles.r_517d113c, styles.r_bb18baef),

          error && cx(styles.r_061457f2, styles.r_fa512798),
          countClassName
          )}>

            {count} / {maxLength}
          </div>
        }
      </div>);

  }
);

Textarea.displayName = 'Textarea';
