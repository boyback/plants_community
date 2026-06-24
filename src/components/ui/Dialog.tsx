'use client';

import { useEffect, useState } from 'react';
import { Dialog as RadixDialog } from "radix-ui";
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './Dialog.module.scss';
import { cx } from '@/lib/style-utils';



interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'fit';
}

/**
 * 通用对话框组件
 */
export function Dialog({ open, onClose, title, children, actions, maxWidth = 'md' }: DialogProps) {
  useBodyScrollLock(open);

  const maxWidthClass = {
    sm: styles.r_2472e9b8,
    md: styles.r_9794ab45,
    lg: styles.r_6199866f,
    xl: styles.r_fa3f7111,
    fit: styles.dialogFit
  }[maxWidth];

  return (
    <RadixDialog.Root
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}>

      <RadixDialog.Portal>
        {open && (
          <div
            className={cx(styles.dialogOverlay, styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_96146c07, styles.r_2089b774, styles.r_a9faa555, styles.r_33b203f5)}
            data-state="open"
            aria-hidden="true"
            onClick={onClose}
          />
        )}
        <RadixDialog.Content
          className={cn(cx(styles.dialogContent, styles.r_7bc55599, styles.r_e632769a, styles.r_d694ba66, styles.r_181b2866, styles.r_3ea0a2b7, styles.r_efaa0701, styles.r_36b381be, styles.r_5f22e64f, styles.r_5e10cdb8, styles.r_c07e54fd, styles.r_438b2237, styles.r_df37b1fd, styles.r_2089b774, styles.r_a9faa555, styles.r_0bc7c6cf, styles.r_33b203f5, styles.r_26698b65, styles.r_3424811d),
          maxWidthClass
          )}>

          <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
            <RadixDialog.Title className={cx(styles.r_4ee73492, styles.r_2689f395, styles.r_399e11a5)}>{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button
                type="button"
                className={cx(styles.r_f3c543ad, styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_012fbd12, styles.r_67d66567, styles.r_07389a77, styles.r_66a36c90, styles.r_5399e21f, styles.r_dd42d0c0)}
                aria-label="关闭">

                <Icon name="close" size={14} />
              </button>
            </RadixDialog.Close>
          </div>
          <RadixDialog.Description asChild>
            <div className={cx(styles.r_fc7473ca, styles.r_02eb621e)}>{children}</div>
          </RadixDialog.Description>
          {actions && <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_77a2a20e)}>{actions}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>);

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
  danger = false
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
          danger ? cx(styles.r_36e579c0, styles.r_421ac2be, styles.r_45a732a4, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_2689f395, styles.r_72a4c7cd, styles.r_62129538, styles.r_ceb69a6b) : cx(styles.r_36e579c0, styles.r_421ac2be, styles.r_6bceb016, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_2689f395, styles.r_72a4c7cd, styles.r_e269e58c, styles.r_ceb69a6b)


          }>

            {confirmText}
          </button>
          <button
          type="button"
          onClick={onClose}
          className={cx(styles.r_36e579c0, styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_5e10cdb8, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_5399e21f, styles.r_ceb69a6b)}>

            {cancelText}
          </button>
        </>
      }>

      <p className={styles.r_3404bdae}>{message}</p>
    </Dialog>);

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
  cancelText = '取消'
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
          className={cx(styles.r_36e579c0, styles.r_421ac2be, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_02eb621e, styles.r_5399e21f, styles.r_ceb69a6b)}>

            {cancelText}
          </button>
          <button
          type="button"
          onClick={() => {
            onConfirm(value);
            onClose();
          }}
          className={cx(styles.r_36e579c0, styles.r_421ac2be, styles.r_6bceb016, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_72a4c7cd, styles.r_e269e58c, styles.r_ceb69a6b)}>

            {confirmText}
          </button>
        </>
      }>

      {message && <p className={styles.r_1bb88326}>{message}</p>}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={styles.r_6da6a3c3}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onConfirm(value);
            onClose();
          }
        }} />

    </Dialog>);

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
  type = 'info'
}: AlertDialogProps) {
  const iconMap = {
    info: { name: 'info' as const, color: styles.r_4c3a8aac },
    success: { name: 'check' as const, color: styles.r_b17d6a13 },
    warning: { name: 'info' as const, color: styles.r_47d65ecb },
    error: { name: 'close' as const, color: styles.r_595fceba }
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
        className={cx(styles.r_6da6a3c3, styles.r_421ac2be, styles.r_6bceb016, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_72a4c7cd, styles.r_e269e58c, styles.r_ceb69a6b)}>

          确定
        </button>
      }>

      <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_77a2a20e)}>
        <Icon name={icon.name} size={16} className={icon.color} />
        <p className={cx(styles.r_36e579c0, styles.r_359090c2)}>{message}</p>
      </div>
    </Dialog>);

}
