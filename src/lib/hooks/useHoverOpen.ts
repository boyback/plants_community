'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Hover 触发的下拉打开/关闭管理。
 *
 * - mouseEnter:立刻打开
 * - mouseLeave:延迟关闭(默认 150ms),避免触发区与下拉之间的间隙导致闪烁
 * - 提供 bind() 把事件直接绑到容器上
 *
 * 使用:
 *   const { open, bind, close } = useHoverOpen();
 *   <div {...bind} className="relative">
 *     <button>...</button>
 *     {open && <div className="absolute">...</div>}
 *   </div>
 */
export function useHoverOpen(closeDelayMs = 150) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onEnter = useCallback(() => {
    cancelTimer();
    setOpen(true);
  }, []);

  const onLeave = useCallback(() => {
    cancelTimer();
    timerRef.current = setTimeout(() => setOpen(false), closeDelayMs);
  }, [closeDelayMs]);

  const close = useCallback(() => {
    cancelTimer();
    setOpen(false);
  }, []);

  return {
    open,
    bind: { onMouseEnter: onEnter, onMouseLeave: onLeave },
    close,
    setOpen,
  };
}
