'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './CategoryIcon.module.scss';
import { cx } from '@/lib/style-utils';



interface CategoryIconProps {
  icon: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: cx(styles.r_11e59c6d, styles.r_dc7972eb, styles.r_359090c2),
  md: cx(styles.r_cd0d9c51, styles.r_72470489, styles.r_fc7473ca),
  lg: cx(styles.r_f6fe9024, styles.r_7ec10f86, styles.r_4ee73492)
};

const imgSizeMap = {
  sm: cx(styles.r_11e59c6d, styles.r_dc7972eb),
  md: cx(styles.r_cd0d9c51, styles.r_72470489),
  lg: cx(styles.r_f6fe9024, styles.r_7ec10f86)
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
        className={cn(cx(styles.r_012fbd12, styles.r_07389a77, styles.r_7d85d0c2), imgSizeMap[size], className)}
        onError={() => setImgError(true)} />);


  }

  if (icon && !isImageUrl) {
    return <span className={cn(styles.r_012fbd12, sizeMap[size], className)}>{icon}</span>;
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
  className
}: CategoryIconProps & {className?: string;}) {
  return (
    <span className={cn(cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_58284b4e), className)}>
      <CategoryIcon icon={icon} name={name} size={size} />
      <span className={styles.r_f283ea9b}>{name}</span>
    </span>);

}