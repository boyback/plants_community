'use client';

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ComponentProps } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import styles from './Button.module.scss';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'muted';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconOnly = false,
  className
}: ButtonStyleOptions = {}) {
  return cn(
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    iconOnly && styles.icon,
    className
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      type = 'button',
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      iconOnly = false,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, fullWidth, iconOnly, className })}
      {...props}
    />
  )
);

Button.displayName = 'Button';

export interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
}

export function ButtonLink({
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconOnly = false,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClassName({ variant, size, fullWidth, iconOnly, className })}
      {...props}
    />
  );
}
