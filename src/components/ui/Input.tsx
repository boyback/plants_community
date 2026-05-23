'use client';

import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

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
    ref,
  ) => {
    const count =
      typeof value === 'string' || typeof value === 'number'
        ? String(value).length
        : undefined;
    const hasCount = showCount && typeof count === 'number' && maxLength;

    return (
      <div className={cn('relative', wrapperClassName)}>
        <input
          ref={ref}
          value={value}
          maxLength={maxLength}
          className={cn(
            'input',
            hasCount && 'pr-16',
            error && 'border-rose-300 bg-rose-50/30',
            className,
          )}
          {...props}
        />
        {hasCount && (
          <div
            className={cn(
              'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-white/90 px-1 text-xs leading-4 text-leaf-700/55',
              error && 'bg-rose-50/80 text-rose-500',
              countClassName,
            )}
          >
            {count} / {maxLength}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
