'use client';

/**
 * 通用 Bottom Sheet。
 *
 * 用法:
 *   <BottomSheet open={open} onClose={() => setOpen(false)} title="选项">
 *     <div>...</div>
 *   </BottomSheet>
 *
 * 特性:
 *   - 打开时自动锁定 body scroll
 *   - 顶部抓手:可拖动下拉关闭(下拉超过 80px 即关闭)
 *   - 点击 backdrop 关闭
 *   - ESC 键关闭(桌面端)
 *   - 进入 / 离开有 200ms transition
 *
 * 不依赖任何第三方动画库,纯 CSS transition + transform。
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './BottomSheet.module.scss';
import { cx } from '@/lib/style-utils';



interface Props {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  /** 默认高度上限 86vh,内容多时滚动 */
  maxHeight?: string;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  maxHeight = '86vh',
  className
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [animOpen, setAnimOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragYRef = useRef(0);
  const dragStartRef = useRef<number | null>(null);
  useBodyScrollLock(mounted);

  // mount/unmount 控制(支持离开动画)
  useEffect(() => {
    if (open) {
      setMounted(true);
      // 下一帧再触发动画,确保 DOM 已绘
      const id = requestAnimationFrame(() => setAnimOpen(true));
      return () => cancelAnimationFrame(id);
    } else {
      setAnimOpen(false);
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 拖动关闭
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartRef.current = e.touches[0].clientY;
    dragYRef.current = 0;
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartRef.current === null) return;
    const dy = e.touches[0].clientY - dragStartRef.current;
    if (dy > 0) {
      dragYRef.current = dy;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${dy}px)`;
        sheetRef.current.style.transition = 'none';
      }
    }
  }, []);
  const onTouchEnd = useCallback(() => {
    if (dragStartRef.current === null) return;
    const dy = dragYRef.current;
    dragStartRef.current = null;
    dragYRef.current = 0;
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
      sheetRef.current.style.transition = '';
    }
    if (dy > 80) onClose();
  }, [onClose]);

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_60fbb771, styles.r_8dddea07, styles.r_77c08e01, styles.r_cd1b8986)}>

      {/* backdrop */}
      <div
        onClick={onClose}
        className={cn(cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_094a9df0, styles.r_67d6184a, styles.r_625a4c3f),

        animOpen ? styles.r_3972e98d : styles.r_7065497e
        )} />

      {/* sheet */}
      <div
        ref={sheetRef}
        className={cn(cx(styles.r_d89972fe, styles.r_236812d6, styles.r_0e12dc7d, styles.r_6da6a3c3, styles.r_cb7721dc, styles.r_2cd02d11, styles.r_1e3a8aa7, styles.r_5e10cdb8, styles.r_14e46609, styles.r_eadef238, styles.r_625a4c3f),

        animOpen ? styles.r_fbccda82 : styles.r_8a624dc5,
        className
        )}
        style={{ maxHeight }}>

        {/* drag handle */}
        <div
          className={cx(styles.r_f3c543ad, styles.r_67d66567, styles.r_e7ee55ac, styles.r_8d083852, styles.r_d9bff91e)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}>

          <div className={cx(styles.r_3a1268a4, styles.r_d854e569, styles.r_ac204c10, styles.r_ee1b532e)} />
        </div>
        {title &&
        <header className={cx(styles.r_d139dd09, styles.r_f4cc511f, styles.r_6b7d6e21, styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>
            {title}
          </header>
        }
        <div className={styles.r_92bf82f4} style={{ maxHeight: `calc(${maxHeight} - 60px)` }}>
          {children}
        </div>
      </div>
    </div>);

}
