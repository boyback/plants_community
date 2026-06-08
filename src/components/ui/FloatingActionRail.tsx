'use client';

import { useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn, formatNumber } from '@/lib/utils';

export type FloatingActionItem = {
  icon: IconName;
  label: string;
  count?: number;
  active?: boolean;
  activeCls?: string;
  disabled?: boolean;
  onClick?: () => void;
};

export function FloatingActionRail({ items, contentMaxWidth = 1280 }: { items: FloatingActionItem[]; contentMaxWidth?: number }) {
  const [open, setOpen] = useState(true);
  const railLeft = `max(16px,calc(50vw - ${contentMaxWidth / 2}px - 76px))`;
  const toggleLeft = `max(16px,calc(50vw - ${contentMaxWidth / 2}px - 72px))`;

  return (
    <div className="hidden md:block">
      <div
        className={cn(
          'fixed top-1/2 z-30 w-16 -translate-y-1/2 transition-[transform,opacity] duration-200 ease-out',
          open ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-3 opacity-0',
        )}
        style={{ left: railLeft }}
        aria-hidden={!open}
      >
        <div className="overflow-hidden rounded-2xl border border-leaf-100 bg-white/95 p-1.5 shadow-lg shadow-ink-900/5 backdrop-blur">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mb-1 grid h-8 w-full place-items-center rounded-xl text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
            title="收起操作栏"
            aria-label="收起操作栏"
          >
            <Icon name="close" size={14} />
          </button>
          <div className="space-y-1">
            {items.map((item) => (
              <ActionButton key={`${item.icon}-${item.label}`} item={item} />
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed top-1/2 z-30 grid h-12 w-8 -translate-y-1/2 place-items-center rounded-full bg-ink-100 text-ink-500 shadow-md shadow-ink-900/5 transition-[transform,opacity,background-color,color] duration-200 ease-out hover:bg-ink-200 hover:text-ink-800',
          open ? 'pointer-events-none -translate-x-3 opacity-0' : 'translate-x-0 opacity-100',
        )}
        style={{ left: toggleLeft }}
        title="展开操作栏"
        aria-label="展开操作栏"
        aria-expanded={open}
      >
        <Icon name="menu" size={16} />
      </button>
    </div>
  );
}

function ActionButton({ item }: { item: FloatingActionItem }) {
  return (
    <button
      type="button"
      disabled={item.disabled}
      onClick={item.onClick}
      className={cn(
        'flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-[11px] font-semibold leading-tight text-ink-600 transition-colors hover:bg-leaf-50 hover:text-leaf-800 disabled:cursor-not-allowed disabled:opacity-60',
        item.active && (item.activeCls ?? 'bg-leaf-50 text-leaf-800'),
      )}
      title={item.label}
      aria-label={item.label}
    >
      <Icon name={item.icon} size={16} fill={item.active ? 'currentColor' : 'none'} />
      <span>{item.label}</span>
      {typeof item.count === 'number' && (
        <span className={cn('text-[11px] font-medium text-ink-400', item.active && 'text-current')}>
          {formatNumber(item.count)}
        </span>
      )}
    </button>
  );
}
