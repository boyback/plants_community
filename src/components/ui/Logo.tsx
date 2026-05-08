'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTheme } from '@/theme/ThemeContext';

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { primary } = useTheme();
  return (
    <Link href="/" className={cn('inline-flex items-center gap-2 select-none', className)}>
      <span
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
        style={
          primary
            ? {
                background: `linear-gradient(135deg, ${primary.decoration.accentFrom}, ${primary.decoration.accentTo})`,
              }
            : {
                background: 'linear-gradient(135deg, #73d13d, #389e0d)',
              }
        }
      >
        <span className="text-lg" aria-hidden>
          🌵
        </span>
        {primary ? (
          <span
            className="absolute -right-1 -top-1 text-sm drop-shadow"
            aria-hidden
            title={primary.name}
          >
            {primary.decoration.logoBadge}
          </span>
        ) : (
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-sand-300" />
        )}
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-base font-bold text-leaf-800">肉友社</span>
          <span className="text-[10px] tracking-wider text-leaf-600/80">RouYou Community</span>
        </span>
      )}
    </Link>
  );
}
