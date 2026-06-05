'use client';

import { Avatar as RadixAvatar } from 'radix-ui';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  ring?: boolean;
}

export function Avatar({ src, alt, size = 40, className, ring }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        // shrink-0 + min-w/h:flex 容器里不被挤压
        // aspect-square 兜底,即便外层强行拉宽也保持正方
        'inline-flex shrink-0 overflow-hidden rounded-full bg-leaf-50 aspect-square',
        ring && 'ring-2 ring-white shadow-sm',
        className
      )}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
      }}
    >
      <RadixAvatar.Image
        src={src}
        alt={alt}
        className="block h-full w-full object-cover"
      />
      <RadixAvatar.Fallback className="grid h-full w-full place-items-center bg-leaf-100 text-xs font-semibold text-leaf-700">
        {alt?.trim()?.charAt(0) || '?'}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}
