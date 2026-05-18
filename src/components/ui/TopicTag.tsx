'use client';

import { cn } from '@/lib/utils';

interface TopicTagProps {
  tag: string;
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TopicTag({ tag, href, size = 'md', className }: TopicTagProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  const baseClasses = `inline-flex items-center rounded-full bg-leaf-100 text-leaf-700 hover:bg-leaf-200 transition-colors ${sizeClasses[size]}`;

  if (href) {
    return (
      <a href={href} className={cn(baseClasses, className)}>
        #{tag}
      </a>
    );
  }

  return (
    <span className={cn(baseClasses, className)}>
      #{tag}
    </span>
  );
}