'use client';

/**
 * 背景粒子层
 *   - 使用 pure CSS keyframes,完全在 GPU 合成层,低开销
 *   - fixed 在页面左上角,pointer-events:none 不拦点击
 *   - 若用户 prefers-reduced-motion,返回 null
 *   - 节日 particleCount 为 0 时关闭
 */
import { useEffect, useState } from 'react';
import { useTheme } from './ThemeContext';
import styles from './FestivalParticles.module.scss';
import { cx } from '@/lib/style-utils';



export function FestivalParticles() {
  const { primary } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(m.matches);
    const h = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);

  if (!primary) return null;
  if (reducedMotion) return null;
  const count = primary.decoration.particleCount;
  if (count <= 0) return null;

  // 稳定伪随机:用 slug 作 seed,保证 SSR/CSR 一致
  const seed = hashCode(primary.slug);
  const particles = Array.from({ length: count }, (_, i) => {
    const r = pseudoRandom(seed + i);
    return {
      left: (r * 100).toFixed(2) + '%',
      delay: (r * 6 % 6).toFixed(2) + 's',
      duration: (6 + r * 6 % 4).toFixed(2) + 's',
      size: (18 + r * 10 % 12).toFixed(0) + 'px',
      opacity: (0.5 + r * 0.5 % 0.5).toFixed(2)
    };
  });

  return (
    <div
      aria-hidden
      className={cx(styles.r_a4326536, styles.r_7bc55599, styles.r_7b7df044, styles.r_2cd02d11, styles.r_af9d12c8)}>

      {particles.map((p, i) =>
      <span
        key={i}
        className={cx(styles.r_da4dbfbc, styles.r_64a6d4e0, styles.r_e19cf380)}
        style={{
          left: p.left,
          animationDelay: p.delay,
          animationDuration: p.duration,
          fontSize: p.size,
          opacity: p.opacity
        }}>

          {primary.decoration.particleEmoji}
        </span>
      )}
    </div>);

}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = h * 31 + s.charCodeAt(i) | 0;
  return Math.abs(h);
}
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}