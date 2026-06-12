'use client';

import { forwardRef, useMemo, useState } from 'react';
import { Select as RadixSelect } from "radix-ui";
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import styles from './Select.module.scss';
import { cx } from '@/lib/style-utils';



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
  searchable?: boolean;
  searchPlaceholder?: string;
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
    searchable = false,
    searchPlaceholder = '搜索',
    value,
    wrapperClassName
  },
  ref) =>
  {
    const [search, setSearch] = useState('');
    const selectedOption = optionFromValue(options, value);
    const resolvedDisabled = disabled || isDisabled;
    const visibleOptions = useMemo(() => {
      if (!searchable) return options;
      const keyword = normalizeSearch(search);
      if (!keyword) return options;
      return options.filter((option) => fuzzyMatch(`${option.label} ${option.value}`, keyword));
    }, [options, search, searchable]);

    return (
      <div className={cn(styles.r_d89972fe, wrapperClassName)}>
        <RadixSelect.Root
          value={value}
          defaultValue={defaultValue}
          disabled={resolvedDisabled}
          name={name}
          required={required}
          onOpenChange={(open) => {
            if (!open) setSearch('');
          }}
          onValueChange={(nextValue) => {
            onValueChange?.(nextValue, optionFromValue(options, nextValue));
          }}>

          <RadixSelect.Trigger
            ref={ref}
            className={cn(cx(styles.r_60fbb771, styles.r_426b8b75, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_19f7d7d6, styles.r_0e17f2bd, styles.r_2eba0d65, styles.r_fc7473ca, styles.r_399e11a5, styles.r_df37b1fd, styles.r_ceb69a6b, styles.r_a5c39c39, styles.r_74046e83, styles.r_608dd26c, styles.r_1491d072, styles.r_5f533b3a, styles.r_d463b664),

            error ? cx(styles.r_3b7f9781, styles.r_fdae7b46) : styles.r_691861bc,
            className
            )}>

            <RadixSelect.Value placeholder={placeholder}>
              {selectedOption?.label}
            </RadixSelect.Value>
            <RadixSelect.Icon asChild>
              <Icon name="arrow-right" size={14} className={cx(styles.r_012fbd12, styles.r_2fd32a11, styles.r_bb18baef)} />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>

          <RadixSelect.Portal>
            <RadixSelect.Content
              position="popper"
              sideOffset={6}
              className={cx(styles.r_ed7914c1, styles.r_ff4d2db0, styles.r_9b277f7a, styles.r_2cd02d11, styles.r_7c75ccbb, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_19f7d7d6, styles.r_cd009d7d, styles.r_0e5688b0, styles.r_2089b774, styles.r_a9faa555, styles.r_0bc7c6cf, styles.r_33b203f5, styles.r_26698b65, styles.r_3424811d)}>

              {searchable &&
              <div className={styles.r_eb6a3cef}>
                  <div className={styles.r_d89972fe}>
                    <Icon name="search" size={14} className={cx(styles.r_da4dbfbc, styles.r_ecfeb742, styles.r_d694ba66, styles.r_36b381be, styles.r_66a36c90)} />
                    <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                    className={cx(styles.r_e7a768f9, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_e4af8854, styles.r_fafb9e0b, styles.r_fc7473ca, styles.r_399e11a5, styles.r_df37b1fd, styles.r_56bf8ae8, styles.r_df4824ca, styles.r_608dd26c, styles.r_1491d072)}
                    placeholder={searchPlaceholder} />

                  </div>
                </div>
              }
              <RadixSelect.Viewport>
                {visibleOptions.map((option) =>
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.isDisabled}
                  className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_968a1e64, styles.r_34516836, styles.r_7f691228, styles.r_3960ffc2, styles.r_5f22e64f, styles.r_0e17f2bd, styles.r_dccaddb0, styles.r_fc7473ca, styles.r_399e11a5, styles.r_df37b1fd, styles.r_8e0c223b, styles.r_ff14edb2, styles.r_a9005ad9, styles.r_f69d3600, styles.r_db97fe0b, styles.r_bffebe50)}>

                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                    <RadixSelect.ItemIndicator className={cx(styles.r_da4dbfbc, styles.r_7b2d6393, styles.r_52083e7d, styles.r_3960ffc2, styles.r_5f6a59f1)}>
                      <span className={styles.r_359090c2}>✓</span>
                    </RadixSelect.ItemIndicator>
                  </RadixSelect.Item>
                )}
                {visibleOptions.length === 0 &&
                <div className={cx(styles.r_0e17f2bd, styles.r_940911bf, styles.r_ca6bf630, styles.r_359090c2, styles.r_66a36c90)}>没有匹配结果</div>
                }
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>
      </div>);

  }
);

Select.displayName = 'Select';

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function fuzzyMatch(source: string, keyword: string) {
  const normalizedSource = normalizeSearch(source);
  if (normalizedSource.includes(keyword)) return true;

  let keywordIndex = 0;
  for (const char of normalizedSource) {
    if (char === keyword[keywordIndex]) keywordIndex += 1;
    if (keywordIndex === keyword.length) return true;
  }
  return false;
}