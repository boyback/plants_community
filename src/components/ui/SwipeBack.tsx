'use client';

/**
 * 左边缘滑动返回手势(iOS 风)。
 *
 * 用法:在 Shell 顶层渲染一次即可。监听整个 document touchstart,
 * 起点 x < 24px 才触发,水平移动 > 60px 且水平大于垂直 1.5 倍即视为返回。
 *
 * 仅在窄屏 (<= 768px) 启用,以免影响桌面端鼠标拖选行为。
 *
 * 和浏览器原生左缘手势不冲突:大多数 iOS Safari 已经原生支持,这里主要
 * 兜底 Android Chrome / 站点桌面 PWA。
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function SwipeBack() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth > 768) return;

    let startX = 0;
    let startY = 0;
    let active = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t.clientX > 24) {
        active = false;
        return;
      }
      active = true;
      startX = t.clientX;
      startY = t.clientY;
    };

    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx > 60 && dx > dy * 1.5) {
        router.back();
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [router]);

  return null;
}