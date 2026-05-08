'use client';

/**
 * 全屏图片查看器(移动端友好)。
 *
 * 控制:
 *   - 左右滑(touch)切图;桌面用左/右箭头键
 *   - 上滑/下滑 > 80px 关闭;ESC 关闭
 *   - 点击背景关闭
 *   - 顶部 [N/M] 计数器
 *
 * 用法:
 *   const [idx, setIdx] = useState<number | null>(null);
 *   <Lightbox images={imgs} index={idx} onClose={() => setIdx(null)} onChange={setIdx} />
 *
 * Demo 起点不依赖第三方,纯 React + transition + transform。
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  images: string[];
  /** null 表示未打开 */
  index: number | null;
  onClose: () => void;
  onChange?: (i: number) => void;
}

export function Lightbox({ images, index, onClose, onChange }: Props) {
  const [animOpen, setAnimOpen] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dxRef = useRef(0);
  const dyRef = useRef(0);
  const tracksRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState({ dx: 0, dy: 0, dragging: false });

  const open = index !== null;

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setAnimOpen(true));
      return () => cancelAnimationFrame(id);
    }
    setAnimOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = orig; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && index! > 0) onChange?.(index! - 1);
      else if (e.key === 'ArrowRight' && index! < images.length - 1) onChange?.(index! + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index, images.length, onClose, onChange]);

  if (!open) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    dxRef.current = 0;
    dyRef.current = 0;
    setDrag({ dx: 0, dy: 0, dragging: true });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;
    dxRef.current = dx;
    dyRef.current = dy;
    setDrag({ dx, dy, dragging: true });
  };

  const onTouchEnd = () => {
    const { dx, dy } = { dx: dxRef.current, dy: dyRef.current };
    setDrag({ dx: 0, dy: 0, dragging: false });
    // 上下关闭
    if (Math.abs(dy) > 80 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
      return;
    }
    // 左右切图(阈值 60px)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && index! < images.length - 1) onChange?.(index! + 1);
      else if (dx > 0 && index! > 0) onChange?.(index! - 1);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        'fixed inset-0 z-[60] flex flex-col bg-ink-900 transition-opacity duration-200',
        animOpen ? 'opacity-100' : 'opacity-0'
      )}
    >
      <header className="flex items-center justify-between px-4 py-3 text-xs text-white/80">
        <div className="font-mono">{index! + 1} / {images.length}</div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-base"
          aria-label="close"
        >
          ✕
        </button>
      </header>

      <div
        ref={tracksRef}
        className="relative flex-1 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => {
          // 点击背景(非图片本身)关闭
          if ((e.target as HTMLElement).tagName !== 'IMG') onClose();
        }}
      >
        <div
          className="flex h-full will-change-transform"
          style={{
            width: `${images.length * 100}%`,
            transform: `translate3d(calc(${-index! * 100 / images.length}% + ${drag.dx}px), ${drag.dy}px, 0)`,
            transition: drag.dragging ? 'none' : 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
            opacity: drag.dragging ? Math.max(0.4, 1 - Math.abs(drag.dy) / 400) : 1,
          }}
        >
          {images.map((src, i) => (
            <div
              key={i}
              className="grid h-full place-items-center"
              style={{ width: `${100 / images.length}%` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`图片 ${i + 1}`}
                className="max-h-full max-w-full select-none object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
