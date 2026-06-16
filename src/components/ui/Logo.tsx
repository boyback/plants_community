'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTheme } from '@/theme/ThemeContext';
import { useColorTheme } from '@/context/ColorThemeContext';
import styles from './Logo.module.scss';
import { cx } from '@/lib/style-utils';



export function Logo({ className, compact = false }: {className?: string;compact?: boolean;}) {
  // 节日主题(festival theme):决定渐变色 + 角标(节日特定 emoji)
  const { primary } = useTheme();
  // 配色主题(color theme):决定 logo 主 emoji 与渐变兜底
  const { meta } = useColorTheme();

  // 节日主题优先(覆盖配色),否则用配色主题的渐变
  const gradient = primary ?
  `linear-gradient(135deg, ${primary.decoration.accentFrom}, ${primary.decoration.accentTo})` : cx(styles.r_c6502e26, styles.r_54817456, styles.r_789def6c);


  return (
    <Link href="/" className={cn(cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_7f691228, styles.r_64292b1c), className)}>
      <span
        className={cx(styles.r_d89972fe, styles.r_52083e7d, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_3960ffc2, styles.r_86843cf1, styles.r_5f22e64f, styles.r_72a4c7cd, styles.r_438b2237, styles.r_0fe7d7d8, styles.r_7890552e, styles.r_1a9195e1)}
        style={{ background: gradient }}>

        <span className={styles.r_4ee73492} aria-hidden>
          {meta.logoEmoji}
        </span>
        {primary &&
        <span
          className={cx(styles.r_da4dbfbc, styles.r_4c15f4f8, styles.r_2a95a5f4, styles.r_359090c2, styles.r_eb821e60)}
          aria-hidden
          title={primary.name}>

            {primary.decoration.logoBadge}
          </span>
        }
      </span>
      {!compact &&
      <span className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_e9fadafb)}>
          <span className={cx(styles.r_fc7473ca, styles.r_69450ef1, styles.r_e7eab4cb, styles.r_ceb69a6b, styles.r_c048d75f)}>植友圈</span>
          <span className={cx(styles.r_e0988086, styles.r_09ace3a4, styles.r_aa27a041)}>ZhiYou Community</span>
        </span>
      }
    </Link>);

}