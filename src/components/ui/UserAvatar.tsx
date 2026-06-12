'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { SkinItem } from '@/lib/types';
import { useTheme } from '@/theme/ThemeContext';
import styles from './UserAvatar.module.scss';
import { cx } from '@/lib/style-utils';



/**
 * 带挂件 / VIP 边框 的头像。
 * 当 user.equip.pendant 存在时,根据 meta.color / meta.gradient 渲染外圈。
 */
export function UserAvatar({
  src,
  alt,
  size = 40,
  ring = true,
  pendant,
  isVip,
  className,
  /** 是否叠加节日徽章(默认开,在某些细节页可以关掉) */
  showFestival = true









}: {src: string;alt: string;size?: number;ring?: boolean;pendant?: SkinItem | null;isVip?: boolean;className?: string;showFestival?: boolean;}) {
  const { primary } = useTheme();
  const festivalBadge = showFestival && primary ? primary.decoration.avatarBadge : null;
  // 优先用挂件;无挂件且 VIP 用金色边
  const meta = pendant?.meta as Record<string, unknown> | undefined;
  const ringColor = meta?.color as string ?? (isVip ? '#fbb03b' : undefined);
  const gradient = meta?.gradient as string | undefined;

  // 外圈宽度根据 size 动态
  const ringWidth = size <= 32 ? 2 : size <= 48 ? 2.5 : 3;
  const innerSize = size - ringWidth * 2;

  if (!ringColor && !gradient && !ring) {
    return (
      <span
        className={cn(cx(styles.r_bb0c4bfc, styles.r_2cd02d11, styles.r_ac204c10, styles.r_7ebecbb6), className)}
        style={{ width: size, height: size }}>

        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)}
          unoptimized />

      </span>);

  }

  return (
    <span
      className={cn(cx(styles.r_d89972fe, styles.r_52083e7d, styles.r_3960ffc2, styles.r_86843cf1), className)}
      style={{
        width: size,
        height: size
      }}>

      <span
        className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_ac204c10)}
        style={{
          background: gradient ?? ringColor ?? 'white',
          padding: ringWidth
        }} />

      <span
        className={cx(styles.r_d89972fe, styles.r_2cd02d11, styles.r_ac204c10, styles.r_5e10cdb8)}
        style={{ width: innerSize, height: innerSize }}>

        <Image
          src={src}
          alt={alt}
          width={innerSize}
          height={innerSize}
          className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)}
          unoptimized />

      </span>
      {/* 挂件装饰:右下角 */}
      {pendant && pendant.preview && pendant.slug !== "pendant-default" &&
      <span
        className={cx(styles.r_da4dbfbc, styles.r_f40d346d, styles.r_4c15f4f8, styles.r_f3c543ad, styles.r_67d66567, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_ed9d3d83)}
        style={{ width: size * 0.32, height: size * 0.32 }}
        aria-hidden>

          <span style={{ fontSize: size * 0.22 }}>{pendant.preview}</span>
        </span>
      }
      {/* 节日装饰:右上角。若已有挂件,为了避免拥挤,占右上角 */}
      {festivalBadge &&
      <span
        className={cx(styles.r_da4dbfbc, styles.r_d7fbcc4b, styles.r_c9e05721, styles.r_a4326536, styles.r_7f691228, styles.r_eb821e60)}
        style={{ fontSize: size * 0.36 }}
        aria-hidden
        title={primary?.name}>

          {festivalBadge}
        </span>
      }
    </span>);

}