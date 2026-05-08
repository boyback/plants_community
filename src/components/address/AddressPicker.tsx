'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/client-api';
import { useI18n } from '@/i18n/I18nContext';
import { AddressForm, type AddressFormValue } from './AddressForm';
import type { Address } from '@/lib/types';

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
  | { mode: 'saved'; addressId: string }
  | { mode: 'new'; form: AddressFormValue; asDefault?: boolean }
  | { mode: 'once'; form: AddressFormValue }
  | null;

const TABS = [
  { key: 'saved', labelKey: 'addresses.picker.tabSaved' },
  { key: 'new', labelKey: 'addresses.picker.tabNew' },
  { key: 'once', labelKey: 'addresses.picker.tabOnce' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export function AddressPicker({
  value,
  onChange,
}: {
  value: AddressPickerValue;
  onChange: (v: AddressPickerValue) => void;
}) {
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
    api
      .get<Address[]>('/api/addresses')
      .then((r) => {
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
      })
      .catch(() => null)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // tab 切换时同步 value
  const switchTab = (next: Tab) => {
    setTab(next);
    if (next === 'saved') {
      if (savedSelected) onChange({ mode: 'saved', addressId: savedSelected });
      else onChange(null);
    } else if (next === 'new') {
      onChange(newForm ? { mode: 'new', form: newForm, asDefault: newAsDefault } : null);
    } else {
      onChange(onceForm ? { mode: 'once', form: onceForm } : null);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-1 rounded-full bg-leaf-50 p-1 text-xs">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => switchTab(tabItem.key)}
            className={cn(
              'flex-1 rounded-full px-3 py-1.5 transition-colors',
              tab === tabItem.key
                ? 'bg-white shadow-sm text-leaf-700 font-medium'
                : 'text-ink-700/60 hover:text-leaf-700'
            )}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'saved' && (
        <div>
          {loading ? (
            <div className="py-6 text-center text-xs text-leaf-700/60">{t('addresses.picker.loading')}</div>
          ) : list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-leaf-200 bg-leaf-50/30 p-4 text-center text-xs text-leaf-700/70">
              {t('addresses.picker.noSaved')}
              <button
                type="button"
                className="ml-1 text-leaf-700 underline"
                onClick={() => switchTab('new')}
              >
                {t('addresses.picker.createNow')}
              </button>
            </div>
          ) : (
            <ul className="max-h-[280px] space-y-2 overflow-y-auto">
              {list.map((a) => {
                const selected = savedSelected === a.id;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSavedSelected(a.id);
                        onChange({ mode: 'saved', addressId: a.id });
                      }}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                        selected
                          ? 'border-leaf-500 bg-leaf-50/60'
                          : 'border-leaf-100 hover:border-leaf-300'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2',
                          selected ? 'border-leaf-500 bg-leaf-500 text-white' : 'border-leaf-200'
                        )}
                      >
                        {selected && <span className="text-[8px]">●</span>}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-medium">{a.name}</span>
                          <span className="text-xs text-leaf-700/70">{a.phone}</span>
                          {a.isDefault && (
                            <span className="rounded-full bg-leaf-500 px-1.5 py-px text-[9px] font-medium text-white">
                              {t('addresses.picker.defaultLabel')}
                            </span>
                          )}
                          {a.tag && (
                            <span className="rounded-full bg-leaf-50 px-1.5 py-px text-[9px] text-leaf-700">
                              {a.tag}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-leaf-700/80">
                          {[a.province, a.city, a.district, a.detail]
                            .filter(Boolean)
                            .join(' ')}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === 'new' && (
        <div>
          <p className="mb-3 text-[11px] text-leaf-700/70">
            {t('addresses.picker.newHint')}
          </p>
          <InlineForm
            initial={newForm ?? undefined}
            onChange={(v) => {
              setNewForm(v);
              onChange({ mode: 'new', form: v, asDefault: newAsDefault });
            }}
          />
          <label className="mt-3 inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={newAsDefault}
              onChange={(e) => {
                const v = e.target.checked;
                setNewAsDefault(v);
                if (newForm) onChange({ mode: 'new', form: newForm, asDefault: v });
              }}
              className="h-4 w-4 accent-leaf-500"
            />
            {t('addresses.picker.alsoSetDefault')}
          </label>
        </div>
      )}

      {tab === 'once' && (
        <div>
          <p className="mb-3 text-[11px] text-leaf-700/70">
            {t('addresses.picker.onceHint')}
          </p>
          <InlineForm
            initial={onceForm ?? undefined}
            onChange={(v) => {
              setOnceForm(v);
              onChange({ mode: 'once', form: v });
            }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * 行内地址表单(无提交按钮,变化时回调)
 */
function InlineForm({
  initial,
  onChange,
}: {
  initial?: AddressFormValue;
  onChange: (v: AddressFormValue) => void;
}) {
  const { t } = useI18n();
  const [v, setV] = useState<AddressFormValue>({
    name: initial?.name ?? '',
    phone: initial?.phone ?? '',
    province: initial?.province ?? '',
    city: initial?.city ?? '',
    district: initial?.district ?? '',
    detail: initial?.detail ?? '',
  });

  const update = <K extends keyof AddressFormValue>(k: K, val: AddressFormValue[K]) => {
    const next = { ...v, [k]: val };
    setV(next);
    onChange(next);
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input"
          placeholder={t('addresses.picker.inlineName')}
          value={v.name}
          onChange={(e) => update('name', e.target.value)}
        />
        <input
          className="input"
          inputMode="tel"
          placeholder={t('addresses.picker.inlinePhone')}
          value={v.phone}
          onChange={(e) => update('phone', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          className="input"
          placeholder={t('addresses.picker.inlineProvince')}
          value={v.province ?? ''}
          onChange={(e) => update('province', e.target.value)}
        />
        <input
          className="input"
          placeholder={t('addresses.picker.inlineCity')}
          value={v.city ?? ''}
          onChange={(e) => update('city', e.target.value)}
        />
        <input
          className="input"
          placeholder={t('addresses.picker.inlineDistrict')}
          value={v.district ?? ''}
          onChange={(e) => update('district', e.target.value)}
        />
      </div>
      <textarea
        className="input min-h-[60px]"
        placeholder={t('addresses.picker.inlineDetail')}
        value={v.detail}
        onChange={(e) => update('detail', e.target.value)}
      />
    </div>
  );
}

/** 把 AddressPickerValue 转成下单 API 的 body 字段 */
export function pickerValueToOrderBody(v: AddressPickerValue): Record<string, unknown> {
  if (!v) return {};
  if (v.mode === 'saved') return { addressId: v.addressId };
  if (v.mode === 'new') {
    return {
      ...formToOrderFields(v.form),
      saveAddress: true,
      saveAsDefault: v.asDefault ?? false,
    };
  }
  return formToOrderFields(v.form);
}

function formToOrderFields(form: AddressFormValue) {
  const detail = [form.province, form.city, form.district, form.detail]
    .filter(Boolean)
    .join(' ');
  return {
    shipName: form.name,
    shipPhone: form.phone,
    shipAddress: detail || form.detail,
  };
}

/**
 * 校验:必须存在有效内容。
 * 可选传入 translator,用于本地化错误消息;不传则返回中文兜底。
 */
export function validateAddressPicker(
  v: AddressPickerValue,
  translator?: (key: string) => string
): string | null {
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
  'addresses.picker.errDetail': '请填写详细地址',
};

// 导出 AddressForm 供 AddressPicker 内部用
export { AddressForm };
