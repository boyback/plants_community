'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

/**
 * 通用对话框组件
 */
export function Dialog({ open, onClose, title, children, actions, maxWidth = 'md' }: DialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-lg shadow-sm w-full ${maxWidthClass} p-5`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-medium text-ink-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded text-ink-400 hover:bg-ink-50 hover:text-ink-600"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="text-sm text-ink-600">{children}</div>
        {actions && <div className="mt-4 flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

/**
 * 确认对话框
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={
              danger
                ? 'flex-1 rounded-md bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 transition-colors'
                : 'flex-1 rounded-md bg-leaf-600 px-4 py-2 text-sm font-medium text-white hover:bg-leaf-700 transition-colors'
            }
          >
            {confirmText}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            {cancelText}
          </button>
        </>
      }
    >
      <p className="whitespace-pre-line">{message}</p>
    </Dialog>
  );
}

interface PromptDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * 输入对话框
 */
export function PromptDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  placeholder,
  defaultValue = '',
  confirmText = '确认',
  cancelText = '取消',
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md px-3 py-1.5 text-sm text-ink-600 hover:bg-ink-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(value);
              onClose();
            }}
            className="flex-1 rounded-md bg-leaf-600 px-3 py-1.5 text-sm text-white hover:bg-leaf-700 transition-colors"
          >
            {confirmText}
          </button>
        </>
      }
    >
      {message && <p className="mb-3">{message}</p>}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="input w-full"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onConfirm(value);
            onClose();
          }
        }}
      />
    </Dialog>
  );
}

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

/**
 * 提示对话框
 */
export function AlertDialog({
  open,
  onClose,
  title,
  message,
  type = 'info',
}: AlertDialogProps) {
  const iconMap = {
    info: { name: 'info' as const, color: 'text-blue-600' },
    success: { name: 'check' as const, color: 'text-leaf-600' },
    warning: { name: 'info' as const, color: 'text-amber-600' },
    error: { name: 'close' as const, color: 'text-rose-600' },
  };

  const icon = iconMap[type];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      actions={
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-md bg-leaf-600 px-3 py-1.5 text-sm text-white hover:bg-leaf-700 transition-colors"
        >
          确定
        </button>
      }
    >
      <div className="flex items-start gap-2">
        <Icon name={icon.name} size={16} className={icon.color} />
        <p className="flex-1 text-xs">{message}</p>
      </div>
    </Dialog>
  );
}
