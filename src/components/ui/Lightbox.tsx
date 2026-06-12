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
import { LivePhotoView } from '@/components/upload/LivePhotoView';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './Lightbox.module.scss';
import { cx } from '@/lib/style-utils';



interface Props {
  images: string[];
  /** null 表示未打开 */
  index: number | null;
  onClose: () => void;
  onChange?: (i: number) => void;
  /** 图片 URL → Live Photo 视频 URL 的映射(命中则用 LivePhotoView) */
  livePhotoMap?: Record<string, string>;
}

export function Lightbox({ images, index, onClose, onChange, livePhotoMap }: Props) {
  const [animOpen, setAnimOpen] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dxRef = useRef(0);
  const dyRef = useRef(0);
  const tracksRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState({ dx: 0, dy: 0, dragging: false });

  const open = index !== null;
  useBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setAnimOpen(true));
      return () => cancelAnimationFrame(id);
    }
    setAnimOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();else
      if (e.key === 'ArrowLeft' && index! > 0) onChange?.(index! - 1);else
      if (e.key === 'ArrowRight' && index! < images.length - 1) onChange?.(index! + 1);
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
      if (dx < 0 && index! < images.length - 1) onChange?.(index! + 1);else
      if (dx > 0 && index! > 0) onChange?.(index! - 1);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_7f74fd84, styles.r_60fbb771, styles.r_8dddea07, styles.r_c8d2a7ca, styles.r_67d6184a, styles.r_625a4c3f),

      animOpen ? styles.r_3972e98d : styles.r_7065497e
      )}>

      <header className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_359090c2, styles.r_201d4d37)}>
        <div className={styles.r_0e65706b}>{index! + 1} / {images.length}</div>
        <button
          type="button"
          onClick={onClose}
          className={cx(styles.r_f3c543ad, styles.r_e7a768f9, styles.r_ae2181c7, styles.r_67d66567, styles.r_ac204c10, styles.r_793aec7a, styles.r_4ee73492)}
          aria-label="close">

          ✕
        </button>
      </header>

      <div
        ref={tracksRef}
        className={cx(styles.r_d89972fe, styles.r_36e579c0, styles.r_2cd02d11)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => {
          // 点击背景(非图片本身)关闭
          if ((e.target as HTMLElement).tagName !== 'IMG') onClose();
        }}>

        <div
          className={cx(styles.r_60fbb771, styles.r_668b21aa, styles.r_220841ab)}
          style={{
            width: `${images.length * 100}%`,
            transform: `translate3d(calc(${-index! * 100 / images.length}% + ${drag.dx}px), ${drag.dy}px, 0)`,
            transition: drag.dragging ? 'none' : "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
            opacity: drag.dragging ? Math.max(0.4, 1 - Math.abs(drag.dy) / 400) : 1
          }}>

          {images.map((src, i) => {
            const liveUrl = livePhotoMap?.[src];
            return (
              <div
                key={i}
                className={cx(styles.r_f3c543ad, styles.r_668b21aa, styles.r_67d66567)}
                style={{ width: `${100 / images.length}%` }}>

                {liveUrl ?
                <LivePhotoView
                  imageUrl={src}
                  videoUrl={liveUrl}
                  alt={`图片 ${i + 1}`}
                  className={cx(styles.r_a201da4b, styles.r_c0980a65)}
                  imgClassName={cx(styles.r_b4168890, styles.r_b1104f41)} /> :


                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={`图片 ${i + 1}`}
                  className={cx(styles.r_a201da4b, styles.r_c0980a65, styles.r_7f691228, styles.r_b1104f41)}
                  draggable={false} />

                }
              </div>);

          })}
        </div>
      </div>
    </div>);

}
