'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { SkinItem } from '@/lib/types';
import { useTheme } from '@/theme/ThemeContext';
import styles from './UserAvatar.module.scss';
import { cx } from '@/lib/style-utils';



/**
 * 带挂件 / 普通边框 的头像。
 * 当 user.equip.pendant 存在时,根据 meta.color / meta.gradient 渲染外圈。
 */
export function UserAvatar({
  src,
  alt,
  size = 40,
  ring = true,
  pendant,
  className,
  pendantLayout = 'reserve',
  /** 是否叠加节日徽章(默认开,在某些细节页可以关掉) */
  showFestival = true









}: {src: string;alt: string;size?: number;ring?: boolean;pendant?: SkinItem | null;className?: string;pendantLayout?: 'reserve' | 'compact';showFestival?: boolean;}) {
  const { primary } = useTheme();
  const festivalBadge = showFestival && primary ? primary.decoration.avatarBadge : null;
  // 优先用挂件;无挂件时使用普通边框
  const meta = pendant?.meta as Record<string, unknown> | undefined;
  const ringColor = meta?.color as string | undefined;
  const gradient = meta?.gradient as string | undefined;
  const pendantAssetUrl =
  typeof meta?.assetUrl === 'string' ? meta.assetUrl :
  pendant?.preview?.startsWith('/') ? pendant.preview :
  undefined;
  const hasPendantAsset = Boolean(pendant && pendantAssetUrl);

  // 外圈宽度根据 size 动态
  const ringWidth = size <= 32 ? 2 : size <= 48 ? 2.5 : 3;
  const reserveSize = size * 1.45;
  const outerSize = hasPendantAsset && pendantLayout === 'reserve' ? reserveSize : size;
  const compactAvatarInset = hasPendantAsset && pendantLayout === 'compact' ? 4 : 0;
  const innerSize = hasPendantAsset ? size - compactAvatarInset : size - ringWidth * 2;
  const pendantSize = hasPendantAsset
    ? pendantLayout === 'compact'
      ? size
      : Math.max(size * 0.86, reserveSize * 0.9)
    : outerSize;
  const avatarOffset = hasPendantAsset && pendantLayout === 'reserve' ? (outerSize - size) / 2 : 0;

  if (!hasPendantAsset && !ringColor && !gradient && !ring) {
    return (
      <span
        className={cn(cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_86843cf1, styles.r_2cd02d11, styles.r_ac204c10, styles.r_7ebecbb6), className)}
        style={{ width: size, height: size }}>

        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className={cx(styles.r_0214b4b3, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)}
          unoptimized />

      </span>);

  }

  return (
    <span
      className={cn(cx(styles.r_d89972fe, styles.r_52083e7d, styles.r_3960ffc2, styles.r_86843cf1), className)}
      style={{
        width: outerSize,
        height: outerSize,
        minWidth: outerSize,
        minHeight: outerSize
      }}>

      <span
        aria-hidden={hasPendantAsset}
        className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_ac204c10)}
        style={{
          background: hasPendantAsset ? 'transparent' : gradient ?? ringColor ?? 'white',
          padding: hasPendantAsset ? 0 : ringWidth,
          inset: hasPendantAsset ? avatarOffset : 0
        }} />

      <span
        className={cx(styles.r_d89972fe, styles.r_2cd02d11, styles.r_ac204c10, styles.r_5e10cdb8)}
        style={{ width: innerSize, height: innerSize, zIndex: 1 }}>

        <Image
          src={src}
          alt={alt}
          width={innerSize}
          height={innerSize}
          className={cx(styles.r_0214b4b3, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)}
          unoptimized />

      </span>
      {/* 挂件装饰:右下角 */}
      {hasPendantAsset && pendantAssetUrl &&
      <span
        className={styles.pendantAsset}
        style={{ width: pendantSize, height: pendantSize }}
        aria-hidden>

          <Image src={pendantAssetUrl} alt="" fill unoptimized className={styles.pendantAssetImage} />
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
