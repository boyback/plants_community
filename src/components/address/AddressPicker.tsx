'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { api, ApiError } from "@/lib/client-api";
import { useI18n } from '@/i18n/I18nContext';
import { AddressForm, type AddressFormValue } from './AddressForm';
import type { Address } from '@/lib/types';
import styles from './AddressPicker.module.scss';
import { cx } from '@/lib/style-utils';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';



/**
 * 收件地址选择器(可在下单页 / 拍卖付款页等多处复用)。
 *
 * 三种模式 tab 切换:
 *   1. 已有地址 (saved):从地址簿中选;新建地址按钮
 *   2. 新建并保存 (new):填写表单,提交时同时入地址簿
 *   3. 临时填写 (once):填写表单,仅本次订单使用,不入库
 *
 * 通过受控的 mode + value 与父组件通信:
 *   value =
 *     { mode: 'saved', addressId: string }
 *   | { mode: 'new', form: AddressFormValue, asDefault?: boolean }
 *   | { mode: 'once', form: AddressFormValue }
 *
 * 父组件下单时根据 mode 决定 API 入参。
 */

export type AddressPickerValue =
{mode: 'saved';addressId: string;} |
{mode: 'new';form: AddressFormValue;asDefault?: boolean;} |
{mode: 'once';form: AddressFormValue;} |
null;

const TABS = [
{ key: 'saved', labelKey: 'addresses.picker.tabSaved' },
{ key: 'new', labelKey: 'addresses.picker.tabNew' },
{ key: 'once', labelKey: 'addresses.picker.tabOnce' }] as
const;
type Tab = (typeof TABS)[number]['key'];

