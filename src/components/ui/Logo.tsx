import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn('inline-flex items-center gap-2 select-none', className)}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-leaf-400 to-leaf-600 text-white shadow-sm">
        <span className="text-lg" aria-hidden>
          🌵
        </span>
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-sand-300" />
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
