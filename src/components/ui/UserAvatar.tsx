'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { SkinItem } from '@/lib/types';
import { useTheme } from '@/theme/ThemeContext';

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
  showFestival = true,
}: {
  src: string;
  alt: string;
  size?: number;
  ring?: boolean;
  pendant?: SkinItem | null;
  isVip?: boolean;
  className?: string;
  showFestival?: boolean;
}) {
  const { primary } = useTheme();
  const festivalBadge = showFestival && primary ? primary.decoration.avatarBadge : null;
  // 优先用挂件;无挂件且 VIP 用金色边
  const meta = pendant?.meta as Record<string, unknown> | undefined;
  const ringColor = (meta?.color as string) ?? (isVip ? '#fbb03b' : undefined);
  const gradient = meta?.gradient as string | undefined;

  // 外圈宽度根据 size 动态
  const ringWidth = size <= 32 ? 2 : size <= 48 ? 2.5 : 3;
  const innerSize = size - ringWidth * 2;

  if (!ringColor && !gradient && !ring) {
    return (
      <span
        className={cn('inline-block overflow-hidden rounded-full bg-leaf-50', className)}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{
        width: size,
        height: size,
      }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: gradient ?? ringColor ?? 'white',
          padding: ringWidth,
        }}
      />
      <span
        className="relative overflow-hidden rounded-full bg-white"
        style={{ width: innerSize, height: innerSize }}
      >
        <Image
          src={src}
          alt={alt}
          width={innerSize}
          height={innerSize}
          className="h-full w-full object-cover"
          unoptimized
        />
      </span>
      {/* 挂件装饰:右下角 */}
      {pendant && pendant.preview && pendant.slug !== 'pendant-default' && (
        <span
          className="absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full bg-white shadow"
          style={{ width: size * 0.32, height: size * 0.32 }}
          aria-hidden
        >
          <span style={{ fontSize: size * 0.22 }}>{pendant.preview}</span>
        </span>
      )}
      {/* 节日装饰:右上角。若已有挂件,为了避免拥挤,占右上角 */}
      {festivalBadge && (
        <span
          className="absolute -top-1 -right-1 pointer-events-none select-none drop-shadow"
          style={{ fontSize: size * 0.36 }}
          aria-hidden
          title={primary?.name}
        >
          {festivalBadge}
        </span>
      )}
    </span>
  );
}
