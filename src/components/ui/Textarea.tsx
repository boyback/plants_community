'use client';

import { forwardRef } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import type { TextareaAutosizeProps } from 'react-textarea-autosize';
import { cn } from '@/lib/utils';

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
    ref,
  ) => {
    const count =
      typeof value === 'string' || typeof value === 'number'
        ? String(value).length
        : undefined;
    const hasCount = showCount && typeof count === 'number' && maxLength;

    return (
      <div className='relative'>
        {autoResize ? (
          <TextareaAutosize
            ref={ref}
            value={value}
            maxLength={maxLength}
            className={cn(
              'input resize-y',
              hasCount && 'pb-7',
              error && 'border-rose-300 bg-rose-50/30',
              className,
            )}
            {...props}
          />
        ) : (
          <textarea
            ref={ref}
            value={value}
            maxLength={maxLength}
            className={cn(
              'input resize-y',
              hasCount && 'pb-7',
              error && 'border-rose-300 bg-rose-50/30',
              className,
            )}
            {...props}
          />
        )}
        {hasCount && (
          <div
            className={cn(
              'pointer-events-none absolute bottom-2.5 right-3 rounded bg-white/90 px-1 text-xs leading-4 text-leaf-700/55',
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

Textarea.displayName = 'Textarea';
