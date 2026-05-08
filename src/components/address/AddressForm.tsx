'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nContext';
import type { Address } from '@/lib/types';

export interface AddressFormValue {
  name: string;
  phone: string;
  province?: string;
  city?: string;
  district?: string;
  detail: string;
  zip?: string;
  tag?: string;
  isDefault?: boolean;
}

const TAG_PRESET_KEYS: Array<{ key: string; zh: string }> = [
  { key: 'home', zh: '家' },
  { key: 'office', zh: '公司' },
  { key: 'school', zh: '学校' },
  { key: 'parents', zh: '父母' },
  { key: 'friend', zh: '朋友' },
];

export function AddressForm({
  initial,
  onSubmit,
  onCancel,
  submitting = false,
  showDefaultToggle = true,
  submitText,
}: {
  initial?: Partial<Address>;
  onSubmit: (v: AddressFormValue) => Promise<void> | void;
  onCancel?: () => void;
  submitting?: boolean;
  showDefaultToggle?: boolean;
  /** 不传则默认为 addresses.save 翻译 */
  submitText?: string;
}) {
  const { t } = useI18n();
  const [v, setV] = useState<AddressFormValue>({
    name: initial?.name ?? '',
    phone: initial?.phone ?? '',
    province: initial?.province ?? '',
    city: initial?.city ?? '',
    district: initial?.district ?? '',
    detail: initial?.detail ?? '',
    zip: initial?.zip ?? '',
    tag: initial?.tag ?? '',
    isDefault: initial?.isDefault ?? false,
  });
  const [err, setErr] = useState<string | null>(null);

  const update = <K extends keyof AddressFormValue>(k: K, val: AddressFormValue[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!v.name.trim()) return setErr(t('addresses.form.errName'));
    if (!v.phone.trim()) return setErr(t('addresses.form.errPhone'));
    if (!v.detail.trim() || v.detail.length < 5) return setErr(t('addresses.form.errDetail'));
    await onSubmit({
      ...v,
      name: v.name.trim(),
      phone: v.phone.trim(),
      detail: v.detail.trim(),
      province: v.province?.trim() || undefined,
      city: v.city?.trim() || undefined,
      district: v.district?.trim() || undefined,
      zip: v.zip?.trim() || undefined,
      tag: v.tag?.trim() || undefined,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('addresses.form.name')}>
          <input
            className="input"
            value={v.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={t('addresses.form.namePlaceholder')}
          />
        </Field>
        <Field label={t('addresses.form.phone')}>
          <input
            className="input"
            inputMode="tel"
            value={v.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder={t('addresses.form.phonePlaceholder')}
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label={t('addresses.form.province')}>
          <input
            className="input"
            value={v.province ?? ''}
            onChange={(e) => update('province', e.target.value)}
            placeholder={t('addresses.form.provincePlaceholder')}
          />
        </Field>
        <Field label={t('addresses.form.city')}>
          <input
            className="input"
            value={v.city ?? ''}
            onChange={(e) => update('city', e.target.value)}
            placeholder={t('addresses.form.cityPlaceholder')}
          />
        </Field>
        <Field label={t('addresses.form.district')}>
          <input
            className="input"
            value={v.district ?? ''}
            onChange={(e) => update('district', e.target.value)}
            placeholder={t('addresses.form.districtPlaceholder')}
          />
        </Field>
      </div>

      <Field label={t('addresses.form.detail')}>
        <textarea
          className="input min-h-[64px]"
          value={v.detail}
          onChange={(e) => update('detail', e.target.value)}
          placeholder={t('addresses.form.detailPlaceholder')}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('addresses.form.zip')}>
          <input
            className="input"
            value={v.zip ?? ''}
            onChange={(e) => update('zip', e.target.value)}
            placeholder={t('addresses.form.zipPlaceholder')}
          />
        </Field>
        <Field label={t('addresses.form.tagLabel')}>
          <div className="flex flex-wrap items-center gap-1.5">
            {TAG_PRESET_KEYS.map((preset) => {
              const label = t(`addresses.tags.${preset.key}`);
              // 兼容老数据存的中文 tag,同时匹配翻译后的值
              const active = v.tag === label || v.tag === preset.zh;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => update('tag', active ? '' : label)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs',
                    active
                      ? 'border-leaf-500 bg-leaf-500 text-white'
                      : 'border-leaf-200 text-leaf-700 hover:bg-leaf-50'
                  )}
                >
                  {label}
                </button>
              );
            })}
            <input
              className="input flex-1 min-w-[80px] !py-1 !text-xs"
              value={v.tag ?? ''}
              onChange={(e) => update('tag', e.target.value)}
              placeholder={t('addresses.form.tagCustomPlaceholder')}
            />
          </div>
        </Field>
      </div>

      {showDefaultToggle && (
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!v.isDefault}
            onChange={(e) => update('isDefault', e.target.checked)}
            className="h-4 w-4 accent-leaf-500"
          />
          {t('addresses.form.setDefault')}
        </label>
      )}

      {err && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-outline !text-sm">
            {t('addresses.form.cancel')}
          </button>
        )}
        <button type="submit" disabled={submitting} className="btn-primary !text-sm">
          {submitting ? t('addresses.form.submitting') : submitText ?? t('addresses.save')}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-leaf-700/80">{label}</label>
      {children}
    </div>
  );
}
