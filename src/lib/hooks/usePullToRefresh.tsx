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
import styles from './usePullToRefresh.module.scss';
import { cx } from '@/lib/style-utils';



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
      onTouchEnd
    }
  };
}

/** 简易指示器组件,按 progress 显示"下拉 / 松开 / 刷新中" */
export function PullIndicator({ status, progress }: {status: PullStatus;progress: number;}) {
  const h = Math.min(60, Math.max(0, progress * 60));
  const t = h < 60 * 0.7 ? '下拉刷新' : status === 'refreshing' ? '加载中...' : '松开刷新';
  return (
    <div
      style={{ height: status === 'refreshing' ? 48 : h }}
      className={cx(styles.r_60fbb771, styles.r_6f27f4f7, styles.r_86843cf1, styles.r_2cd02d11, styles.r_359090c2, styles.r_69335b95, styles.r_ac730c66, styles.r_233c0494)}>

      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e, styles.r_f4cc511f)}>
        {status === 'refreshing' ?
        <span className={cx(styles.r_bb0c4bfc, styles.r_6a60c09e, styles.r_9cea0567, styles.r_afbdd13a, styles.r_ac204c10, styles.r_65935df5, styles.r_d3b27cd9, styles.r_30ac6a91)} /> :

        <span
          className={cx(styles.r_bb0c4bfc, styles.r_fc7473ca, styles.r_eadef238)}
          style={{ transform: status === 'release' ? "rotate(180deg)" : "rotate(0deg)" }}>

            ↓
          </span>
        }
        {t}
      </div>
    </div>);

}