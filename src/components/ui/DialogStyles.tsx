'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

/**
 * 风格1：极简轻量型
 * - 小尺寸、淡色背景、干扰性最小
 * - 适合快速确认、非关键操作
 */

interface DialogStyle1Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function DialogStyle1({ open, onClose, title, children, actions }: DialogStyle1Props) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xs rounded-lg bg-white p-4 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-sm font-medium text-ink-800">{title}</h3>
        <div className="text-xs text-ink-600">{children}</div>
        {actions && <div className="mt-3 flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialogStyle1({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}) {
  return (
    <DialogStyle1
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md px-3 py-1.5 text-xs text-ink-600 hover:bg-ink-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={
              danger
                ? 'flex-1 rounded-md px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50'
                : 'flex-1 rounded-md bg-leaf-600 px-3 py-1.5 text-xs text-white hover:bg-leaf-700'
            }
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </DialogStyle1>
  );
}

/**
 * 风格2：现代卡片型（当前默认风格的优化版）
 * - 中等尺寸、清晰层次、平衡的视觉重量
 * - 适合大多数场景
 */

interface DialogStyle2Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function DialogStyle2({ open, onClose, title, children, actions }: DialogStyle2Props) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-600"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="text-sm text-ink-700">{children}</div>
        {actions && <div className="mt-4 flex gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialogStyle2({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}) {
  return (
    <DialogStyle2
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={danger ? 'btn-outline flex-1 !border-rose-500 !text-rose-600 hover:!bg-rose-50' : 'btn-primary flex-1'}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </DialogStyle2>
  );
}

/**
 * 风格3：专业强调型
 * - 较大尺寸、明确边界、适合重要操作
 * - 适合需要用户特别注意的场景
 */

interface DialogStyle3Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function DialogStyle3({ open, onClose, title, children, actions }: DialogStyle3Props) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border-2 border-ink-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-ink-100 pb-3">
          <h3 className="text-lg font-bold text-ink-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-600"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="text-sm leading-relaxed text-ink-700">{children}</div>
        {actions && <div className="mt-5 flex gap-3 border-t border-ink-100 pt-4">{actions}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialogStyle3({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}) {
  return (
    <DialogStyle3
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <button type="button" onClick={onClose} className="btn-outline flex-1">
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={
              danger
                ? 'flex-1 rounded-lg border-2 border-rose-500 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100'
                : 'btn-primary flex-1'
            }
          >
            {confirmText}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </DialogStyle3>
  );
}
