import Image from 'next/image';
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
    <span
      className={cn(
        // shrink-0 + min-w/h:flex 容器里不被挤压
        // aspect-square 兜底,即便外层强行拉宽也保持正方
        'inline-block shrink-0 overflow-hidden rounded-full bg-leaf-50 aspect-square',
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
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="block h-full w-full object-cover"
        unoptimized
      />
    </span>
  );
}
