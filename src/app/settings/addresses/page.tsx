'use client';

import { useEffect, useState } from 'react';
import { Empty } from '@/components/ui/Empty';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { AddressForm, type AddressFormValue } from '@/components/address/AddressForm';
import type { Address } from '@/lib/types';

export default function AddressSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(null), 2200);
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get<Address[]>('/api/addresses');
      setList(r);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user) load();
    else setLoading(false);
  }, [user, authLoading]);

  const onCreate = async (v: AddressFormValue) => {
    setSubmitting(true);
    try {
      await api.post('/api/addresses', v);
      setCreating(false);
      await load();
      showToast(t('addresses.toast.added'));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t('addresses.toast.saveFail'));
    } finally {
      setSubmitting(false);
    }
  };

  const onUpdate = async (v: AddressFormValue) => {
    if (!editing) return;
    setSubmitting(true);
    try {
      await api.patch(`/api/addresses/${editing.id}`, v);
      setEditing(null);
      await load();
      showToast(t('addresses.toast.updated'));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t('addresses.toast.updateFail'));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm(t('addresses.deleteConfirm'))) return;
    try {
      await api.delete(`/api/addresses/${id}`);
      await load();
      showToast(t('addresses.toast.deleted'));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t('addresses.toast.deleteFail'));
    }
  };

  const onSetDefault = async (id: string) => {
    try {
      await api.post(`/api/addresses/${id}/default`);
      await load();
      showToast(t('addresses.toast.defaulted'));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t('addresses.toast.setFail'));
    }
  };

  const tagIcon = (tag?: string | null): string => {
    if (!tag) return '📍';
    if (tag === t('addresses.tags.home') || tag === '家') return '🏠';
    if (tag === t('addresses.tags.office') || tag === '公司') return '🏢';
    if (tag === t('addresses.tags.school') || tag === '学校' || tag === '學校') return '🏫';
    return '📍';
  };

  if (!user) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">📦</div>
        <div className="text-lg font-semibold">{t('addresses.loginRequired')}</div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Icon name="mail" size={20} />
          <h1 className="text-xl font-semibold">{t('addresses.title')}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
          className="btn-primary !text-sm"
        >
          <Icon name="plus" size={14} />
          {t('addresses.addNew')}
        </button>
      </div>

      <p className="text-sm text-leaf-600 mb-4">{t('addresses.subtitle')}</p>

      {loading ? (
        <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>
      ) : list.length === 0 && !creating && !editing ? (
        <Empty icon="📭" title={t('addresses.empty')} desc={t('addresses.emptyDesc')} />
      ) : (
        <div className="space-y-4">
          {/* 地址列表 */}
          {list.length > 0 && (
            <ul className="space-y-3">
              {list.map((a) => (
                <li
                  key={a.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-4',
                    a.isDefault ? 'border-leaf-300 bg-leaf-50/50' : 'border-leaf-100'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">{tagIcon(a.tag)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink-800">{a.name}</span>
                        <span className="text-xs text-ink-500">{a.phone}</span>
                        {a.tag && (
                          <span className="rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] text-leaf-700">
                            {a.tag}
                          </span>
                        )}
                        {a.isDefault && (
                          <span className="rounded-full bg-leaf-500 px-2 py-0.5 text-[10px] font-medium text-white">
                            {t('addresses.default')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-500 truncate">
                        {[a.province, a.city, a.district, a.detail].filter(Boolean).join(' ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {!a.isDefault && (
                      <button
                        type="button"
                        onClick={() => onSetDefault(a.id)}
                        className="text-xs text-leaf-600 hover:text-leaf-700"
                      >
                        {t('addresses.setDefault')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setEditing(a); setCreating(false); }}
                      className="text-xs text-ink-500 hover:text-ink-700"
                    >
                      <Icon name="edit" size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(a.id)}
                      className="text-xs text-rose-500 hover:text-rose-600"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* 新增/编辑表单 */}
          {(creating || editing) && (
            <div className="rounded-lg border border-leaf-100 p-4">
              <div className="mb-3 text-sm font-semibold">
                {editing ? t('addresses.editTitle') : t('addresses.addNew')}
              </div>
              <AddressForm
                initial={editing ?? undefined}
                onSubmit={editing ? onUpdate : onCreate}
                onCancel={() => { setCreating(false); setEditing(null); }}
                submitting={submitting}
                submitText={editing ? t('addresses.saveEdit') : t('addresses.save')}
              />
            </div>
          )}

          {/* 提示 */}
          <div className="p-4 text-[11px] text-leaf-700/70 bg-leaf-50 rounded-lg">
            <div className="mb-1 font-medium text-leaf-700">{t('addresses.tips.title')}</div>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>{t('addresses.tips.item1')}</li>
              <li>{t('addresses.tips.item2')}</li>
              <li>{t('addresses.tips.item3')}</li>
              <li>{t('addresses.tips.item4')}</li>
            </ul>
          </div>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-800 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
