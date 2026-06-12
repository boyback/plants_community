'use client';

import Link from 'next/link';
import styles from './LegalLinks.module.scss';
import { cx } from '@/lib/style-utils';



/**
 * 右栏底部的法律入口
 * 一行 horizontal:用户协议 · 隐私政策 · Cookie 政策
 */
export function LegalLinks() {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_86843cf1, styles.r_5a3268ed, styles.r_c163b0ed, styles.r_d5eab218, styles.r_1dc571a3, styles.r_6c4cc49e)}>
      <Link href="/terms" className={cx(styles.r_9825203a, styles.r_f673f4a7)}>
        用户协议
      </Link>
      <span aria-hidden>·</span>
      <Link href="/privacy" className={cx(styles.r_9825203a, styles.r_f673f4a7)}>
        隐私政策
      </Link>
      <span aria-hidden>·</span>
      <Link href="/cookies" className={cx(styles.r_9825203a, styles.r_f673f4a7)}>
        Cookie 政策
      </Link>
    </div>);

}