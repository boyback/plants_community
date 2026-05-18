'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  if (!content) return <>{children}</>;

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[99999] whitespace-pre-wrap max-w-[300px] break-words rounded bg-ink-800 px-2 py-1 text-xs text-white shadow-lg pointer-events-none',
            className
          )}
          style={{ width: 'max-content' }}
        >
          {content}
        </span>
      )}
    </span>
  );
}