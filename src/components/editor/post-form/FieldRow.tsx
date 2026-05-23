import type { ReactNode } from 'react';

export function FieldRow({
  label,
  className,
  children,
}: {
  label: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className='mb-1.5 block text-sm font-semibold text-ink-800'>{label}</label>
      {children}
    </div>
  );
}
