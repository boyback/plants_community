import { cn } from '@/lib/utils';

/** 大会员小标识 */
export function VipBadge({
  size = 'sm',
  lifetime,
  shareholder,
  className,
}: {
  size?: 'xs' | 'sm' | 'md';
  lifetime?: boolean;
  shareholder?: boolean;
  className?: string;
}) {
  const sizeCls =
    size === 'xs'
      ? 'text-[9px] px-1 py-px gap-0.5'
      : size === 'md'
      ? 'text-xs px-2 py-0.5 gap-1'
      : 'text-[10px] px-1.5 py-px gap-0.5';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold uppercase tracking-wider',
        'bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 text-amber-900',
        'shadow-[0_1px_2px_rgba(251,176,59,0.3)]',
        sizeCls,
        className
      )}
      title={lifetime ? '终身大会员' : shareholder ? '社区股东(老会员)' : '大会员'}
    >
      <span aria-hidden>{lifetime ? '∞' : '👑'}</span>
      {lifetime ? 'LIFETIME' : shareholder ? '股东' : 'VIP'}
    </span>
  );
}
