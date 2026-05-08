'use client';

/**
 * 下拉刷新 Hook。
 *
 * 用法:
 *   const { bind, status, progress } = usePullToRefresh(async () => {
 *     await reload();
 *   });
 *   return (
 *     <div {...bind}>
 *       <PullIndicator status={status} progress={progress} />
 *       ...
 *     </div>
 *   );
 *
 * 约束:
 *   - 只有 document.scrollTop === 0 时才生效(否则会和普通滚动冲突)
 *   - 下拉阈值 70px 触发 onRefresh
 *   - 拖动过程中内容整体 translateY,最大 90px
 */

import { useCallback, useRef, useState } from 'react';

export type PullStatus = 'idle' | 'pulling' | 'release' | 'refreshing';

const THRESHOLD = 70;
const MAX = 90;

export function usePullToRefresh(onRefresh: () => Promise<unknown>) {
  const [status, setStatus] = useState<PullStatus>('idle');
  const [progress, setProgress] = useState(0); // 0 ~ 1+
  const startYRef = useRef<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (status === 'refreshing') return;
    if (typeof window !== 'undefined' && window.scrollY > 0) {
      startYRef.current = null;
      return;
    }
    startYRef.current = e.touches[0].clientY;
    setStatus('idle');
  }, [status]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    if (status === 'refreshing') return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy <= 0) {
      setProgress(0);
      return;
    }
    // 阻尼
    const damped = dy * 0.6;
    const clamped = Math.min(MAX, damped);
    setProgress(clamped / THRESHOLD);
    setStatus(clamped >= THRESHOLD ? 'release' : 'pulling');
  }, [status]);

  const onTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return;
    if (status === 'release') {
      setStatus('refreshing');
      try {
        await onRefresh();
      } finally {
        setStatus('idle');
        setProgress(0);
      }
    } else {
      setStatus('idle');
      setProgress(0);
    }
    startYRef.current = null;
  }, [status, onRefresh]);

  return {
    status,
    progress,
    bind: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}

/** 简易指示器组件,按 progress 显示"下拉 / 松开 / 刷新中" */
export function PullIndicator({ status, progress }: { status: PullStatus; progress: number }) {
  const h = Math.min(60, Math.max(0, progress * 60));
  const t = h < 60 * 0.7 ? '下拉刷新' : status === 'refreshing' ? '加载中...' : '松开刷新';
  return (
    <div
      style={{ height: status === 'refreshing' ? 48 : h }}
      className="flex items-end justify-center overflow-hidden text-xs text-leaf-700/70 transition-[height] duration-150"
    >
      <div className="flex items-center gap-1.5 pb-2">
        {status === 'refreshing' ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-leaf-500 border-t-transparent" />
        ) : (
          <span
            className="inline-block text-sm transition-transform"
            style={{ transform: status === 'release' ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ↓
          </span>
        )}
        {t}
      </div>
    </div>
  );
}
