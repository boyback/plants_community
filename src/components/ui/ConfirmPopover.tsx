'use client';

import { useState } from 'react';
import { Popover as RadixPopover } from 'radix-ui';
import { cn } from '@/lib/utils';

interface ConfirmPopoverProps {
  children: React.ReactNode;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: (() => void | Promise<void>) | ((item: unknown) => void | Promise<void>);
  className?: string;
}

/**
 * 气泡确认框 - 点击触发元素后在其附近弹出气泡确认框
 */
export function ConfirmPopover({
  children,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  danger = false,
  onConfirm,
  className,
}: ConfirmPopoverProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (onConfirm as (arg?: any) => Promise<void>)();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Trigger asChild>
        <span className={cn('inline-block', className)}>{children}</span>
      </RadixPopover.Trigger>

      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={8}
          collisionPadding={8}
          className="z-50 w-64 rounded-lg border border-leaf-200 bg-white p-4 shadow-lg outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          style={{ minWidth: '200px' }}
        >
          <div className="mb-1 text-sm font-medium text-ink-800">{title}</div>
          {message && (
            <div className="mb-3 text-xs text-leaf-700 whitespace-pre-line">{message}</div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              disabled={loading}
              className="flex-1 rounded-md border border-leaf-200 bg-white px-3 py-1.5 text-xs font-medium text-leaf-700 hover:bg-leaf-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleConfirm();
              }}
              disabled={loading}
              className={
                danger
                  ? 'flex-1 rounded-md bg-rose-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 transition-colors disabled:opacity-50'
                  : 'flex-1 rounded-md bg-leaf-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-leaf-700 transition-colors disabled:opacity-50'
              }
            >
              {loading ? '处理中...' : confirmText}
            </button>
          </div>

          <RadixPopover.Arrow className="fill-white stroke-leaf-200" width={16} height={8} />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

/**
 * 危险操作气泡确认框 - 用于删除等危险操作
 */
export function DangerConfirmPopover({
  children,
  title = '确定执行此操作？',
  message,
  confirmText = '确定',
  onConfirm,
  className,
}: Omit<ConfirmPopoverProps, 'danger'>) {
  return (
    <ConfirmPopover
      title={title}
      message={message}
      confirmText={confirmText}
      danger
      onConfirm={onConfirm}
      className={className}
    >
      {children}
    </ConfirmPopover>
  );
}
