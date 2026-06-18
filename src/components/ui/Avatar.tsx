'use client';

import { Avatar as RadixAvatar } from "radix-ui";
import { cn } from '@/lib/utils';
import styles from './Avatar.module.scss';
import { cx } from '@/lib/style-utils';



interface AvatarProps {
  src: string;
  alt: string;
  size?: number | null;
  className?: string;
  ring?: boolean;
}

export function Avatar({ src, alt, size = 40, className, ring }: AvatarProps) {
  const sizeStyle =
    typeof size === 'number'
      ? {
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
        }
      : undefined;

  return (
    <RadixAvatar.Root
      className={cn(
      // 固定宽高并禁止收缩,避免在弹性容器里被挤压变形
      cx(styles.r_52083e7d, styles.r_012fbd12, styles.r_2cd02d11, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_b59cd297),
      ring && cx(styles.r_16b1efa5, styles.r_0af61200, styles.r_438b2237),
      className
      )}
      style={sizeStyle}>

      <RadixAvatar.Image
        src={src}
        alt={alt}
        className={cx(styles.r_0214b4b3, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)} />

      <RadixAvatar.Fallback className={cx(styles.r_f3c543ad, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_67d66567, styles.r_f2b23104, styles.r_359090c2, styles.r_e83a7042, styles.r_5f6a59f1)}>
        {alt?.trim()?.charAt(0) || '?'}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>);

}
