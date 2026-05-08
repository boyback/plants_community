'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Empty } from '@/components/ui/Empty';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { AddressForm, type AddressFormValue } from '@/components/address/AddressForm';
import type { Address } from '@/lib/types';

export default function AddressBookPage() {
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

  // 匹配 tag icon。支持中文 / 繁中 / 多语种的「家/公司/学校」
  const tagIcon = (tag?: string | null): string => {
    if (!tag) return '📍';
    if (tag === t('addresses.tags.home') || tag === '家') return '🏠';
    if (tag === t('addresses.tags.office') || tag === '公司') return '🏢';
    if (tag === t('addresses.tags.school') || tag === '学校' || tag === '學校') return '🏫';
    return '📍';
  };

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">📦</div>
          <div className="mt-3 text-lg font-semibold">{t('addresses.loginRequired')}</div>
          <Link href="/login?redirect=/addresses" className="btn-primary mt-4 inline-flex">
            {t('nav.login')}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('addresses.title')}</h1>
          <p className="text-sm text-leaf-700/70">{t('addresses.subtitle')}</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          {loading ? (
            <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>
          ) : list.length === 0 ? (
            <Empty icon="📭" title={t('addresses.empty')} desc={t('addresses.emptyDesc')} />
          ) : (
            <ul className="space-y-3">
              {list.map((a) => (
                <li
                  key={a.id}
                  className={cn(
                    'card p-4',
                    a.isDefault && 'border-leaf-300 ring-1 ring-leaf-200'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf-50 text-lg">
                      {tagIcon(a.tag)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-semibold text-ink-800">{a.name}</span>
                        <span className="text-xs text-leaf-700/70">{a.phone}</span>
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
                      <div className="mt-1 text-xs text-ink-700/80">
                        {[a.province, a.city, a.district, a.detail]
                          .filter(Boolean)
                          .join(' ')}
                        {a.zip && <span className="ml-1 text-leaf-700/60">({a.zip})</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    {!a.isDefault && (
                      <button
                        type="button"
                        onClick={() => onSetDefault(a.id)}
                        className="btn-outline !px-3 !py-1 !text-xs"
                      >
                        {t('addresses.setDefault')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(a);
                        setCreating(false);
                      }}
                      className="btn-outline !px-3 !py-1 !text-xs"
                    >
                      <Icon name="edit" size={12} />
                      {t('addresses.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(a.id)}
                      className="btn-outline !px-3 !py-1 !text-xs hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Icon name="trash" size={12} />
                      {t('addresses.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          {(creating || editing) && (
            <div className="card p-5">
              <div className="mb-3 text-sm font-semibold">
                {editing ? t('addresses.editTitle') : t('addresses.addNew')}
              </div>
              <AddressForm
                initial={editing ?? undefined}
                onSubmit={editing ? onUpdate : onCreate}
                onCancel={() => {
                  setCreating(false);
                  setEditing(null);
                }}
                submitting={submitting}
                submitText={editing ? t('addresses.saveEdit') : t('addresses.save')}
              />
            </div>
          )}

          <div className="card p-4 text-[11px] text-leaf-700/70">
            <div className="mb-1 font-medium text-leaf-700">{t('addresses.tips.title')}</div>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>{t('addresses.tips.item1')}</li>
              <li>{t('addresses.tips.item2')}</li>
              <li>{t('addresses.tips.item3')}</li>
              <li>{t('addresses.tips.item4')}</li>
            </ul>
          </div>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-800 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </Shell>
  );
}
