'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import styles from './Switch.module.scss';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role'> {}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, ...props },
  ref
) {
  return <input ref={ref} type="checkbox" role="switch" className={cn(styles.switch, className)} {...props} />;
});

Switch.displayName = 'Switch';
