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
        'inline-block overflow-hidden rounded-full bg-leaf-50',
        ring && 'ring-2 ring-white shadow-sm',
        className
      )}
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
