'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n/I18nContext';
import type { Address } from '@/lib/types';
import styles from './AddressForm.module.scss';
import { cx } from '@/lib/style-utils';



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

const TAG_PRESET_KEYS: Array<{key: string;zh: string;}> = [
{ key: 'home', zh: '家' },
{ key: 'office', zh: '公司' },
{ key: 'school', zh: '学校' },
{ key: 'parents', zh: '父母' },
{ key: 'friend', zh: '朋友' }];


export function AddressForm({
  initial,
  onSubmit,
  onCancel,
  submitting = false,
  showDefaultToggle = true,
  submitText








}: {initial?: Partial<Address>;onSubmit: (v: AddressFormValue) => Promise<void> | void;onCancel?: () => void;submitting?: boolean;showDefaultToggle?: boolean; /** 不传则默认为 addresses.save 翻译 */submitText?: string;}) {
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

  const update = <K extends keyof AddressFormValue,>(k: K, val: AddressFormValue[K]) =>
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
    <form onSubmit={submit} className={styles.r_6ed543e2}>
      <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3)}>
        <Field label={t('addresses.form.name')}>
          <input
            className="input"
            value={v.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={t('addresses.form.namePlaceholder')} />

        </Field>
        <Field label={t('addresses.form.phone')}>
          <input
            className="input"
            inputMode="tel"
            value={v.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder={t('addresses.form.phonePlaceholder')} />

        </Field>
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_1004c0c3)}>
        <Field label={t('addresses.form.province')}>
          <input
            className="input"
            value={v.province ?? ''}
            onChange={(e) => update('province', e.target.value)}
            placeholder={t('addresses.form.provincePlaceholder')} />

        </Field>
        <Field label={t('addresses.form.city')}>
          <input
            className="input"
            value={v.city ?? ''}
            onChange={(e) => update('city', e.target.value)}
            placeholder={t('addresses.form.cityPlaceholder')} />

        </Field>
        <Field label={t('addresses.form.district')}>
          <input
            className="input"
            value={v.district ?? ''}
            onChange={(e) => update('district', e.target.value)}
            placeholder={t('addresses.form.districtPlaceholder')} />

        </Field>
      </div>

      <Field label={t('addresses.form.detail')}>
        <textarea
          className={styles.r_bfb7d9fc}
          value={v.detail}
          onChange={(e) => update('detail', e.target.value)}
          placeholder={t('addresses.form.detailPlaceholder')} />

      </Field>

      <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3)}>
        <Field label={t('addresses.form.zip')}>
          <input
            className="input"
            value={v.zip ?? ''}
            onChange={(e) => update('zip', e.target.value)}
            placeholder={t('addresses.form.zipPlaceholder')} />

        </Field>
        <Field label={t('addresses.form.tagLabel')}>
          <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e)}>
            {TAG_PRESET_KEYS.map((preset) => {
              const label = t(`addresses.tags.${preset.key}`);
              // 兼容老数据存的中文 tag,同时匹配翻译后的值
              const active = v.tag === label || v.tag === preset.zh;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => update('tag', active ? '' : label)}
                  className={cn(cx(styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_0b91436d, styles.r_465609a2, styles.r_359090c2),

                  active ? cx(styles.r_d3b27cd9, styles.r_45499621, styles.r_72a4c7cd) : cx(styles.r_691861bc, styles.r_5f6a59f1, styles.r_5756b7b4)


                  )}>

                  {label}
                </button>);

            })}
            <input
              className={cx(styles.r_36e579c0, styles.r_bb6c09da, styles.r_ebb407e8, styles.r_dd702538)}
              value={v.tag ?? ''}
              onChange={(e) => update('tag', e.target.value)}
              placeholder={t('addresses.form.tagCustomPlaceholder')} />

          </div>
        </Field>
      </div>

      {showDefaultToggle &&
      <label className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_fc7473ca)}>
          <input
          type="checkbox"
          checked={!!v.isDefault}
          onChange={(e) => update('isDefault', e.target.checked)}
          className={cx(styles.r_11e59c6d, styles.r_dc7972eb, styles.r_5f66c7c0)} />

          {t('addresses.form.setDefault')}
        </label>
      }

      {err &&
      <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>{err}</div>
      }

      <div className={cx(styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e, styles.r_6b7d6e21)}>
        {onCancel &&
        <button type="button" onClick={onCancel} className={styles.r_4f43b5cb}>
            {t('addresses.form.cancel')}
          </button>
        }
        <button type="submit" disabled={submitting} className={styles.r_4f43b5cb}>
          {submitting ? t('addresses.form.submitting') : submitText ?? t('addresses.save')}
        </button>
      </div>
    </form>);

}

function Field({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div>
      <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_21d33c50)}>{label}</label>
      {children}
    </div>);

}