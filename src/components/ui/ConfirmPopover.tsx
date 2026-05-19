'use client';

import { useEffect, useRef, useState } from 'react';

interface ConfirmPopoverProps {
  children: React.ReactNode;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={className}
      >
        {children}
      </div>

      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-leaf-200 bg-white p-4 shadow-lg animate-in fade-in-0 zoom-in-95"
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

          {/* 气泡尖角 */}
          <div className="absolute -top-2 left-4 w-4 h-2 overflow-hidden">
            <div className="absolute left-0 top-0 w-3 h-3 rotate-45 bg-white border-l border-t border-leaf-200 transform -translate-x-1/2" />
          </div>
        </div>
      )}
    </div>
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