export function AddressPicker({
  value,
  onChange



}: {value: AddressPickerValue;onChange: (v: AddressPickerValue) => void;}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('saved');
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedSelected, setSavedSelected] = useState<string | null>(
    value?.mode === 'saved' ? value.addressId : null
  );
  const [newForm, setNewForm] = useState<AddressFormValue | null>(null);
  const [newAsDefault, setNewAsDefault] = useState(false);
  const [onceForm, setOnceForm] = useState<AddressFormValue | null>(null);

  // 拉地址簿
  useEffect(() => {
    setLoading(true);
    api.
    get<Address[]>('/api/addresses').
    then((r) => {
      setList(r);
      // 初始默认选中:默认地址(若有)
      if (!savedSelected && r.length > 0) {
        const def = r.find((x) => x.isDefault) ?? r[0];
        setSavedSelected(def.id);
        if (tab === 'saved') {
          onChange({ mode: 'saved', addressId: def.id });
        }
      } else if (r.length === 0) {
        setTab('new'); // 没地址自动进入新建
      }
    }).
    catch(() => null).
    finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tab 切换时同步 value
  const switchTab = (next: Tab) => {
    setTab(next);
    if (next === 'saved') {
      if (savedSelected) onChange({ mode: 'saved', addressId: savedSelected });else
      onChange(null);
    } else if (next === 'new') {
      onChange(newForm ? { mode: 'new', form: newForm, asDefault: newAsDefault } : null);
    } else {
      onChange(onceForm ? { mode: 'once', form: onceForm } : null);
    }
  };

  return (
    <div>
      <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_eb6a3cef, styles.r_359090c2)}>
        {TABS.map((tabItem) =>
        <Button
          key={tabItem.key}
          type="button"
          variant={tab === tabItem.key ? 'primary' : 'ghost'}
          size="sm"
          fullWidth
          onClick={() => switchTab(tabItem.key)}
          className={cn(styles.tabButton, cx(styles.r_36e579c0, styles.r_ac204c10, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_ceb69a6b),

          tab === tabItem.key ? cx(styles.r_5e10cdb8, styles.r_438b2237, styles.r_5f6a59f1, styles.r_2689f395) : cx(styles.r_5fa66415, styles.r_9825203a)


          )}>

            {t(tabItem.labelKey)}
          </Button>
        )}
      </div>

      {tab === 'saved' &&
      <div>
          {loading ?
        <div className={cx(styles.r_940911bf, styles.r_ca6bf630, styles.r_359090c2, styles.r_6c4cc49e)}>{t('addresses.picker.loading')}</div> :
        list.length === 0 ?
        <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_54720a96, styles.r_8e63407b, styles.r_ca6bf630, styles.r_359090c2, styles.r_69335b95)}>
              {t('addresses.picker.noSaved')}
              <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cx(styles.r_f58b0257, styles.r_5f6a59f1, styles.r_c82b67c8)}
            onClick={() => switchTab('new')}>

                {t('addresses.picker.createNow')}
              </Button>
            </div> :

        <ul className={cx(styles.r_4bb3e3c3, styles.r_6f7e013d, styles.r_92bf82f4)}>
              {list.map((a) => {
            const selected = savedSelected === a.id;
            return (
              <li key={a.id}>
                    <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    setSavedSelected(a.id);
                    onChange({ mode: 'saved', addressId: a.id });
                  }}
                  className={cn(styles.addressOption, cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_60541e1e, styles.r_1004c0c3, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_eb6e8b88, styles.r_2eba0d65, styles.r_ceb69a6b),

                  selected ? cx(styles.r_d3b27cd9, styles.r_a8a62ca4) : cx(styles.r_88b684d2, styles.r_a5c39c39)


                  )}>

                      <span
                    className={cn(cx(styles.r_b6b02c0e, styles.r_f3c543ad, styles.r_11e59c6d, styles.r_dc7972eb, styles.r_012fbd12, styles.r_67d66567, styles.r_ac204c10, styles.r_65935df5),

                    selected ? cx(styles.r_d3b27cd9, styles.r_45499621, styles.r_72a4c7cd) : styles.r_691861bc
                    )}>

                        {selected && <span className={styles.r_05ef0977}>●</span>}
                      </span>
                      <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_b7012bb2, styles.r_77a2a20e)}>
                          <span className={cx(styles.r_fc7473ca, styles.r_2689f395)}>{a.name}</span>
                          <span className={cx(styles.r_359090c2, styles.r_69335b95)}>{a.phone}</span>
                          {a.isDefault &&
                      <span className={cx(styles.r_ac204c10, styles.r_45499621, styles.r_45d82811, styles.r_c6e52cdb, styles.r_e0988086, styles.r_2689f395, styles.r_72a4c7cd)}>
                              {t('addresses.picker.defaultLabel')}
                            </span>
                      }
                          {a.tag &&
                      <span className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_45d82811, styles.r_c6e52cdb, styles.r_e0988086, styles.r_5f6a59f1)}>
                              {a.tag}
                            </span>
                      }
                        </div>
                        <div className={cx(styles.r_15e1b1f4, styles.r_054cb4e3, styles.r_d058ca6d, styles.r_21d33c50)}>
                          {[a.province, a.city, a.district, a.detail].
                      filter(Boolean).
                      join(' ')}
                        </div>
                      </div>
                    </Button>
                  </li>);

          })}
            </ul>
        }
        </div>
      }

      {tab === 'new' &&
      <div>
          <p className={cx(styles.r_1bb88326, styles.r_d058ca6d, styles.r_69335b95)}>
            {t('addresses.picker.newHint')}
          </p>
          <InlineForm
          initial={newForm ?? undefined}
          onChange={(v) => {
            setNewForm(v);
            onChange({ mode: 'new', form: v, asDefault: newAsDefault });
          }} />

          <label className={cx(styles.r_eccd13ef, styles.r_52083e7d, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2)}>
            <Switch
            checked={newAsDefault}
            onChange={(e) => {
              const v = e.target.checked;
              setNewAsDefault(v);
              if (newForm) onChange({ mode: 'new', form: newForm, asDefault: v });
            }} />

            {t('addresses.picker.alsoSetDefault')}
          </label>
        </div>
      }

      {tab === 'once' &&
      <div>
          <p className={cx(styles.r_1bb88326, styles.r_d058ca6d, styles.r_69335b95)}>
            {t('addresses.picker.onceHint')}
          </p>
          <InlineForm
          initial={onceForm ?? undefined}
          onChange={(v) => {
            setOnceForm(v);
            onChange({ mode: 'once', form: v });
          }} />

        </div>
      }
    </div>);

}

