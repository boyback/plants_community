'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function StickyBoardFilter({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY;

      if (y > 120 && delta > 4) {
        setHidden(true);
      } else if (y < 80 || delta < -4) {
        setHidden(false);
      }

      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section
      className={cn(
        'sticky top-16 z-20 rounded-[6px] border border-leaf-100 bg-white p-4 shadow-sm transition-[transform,opacity] duration-200 lg:top-[112px]',
        hidden && 'pointer-events-none -translate-y-full opacity-0',
      )}
    >
      {children}
    </section>
  );
}
