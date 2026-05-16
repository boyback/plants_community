'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTheme } from '@/theme/ThemeContext';
import { useColorTheme } from '@/context/ColorThemeContext';

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  // 节日主题(festival theme):决定渐变色 + 角标(节日特定 emoji)
  const { primary } = useTheme();
  // 配色主题(color theme):决定 logo 主 emoji 与渐变兜底
  const { meta } = useColorTheme();

  // 节日主题优先(覆盖配色),否则用配色主题的渐变
  const gradient = primary
    ? `linear-gradient(135deg, ${primary.decoration.accentFrom}, ${primary.decoration.accentTo})`
    : `linear-gradient(135deg, rgb(var(--leaf-400)), rgb(var(--leaf-700)))`;

  return (
    <Link href="/" className={cn('inline-flex items-center gap-2 select-none group', className)}>
      <span
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm transition-all duration-300 group-hover:scale-105"
        style={{ background: gradient }}
      >
        <span className="text-base" aria-hidden>
          {meta.logoEmoji}
        </span>
        {primary && (
          <span
            className="absolute -right-0.5 -top-0.5 text-xs drop-shadow"
            aria-hidden
            title={primary.name}
          >
            {primary.decoration.logoBadge}
          </span>
        )}
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-leaf-800 transition-colors group-hover:text-leaf-900">肉友社</span>
          <span className="text-[9px] tracking-wider text-leaf-600/80">RouYou Community</span>
        </span>
      )}
    </Link>
  );
}
