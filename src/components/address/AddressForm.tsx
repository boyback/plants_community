'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Textarea } from '@/components/ui/Textarea';
import { useI18n } from '@/i18n/I18nContext';
import type { Address } from '@/lib/types';
import styles from './AddressForm.module.scss';

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
  { key: 'friend', zh: '朋友' }
];

export function AddressForm({
  initial,
  onSubmit,
  onCancel,
  submitting = false,
  showDefaultToggle = true,
  submitText
}: {
  initial?: Partial<Address>;
  onSubmit: (v: AddressFormValue) => Promise<void> | void;
  onCancel?: () => void;
  submitting?: boolean;
  showDefaultToggle?: boolean;
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
    isDefault: initial?.isDefault ?? false
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
      tag: v.tag?.trim() || undefined
    });
  };

  return (
    <form onSubmit={submit} className={styles.form}>
      <div className={styles.twoCols}>
        <Field label={t('addresses.form.name')}>
          <Input
            value={v.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={t('addresses.form.namePlaceholder')}
          />
        </Field>
        <Field label={t('addresses.form.phone')}>
          <Input
            inputMode="tel"
            value={v.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder={t('addresses.form.phonePlaceholder')}
          />
        </Field>
      </div>

      <div className={styles.threeCols}>
        <Field label={t('addresses.form.province')}>
          <Input
            value={v.province ?? ''}
            onChange={(e) => update('province', e.target.value)}
            placeholder={t('addresses.form.provincePlaceholder')}
          />
        </Field>
        <Field label={t('addresses.form.city')}>
          <Input
            value={v.city ?? ''}
            onChange={(e) => update('city', e.target.value)}
            placeholder={t('addresses.form.cityPlaceholder')}
          />
        </Field>
        <Field label={t('addresses.form.district')}>
          <Input
            value={v.district ?? ''}
            onChange={(e) => update('district', e.target.value)}
            placeholder={t('addresses.form.districtPlaceholder')}
          />
        </Field>
      </div>

      <Field label={t('addresses.form.detail')}>
        <Textarea
          className={styles.detail}
          value={v.detail}
          onChange={(e) => update('detail', e.target.value)}
          placeholder={t('addresses.form.detailPlaceholder')}
        />
      </Field>

      <div className={styles.twoCols}>
        <Field label={t('addresses.form.zip')}>
          <Input
            value={v.zip ?? ''}
            onChange={(e) => update('zip', e.target.value)}
            placeholder={t('addresses.form.zipPlaceholder')}
          />
        </Field>
        <Field label={t('addresses.form.tagLabel')}>
          <div className={styles.tagRow}>
            {TAG_PRESET_KEYS.map((preset) => {
              const label = t(`addresses.tags.${preset.key}`);
              const active = v.tag === label || v.tag === preset.zh;
              return (
                <Button
                  key={preset.key}
                  type="button"
                  variant={active ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => update('tag', active ? '' : label)}
                >
                  {label}
                </Button>
              );
            })}
            <Input
              className={styles.tagInput}
              value={v.tag ?? ''}
              onChange={(e) => update('tag', e.target.value)}
              placeholder={t('addresses.form.tagCustomPlaceholder')}
            />
          </div>
        </Field>
      </div>

      {showDefaultToggle && (
        <label className={styles.defaultRow}>
          <Switch checked={!!v.isDefault} onChange={(e) => update('isDefault', e.target.checked)} />
          {t('addresses.form.setDefault')}
        </label>
      )}

      {err && <div className={styles.error}>{err}</div>}

      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('addresses.form.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? t('addresses.form.submitting') : submitText ?? t('addresses.save')}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  );
}
