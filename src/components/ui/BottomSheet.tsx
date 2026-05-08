'use client';

/**
 * 通用 Bottom Sheet。
 *
 * 用法:
 *   <BottomSheet open={open} onClose={() => setOpen(false)} title="选项">
 *     <div className="p-4">...</div>
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
  className,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [animOpen, setAnimOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragYRef = useRef(0);
  const dragStartRef = useRef<number | null>(null);

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

  // body scroll lock
  useEffect(() => {
    if (!mounted) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [mounted]);

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
      className="fixed inset-0 z-50 flex flex-col justify-end touch-manipulation"
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-ink-900/40 transition-opacity duration-200',
          animOpen ? 'opacity-100' : 'opacity-0'
        )}
      />
      {/* sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'relative z-10 mx-auto w-full max-w-[640px] overflow-hidden rounded-t-2xl bg-white shadow-2xl transition-transform duration-200',
          animOpen ? 'translate-y-0' : 'translate-y-full',
          className
        )}
        style={{ maxHeight }}
      >
        {/* drag handle */}
        <div
          className="grid place-items-center py-2.5 cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1 w-10 rounded-full bg-ink-200" />
        </div>
        {title && (
          <header className="px-5 pb-2 pt-1 text-base font-semibold text-ink-800">
            {title}
          </header>
        )}
        <div className="overflow-y-auto" style={{ maxHeight: `calc(${maxHeight} - 60px)` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
