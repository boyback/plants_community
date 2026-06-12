'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './DialogStyles.module.scss';
import { cx } from '@/lib/style-utils';



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
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_96146c07, styles.r_8e63407b)} onClick={onClose}>
      <div
        className={cx(styles.r_6da6a3c3, styles.r_3acf64d5, styles.r_5f22e64f, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_438b2237)}
        onClick={(e) => e.stopPropagation()}>

        <h3 className={cx(styles.r_a77ed4d9, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>{title}</h3>
        <div className={cx(styles.r_359090c2, styles.r_02eb621e)}>{children}</div>
        {actions && <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_77a2a20e)}>{actions}</div>}
      </div>
    </div>);

}

export function ConfirmDialogStyle1({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false









}: {open: boolean;onClose: () => void;onConfirm: () => void;title: string;message: string;confirmText?: string;cancelText?: string;danger?: boolean;}) {
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
          className={cx(styles.r_36e579c0, styles.r_421ac2be, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_02eb621e, styles.r_5399e21f)}>

            {cancelText}
          </button>
          <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={
          danger ? cx(styles.r_36e579c0, styles.r_421ac2be, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_595fceba, styles.r_85cfcc24) : cx(styles.r_36e579c0, styles.r_421ac2be, styles.r_6bceb016, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_72a4c7cd, styles.r_e269e58c)


          }>

            {confirmText}
          </button>
        </>
      }>

      <p>{message}</p>
    </DialogStyle1>);

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
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_b0d7388d, styles.r_8e63407b)} onClick={onClose}>
      <div
        className={cx(styles.r_6da6a3c3, styles.r_9794ab45, styles.r_a217b4ea, styles.r_5e10cdb8, styles.r_c07e54fd, styles.r_06bbb431)}
        onClick={(e) => e.stopPropagation()}>

        <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <h3 className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={cx(styles.r_f3c543ad, styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_67d66567, styles.r_5f22e64f, styles.r_66a36c90, styles.r_9cab05a6, styles.r_dd42d0c0)}>

            <Icon name="close" size={14} />
          </button>
        </div>
        <div className={cx(styles.r_fc7473ca, styles.r_eb6abb1f)}>{children}</div>
        {actions && <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_77a2a20e)}>{actions}</div>}
      </div>
    </div>);

}

export function ConfirmDialogStyle2({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false









}: {open: boolean;onClose: () => void;onConfirm: () => void;title: string;message: string;confirmText?: string;cancelText?: string;danger?: boolean;}) {
  return (
    <DialogStyle2
      open={open}
      onClose={onClose}
      title={title}
      actions={
      <>
          <button type="button" onClick={onClose} className={styles.r_36e579c0}>
            {cancelText}
          </button>
          <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={danger ? cx(styles.r_36e579c0, styles.r_a1eb481b, styles.r_765c12d3, styles.r_1a1cc1a3) : styles.r_36e579c0}>

            {confirmText}
          </button>
        </>
      }>

      <p>{message}</p>
    </DialogStyle2>);

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
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_53bb3a28, styles.r_8e63407b)} onClick={onClose}>
      <div
        className={cx(styles.r_6da6a3c3, styles.r_6199866f, styles.r_68f2db62, styles.r_65935df5, styles.r_7ae4c063, styles.r_5e10cdb8, styles.r_0478c89a, styles.r_14e46609)}
        onClick={(e) => e.stopPropagation()}>

        <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_65fdbade, styles.r_358505cf, styles.r_7fcf9124)}>
          <h3 className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_4ddaa618)}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_67d66567, styles.r_5f22e64f, styles.r_66a36c90, styles.r_9cab05a6, styles.r_dd42d0c0)}>

            <Icon name="close" size={16} />
          </button>
        </div>
        <div className={cx(styles.r_fc7473ca, styles.r_6b189c6e, styles.r_eb6abb1f)}>{children}</div>
        {actions && <div className={cx(styles.r_fb77735e, styles.r_60fbb771, styles.r_1004c0c3, styles.r_b950dda2, styles.r_358505cf, styles.r_173fa8f0)}>{actions}</div>}
      </div>
    </div>);

}

export function ConfirmDialogStyle3({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false









}: {open: boolean;onClose: () => void;onConfirm: () => void;title: string;message: string;confirmText?: string;cancelText?: string;danger?: boolean;}) {
  return (
    <DialogStyle3
      open={open}
      onClose={onClose}
      title={title}
      actions={
      <>
          <button type="button" onClick={onClose} className={styles.r_36e579c0}>
            {cancelText}
          </button>
          <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={
          danger ? cx(styles.r_36e579c0, styles.r_5f22e64f, styles.r_65935df5, styles.r_c994f7c9, styles.r_0759a0f1, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_e83a7042, styles.r_b54428d1, styles.r_c29b4826) : styles.r_36e579c0


          }>

            {confirmText}
          </button>
        </>
      }>

      <p>{message}</p>
    </DialogStyle3>);

}
