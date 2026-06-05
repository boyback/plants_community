'use client';

import { forwardRef } from 'react';
import { Select as RadixSelect } from 'radix-ui';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

export interface SelectOption {
  label: string;
  value: string;
  isDisabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, option: SelectOption | null) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
  isDisabled?: boolean;
  name?: string;
  required?: boolean;
}

function optionFromValue(options: SelectOption[], value: string | undefined) {
  if (value == null) return null;
  return options.find((option) => option.value === value) ?? null;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      className,
      defaultValue,
      disabled,
      error,
      isDisabled,
      name,
      onValueChange,
      options,
      placeholder = '请选择',
      required,
      value,
      wrapperClassName,
    },
    ref,
  ) => {
    const selectedOption = optionFromValue(options, value);
    const resolvedDisabled = disabled || isDisabled;

    return (
      <div className={cn('relative', wrapperClassName)}>
        <RadixSelect.Root
          value={value}
          defaultValue={defaultValue}
          disabled={resolvedDisabled}
          name={name}
          required={required}
          onValueChange={(nextValue) => {
            onValueChange?.(nextValue, optionFromValue(options, nextValue));
          }}
        >
          <RadixSelect.Trigger
            ref={ref}
            className={cn(
              'flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-[rgb(var(--surface))] px-3 text-left text-sm text-ink-800 outline-none transition-colors hover:border-leaf-300 focus:border-leaf-400 focus:ring-2 focus:ring-leaf-100 disabled:cursor-not-allowed disabled:opacity-60',
              error ? 'border-rose-300 bg-rose-50/30' : 'border-leaf-200',
              className
            )}
          >
            <RadixSelect.Value placeholder={placeholder}>
              {selectedOption?.label}
            </RadixSelect.Value>
            <RadixSelect.Icon asChild>
              <Icon name="arrow-right" size={14} className="shrink-0 rotate-90 text-leaf-700/55" />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>

          <RadixSelect.Portal>
            <RadixSelect.Content
              position="popper"
              sideOffset={6}
              className="z-[70] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[10px] border border-leaf-200 bg-[rgb(var(--surface))] p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.12)] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            >
              <RadixSelect.Viewport>
                {options.map((option) => (
                  <RadixSelect.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.isDisabled}
                    className="relative flex min-h-9 cursor-pointer select-none items-center rounded-lg px-3 pr-8 text-sm text-ink-800 outline-none data-[disabled]:pointer-events-none data-[disabled]:text-leaf-400 data-[highlighted]:bg-leaf-50 data-[state=checked]:bg-leaf-50 data-[state=checked]:font-semibold data-[state=checked]:text-leaf-800"
                  >
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                    <RadixSelect.ItemIndicator className="absolute right-2 inline-flex items-center text-leaf-700">
                      <span className="text-xs">✓</span>
                    </RadixSelect.ItemIndicator>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
      </div>
    );
  },
);

Select.displayName = 'Select';
