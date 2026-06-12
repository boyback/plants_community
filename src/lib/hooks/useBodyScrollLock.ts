'use client';

import { useEffect } from 'react';

let lockCount = 0;
let touchStartY = 0;

const SCROLL_KEYS = new Set([
  ' ',
  'PageDown',
  'PageUp',
  'End',
  'Home',
  'ArrowDown',
  'ArrowUp'
]);

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function canScrollInside(target: EventTarget | null, deltaY: number) {
  if (!(target instanceof HTMLElement)) return false;

  let element: HTMLElement | null = target;
  while (element && element !== document.body && element !== document.documentElement) {
    const style = window.getComputedStyle(element);
    const canOverflow = /(auto|scroll|overlay)/.test(style.overflowY);
    const hasRoom = element.scrollHeight > element.clientHeight;

    if (canOverflow && hasRoom) {
      if (deltaY < 0 && element.scrollTop > 0) return true;
      if (deltaY > 0 && element.scrollTop + element.clientHeight < element.scrollHeight) return true;
    }

    element = element.parentElement;
  }

  return false;
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      document.documentElement.dataset.scrollLocked = 'true';
      window.dispatchEvent(new CustomEvent('body-scroll-lock-change', { detail: { locked: true } }));

      const preventWheel = (event: WheelEvent) => {
        if (canScrollInside(event.target, event.deltaY)) return;
        event.preventDefault();
      };

      const captureTouchStart = (event: TouchEvent) => {
        touchStartY = event.touches[0]?.clientY ?? 0;
      };

      const preventTouchMove = (event: TouchEvent) => {
        const currentY = event.touches[0]?.clientY ?? touchStartY;
        const deltaY = touchStartY - currentY;
        if (canScrollInside(event.target, deltaY)) return;
        event.preventDefault();
      };

      const preventKeys = (event: KeyboardEvent) => {
        if (!SCROLL_KEYS.has(event.key) || isEditableTarget(event.target)) return;
        event.preventDefault();
      };

      window.addEventListener('wheel', preventWheel, { passive: false });
      window.addEventListener('touchstart', captureTouchStart, { passive: true });
      window.addEventListener('touchmove', preventTouchMove, { passive: false });
      window.addEventListener('keydown', preventKeys);

      cleanupListeners = () => {
        window.removeEventListener('wheel', preventWheel);
        window.removeEventListener('touchstart', captureTouchStart);
        window.removeEventListener('touchmove', preventTouchMove);
        window.removeEventListener('keydown', preventKeys);
      };
    }

    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        cleanupListeners?.();
        cleanupListeners = null;
        delete document.documentElement.dataset.scrollLocked;
        window.dispatchEvent(new CustomEvent('body-scroll-lock-change', { detail: { locked: false } }));
      }
    };
  }, [locked]);
}

let cleanupListeners: (() => void) | null = null;
