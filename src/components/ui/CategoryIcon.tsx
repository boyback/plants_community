'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface CategoryIconProps {
  icon: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4 text-xs',
  md: 'h-5 w-5 text-sm',
  lg: 'h-6 w-6 text-base',
};

const imgSizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

/**
 * 科图标组件
 * - icon 是图片 URL 时显示图片
 * - icon 是 emoji 时显示 emoji
 * - icon 为空或图片加载失败时只显示 name
 */
export function CategoryIcon({ icon, name, size = 'md', className }: CategoryIconProps) {
  const [imgError, setImgError] = useState(false);

  const isImageUrl = icon && (icon.startsWith('http') || icon.startsWith('/'));

  if (isImageUrl && !imgError) {
    return (
      <img
        src={icon}
        alt={name}
        className={cn('shrink-0 rounded object-cover', imgSizeMap[size], className)}
        onError={() => setImgError(true)}
      />
    );
  }

  if (icon && !isImageUrl) {
    return <span className={cn('shrink-0', sizeMap[size], className)}>{icon}</span>;
  }

  return null;
}

/**
 * 科图标 + 名称组合
 */
export function CategoryIconName({
  icon,
  name,
  size = 'md',
  className,
}: CategoryIconProps & { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <CategoryIcon icon={icon} name={name} size={size} />
      <span className="truncate">{name}</span>
    </span>
  );
}
