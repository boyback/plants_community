'use client';

import { isValidElement } from 'react';
import { Tooltip as RadixTooltip } from 'radix-ui';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  if (!content) return <>{children}</>;

  const trigger = isValidElement(children) ? children : <span className="inline-block">{children}</span>;

  return (
    <RadixTooltip.Provider delayDuration={180} skipDelayDuration={100}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          {trigger}
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side="top"
            align="center"
            sideOffset={8}
            collisionPadding={8}
            className={cn(
              'z-[99999] max-w-[300px] rounded bg-ink-800 px-2 py-1 text-xs text-white shadow-lg outline-none data-[state=closed]:animate-out data-[state=delayed-open]:animate-in data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:zoom-in-95',
              className
            )}
            style={{ width: 'max-content', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}
          >
            {content}
            <RadixTooltip.Arrow className="fill-ink-800" width={8} height={4} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
