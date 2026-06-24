'use client';

import { forwardRef, useMemo } from 'react';
import ReactSelect, {
  type FormatOptionLabelMeta,
  type MultiValue,
  type SingleValue,
  type StylesConfig,
} from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { cn } from '@/lib/utils';
import styles from './Select.module.scss';

export interface SelectOption {
  label: string;
  value: string;
  isDisabled?: boolean;
  id?: string;
  count?: number;
  custom?: boolean;
  canDelete?: boolean;
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

export interface MultiSelectProps {
  options: SelectOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[], options: SelectOption[]) => void;
  onCreateOption?: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
  wrapperClassName?: string;
  disabled?: boolean;
  isDisabled?: boolean;
  name?: string;
  required?: boolean;
  searchable?: boolean;
  creatable?: boolean;
  compact?: boolean;
  isLoading?: boolean;
  noOptionsMessage?: string;
  formatCreateLabel?: (input: string) => React.ReactNode;
  formatOptionLabel?: (option: SelectOption, meta: FormatOptionLabelMeta<SelectOption>) => React.ReactNode;
  isOptionDisabled?: (option: SelectOption) => boolean;
}

const menuPortalStyles: StylesConfig<SelectOption, false> = {
  menuPortal: (base) => ({ ...base, zIndex: 80 }),
};

const multiMenuPortalStyles: StylesConfig<SelectOption, true> = {
  menuPortal: (base) => ({ ...base, zIndex: 80 }),
};

function optionFromValue(options: SelectOption[], value: string | undefined) {
  if (value == null) return null;
  return options.find((option) => option.value === value) ?? null;
}

function optionsFromValues(options: SelectOption[], values: string[] | undefined) {
  if (!values) return [];
  return values.map((value) => optionFromValue(options, value) ?? { value, label: value, custom: true });
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
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
      value,
      wrapperClassName,
    },
    ref
  ) => {
    const selectedOption = useMemo(() => optionFromValue(options, value), [options, value]);
    const defaultOption = useMemo(() => optionFromValue(options, defaultValue), [defaultValue, options]);
    const resolvedDisabled = disabled || isDisabled;

    return (
      <div ref={ref} className={cn(styles.root, wrapperClassName)}>
        <ReactSelect<SelectOption, false>
          className={styles.select}
          classNames={{
            control: (state) =>
              cn(
                styles.control,
                state.isFocused && styles.controlFocused,
                error && styles.controlError,
                resolvedDisabled && styles.controlDisabled,
                className
              ),
            valueContainer: () => styles.valueContainer,
            placeholder: () => styles.placeholder,
            singleValue: () => styles.singleValue,
            input: () => styles.input,
            indicatorsContainer: () => styles.indicators,
            clearIndicator: () => styles.clearIndicator,
            dropdownIndicator: () => styles.dropdownIndicator,
            indicatorSeparator: () => styles.indicatorSeparator,
            menu: () => styles.menu,
            menuList: () => styles.menuList,
            option: (state) =>
              cn(
                styles.option,
                state.isFocused && styles.optionFocused,
                state.isSelected && styles.optionSelected,
                state.isDisabled && styles.optionDisabled
              ),
            noOptionsMessage: () => styles.noOptions,
          }}
          defaultValue={defaultOption}
          isDisabled={resolvedDisabled}
          isOptionDisabled={(option) => Boolean(option.isDisabled)}
          isSearchable={searchable}
          menuPortalTarget={typeof document === 'undefined' ? undefined : document.body}
          menuPosition="fixed"
          name={name}
          noOptionsMessage={() => '没有匹配结果'}
          onChange={(next: SingleValue<SelectOption>) => {
            onValueChange?.(next?.value ?? '', next ?? null);
          }}
          options={options}
          placeholder={placeholder}
          required={required}
          styles={menuPortalStyles}
          unstyled
          value={value === undefined ? undefined : selectedOption}
        />
      </div>
    );
  }
);

Select.displayName = 'Select';

export const MultiSelect = forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    {
      className,
      compact = false,
      creatable = false,
      defaultValue,
      disabled,
      error,
      formatOptionLabel,
      formatCreateLabel,
      isDisabled,
      isLoading,
      isOptionDisabled,
      name,
      noOptionsMessage = '没有匹配结果',
      onCreateOption,
      onValueChange,
      options,
      placeholder = '请选择',
      required,
      searchable = true,
      value,
      wrapperClassName,
    },
    ref
  ) => {
    const selectedOptions = useMemo(() => optionsFromValues(options, value), [options, value]);
    const defaultOptions = useMemo(() => optionsFromValues(options, defaultValue), [defaultValue, options]);
    const resolvedDisabled = disabled || isDisabled;
    const SelectComponent = creatable ? CreatableSelect : ReactSelect;

    return (
      <div ref={ref} className={cn(styles.root, wrapperClassName)}>
        <SelectComponent<SelectOption, true>
          className={styles.select}
          classNames={{
            control: (state) =>
              cn(
                styles.control,
                styles.multiControl,
                compact && styles.compactMultiControl,
                state.isFocused && styles.controlFocused,
                error && styles.controlError,
                resolvedDisabled && styles.controlDisabled,
                className
              ),
            valueContainer: () => cn(styles.valueContainer, styles.multiValueContainer, compact && styles.compactMultiValueContainer),
            placeholder: () => styles.placeholder,
            multiValue: () => cn(styles.multiValue, compact && styles.compactMultiValue),
            multiValueLabel: () => cn(styles.multiValueLabel, compact && styles.compactMultiValueLabel),
            multiValueRemove: () => cn(styles.multiValueRemove, compact && styles.compactMultiValueRemove),
            input: () => styles.input,
            indicatorsContainer: () => styles.indicators,
            clearIndicator: () => styles.clearIndicator,
            dropdownIndicator: () => styles.dropdownIndicator,
            indicatorSeparator: () => styles.indicatorSeparator,
            menu: () => styles.menu,
            menuList: () => styles.menuList,
            option: (state) =>
              cn(
                styles.option,
                state.isFocused && styles.optionFocused,
                state.isSelected && styles.optionSelected,
                state.isDisabled && styles.optionDisabled
              ),
            noOptionsMessage: () => styles.noOptions,
            loadingMessage: () => styles.noOptions,
          }}
          closeMenuOnSelect={false}
          defaultValue={defaultOptions}
          formatCreateLabel={formatCreateLabel ?? ((input) => `创建 #${input.trim().replace(/^#/, '')}`)}
          formatOptionLabel={formatOptionLabel}
          isDisabled={resolvedDisabled}
          isLoading={isLoading}
          isMulti
          isOptionDisabled={(option) => Boolean(option.isDisabled) || Boolean(isOptionDisabled?.(option))}
          isSearchable={searchable}
          menuPortalTarget={typeof document === 'undefined' ? undefined : document.body}
          menuPosition="fixed"
          name={name}
          noOptionsMessage={() => noOptionsMessage}
          loadingMessage={() => '加载中...'}
          onChange={(next: MultiValue<SelectOption>) => {
            const selected = [...next];
            onValueChange?.(selected.map((option) => option.value), selected);
          }}
          onCreateOption={onCreateOption}
          options={options}
          placeholder={placeholder}
          required={required}
          styles={multiMenuPortalStyles}
          unstyled
          value={value === undefined ? undefined : selectedOptions}
        />
      </div>
    );
  }
);

MultiSelect.displayName = 'MultiSelect';
