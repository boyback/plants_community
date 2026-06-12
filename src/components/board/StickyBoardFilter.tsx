'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './StickyBoardFilter.module.scss';
import { cx } from '@/lib/style-utils';



export function StickyBoardFilter({ children }: {children: React.ReactNode;}) {
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
      className={cn(cx(styles.r_3e0fd166, styles.r_493cfb05, styles.r_145745bf, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_438b2237, styles.r_80d1eef6, styles.r_625a4c3f, styles.r_6281de3e),

      hidden && cx(styles.r_a4326536, styles.r_9978b778, styles.r_7065497e)
      )}>

      {children}
    </section>);

}