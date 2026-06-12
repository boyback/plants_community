'use client';

import { useState } from 'react';
import { Popover as RadixPopover } from "radix-ui";
import { cn } from '@/lib/utils';
import styles from './ConfirmPopover.module.scss';
import { cx } from '@/lib/style-utils';



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
  className
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
        <span className={cn(styles.r_bb0c4bfc, className)}>{children}</span>
      </RadixPopover.Trigger>

      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={8}
          collisionPadding={8}
          className={cx(styles.r_181b2866, styles.r_6ca62528, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_06bbb431, styles.r_df37b1fd, styles.r_2089b774, styles.r_a9faa555, styles.r_0bc7c6cf, styles.r_33b203f5, styles.r_26698b65, styles.r_3424811d)}
          style={{ minWidth: '200px' }}>

          <div className={cx(styles.r_65281709, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{title}</div>
          {message &&
          <div className={cx(styles.r_1bb88326, styles.r_359090c2, styles.r_5f6a59f1, styles.r_3404bdae)}>{message}</div>
          }
          <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              disabled={loading}
              className={cx(styles.r_36e579c0, styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_2689f395, styles.r_5f6a59f1, styles.r_5756b7b4, styles.r_ceb69a6b)}>

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
              danger ? cx(styles.r_36e579c0, styles.r_421ac2be, styles.r_45a732a4, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_2689f395, styles.r_72a4c7cd, styles.r_62129538, styles.r_ceb69a6b, styles.r_b29d8adb) : cx(styles.r_36e579c0, styles.r_421ac2be, styles.r_6bceb016, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_2689f395, styles.r_72a4c7cd, styles.r_e269e58c, styles.r_ceb69a6b, styles.r_b29d8adb)


              }>

              {loading ? '处理中...' : confirmText}
            </button>
          </div>

          <RadixPopover.Arrow className={cx(styles.r_34208978, styles.r_a876a480)} width={16} height={8} />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>);

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
  className
}: Omit<ConfirmPopoverProps, 'danger'>) {
  return (
    <ConfirmPopover
      title={title}
      message={message}
      confirmText={confirmText}
      danger
      onConfirm={onConfirm}
      className={className}>

      {children}
    </ConfirmPopover>);

}