/**
 * 行内地址表单(无提交按钮,变化时回调)
 */
function InlineForm({
  initial,
  onChange



}: {initial?: AddressFormValue;onChange: (v: AddressFormValue) => void;}) {
  const { t } = useI18n();
  const [v, setV] = useState<AddressFormValue>({
    name: initial?.name ?? '',
    phone: initial?.phone ?? '',
    province: initial?.province ?? '',
    city: initial?.city ?? '',
    district: initial?.district ?? '',
    detail: initial?.detail ?? ''
  });

  const update = <K extends keyof AddressFormValue,>(k: K, val: AddressFormValue[K]) => {
    const next = { ...v, [k]: val };
    setV(next);
    onChange(next);
  };

  return (
    <div className={styles.r_14dd497e}>
      <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_77a2a20e)}>
        <Input
          className="input"
          placeholder={t('addresses.picker.inlineName')}
          value={v.name}
          onChange={(e) => update('name', e.target.value)} />

        <Input
          className="input"
          inputMode="tel"
          placeholder={t('addresses.picker.inlinePhone')}
          value={v.phone}
          onChange={(e) => update('phone', e.target.value)} />

      </div>
      <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_77a2a20e)}>
        <Input
          className="input"
          placeholder={t('addresses.picker.inlineProvince')}
          value={v.province ?? ''}
          onChange={(e) => update('province', e.target.value)} />

        <Input
          className="input"
          placeholder={t('addresses.picker.inlineCity')}
          value={v.city ?? ''}
          onChange={(e) => update('city', e.target.value)} />

        <Input
          className="input"
          placeholder={t('addresses.picker.inlineDistrict')}
          value={v.district ?? ''}
          onChange={(e) => update('district', e.target.value)} />

      </div>
      <Textarea
        className={styles.r_a4197e87}
        placeholder={t('addresses.picker.inlineDetail')}
        value={v.detail}
        onChange={(e) => update('detail', e.target.value)} />

    </div>);

}

/** 把 AddressPickerValue 转成下单 API 的 body 字段 */
export function pickerValueToOrderBody(v: AddressPickerValue): Record<string, unknown> {
  if (!v) return {};
  if (v.mode === 'saved') return { addressId: v.addressId };
  if (v.mode === 'new') {
    return {
      ...formToOrderFields(v.form),
      saveAddress: true,
      saveAsDefault: v.asDefault ?? false
    };
  }
  return formToOrderFields(v.form);
}

function formToOrderFields(form: AddressFormValue) {
  const detail = [form.province, form.city, form.district, form.detail].
  filter(Boolean).
  join(' ');
  return {
    shipName: form.name,
    shipPhone: form.phone,
    shipAddress: detail || form.detail
  };
}

/**
 * 校验:必须存在有效内容。
 * 可选传入 translator,用于本地化错误消息;不传则返回中文兜底。
 */
export function validateAddressPicker(
v: AddressPickerValue,
translator?: (key: string) => string)
: string | null {
  const tr = translator ?? ((k: string) => DEFAULT_ZH_ERRORS[k] ?? k);
  if (!v) return tr('addresses.picker.errNoSelect');
  if (v.mode === 'saved') return null;
  const f = v.form;
  if (!f.name?.trim()) return tr('addresses.picker.errName');
  if (!f.phone?.trim()) return tr('addresses.picker.errPhone');
  if (!f.detail?.trim() || f.detail.length < 2) return tr('addresses.picker.errDetail');
  return null;
}

const DEFAULT_ZH_ERRORS: Record<string, string> = {
  'addresses.picker.errNoSelect': '请选择或填写收货地址',
  'addresses.picker.errName': '请填写收件人姓名',
  'addresses.picker.errPhone': '请填写联系电话',
  'addresses.picker.errDetail': '请填写详细地址'
};

// 导出 AddressForm 供 AddressPicker 内部用
export { AddressForm };
