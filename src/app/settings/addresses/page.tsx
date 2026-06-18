'use client';

import { useEffect, useState } from 'react';
import { AddressForm, type AddressFormValue } from '@/components/address/AddressForm';
import { ConfirmPopover } from '@/components/ui/ConfirmPopover';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import type { Address } from '@/lib/types';
import { cn } from '@/lib/utils';
import styles from './page.module.scss';

export default function AddressSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      toast.success(t('addresses.toast.added'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('addresses.toast.saveFail'));
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
      toast.success(t('addresses.toast.updated'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('addresses.toast.updateFail'));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await api.delete(`/api/addresses/${id}`);
      await load();
      toast.success(t('addresses.toast.deleted'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('addresses.toast.deleteFail'));
    }
  };

  const onSetDefault = async (id: string) => {
    try {
      await api.post(`/api/addresses/${id}/default`);
      await load();
      toast.success(t('addresses.toast.defaulted'));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('addresses.toast.setFail'));
    }
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
  };

  const tagLabel = (tag?: string | null): string => {
    if (!tag) return '地址';
    return tag;
  };

  if (!user) {
    return (
      <SettingsPanel icon="mail" title={t('addresses.title')}>
        <div className={styles.emptyState}>
          <Icon name="mail" size={36} />
          <div>{t('addresses.loginRequired')}</div>
        </div>
      </SettingsPanel>
    );
  }

  return (
    <SettingsPanel
      icon="mail"
      title={t('addresses.title')}
      description={t('addresses.subtitle')}
      action={
        <Button type="button" size="sm" onClick={startCreate}>
          <Icon name="plus" size={14} />
          {t('addresses.addNew')}
        </Button>
      }
    >
      {loading ? (
        <div className={styles.loading}>{t('common.loading')}</div>
      ) : list.length === 0 && !creating && !editing ? (
        <div className={styles.emptyState}>
          <Icon name="mail" size={36} />
          <div className={styles.emptyTitle}>{t('addresses.empty')}</div>
          <div className={styles.emptyDesc}>{t('addresses.emptyDesc')}</div>
        </div>
      ) : (
        <div className={styles.stack}>
          {list.length > 0 && (
            <ul className={styles.addressList}>
              {list.map((address) => (
                <li
                  key={address.id}
                  className={cn(styles.addressCard, address.isDefault && styles.addressCardDefault)}
                >
                  <div className={styles.addressMain}>
                    <span className={styles.addressIcon}>
                      <Icon name={address.isDefault ? 'check-circle' : 'mail'} size={22} />
                    </span>
                    <div className={styles.addressContent}>
                      <div className={styles.addressMeta}>
                        <span className={styles.addressName}>{address.name}</span>
                        <span className={styles.addressPhone}>{address.phone}</span>
                        {address.tag && <span className={styles.tag}>{tagLabel(address.tag)}</span>}
                        {address.isDefault && <span className={styles.defaultTag}>{t('addresses.default')}</span>}
                      </div>
                      <div className={styles.addressText}>
                        {[address.province, address.city, address.district, address.detail].filter(Boolean).join(' ')}
                      </div>
                    </div>
                  </div>

                  <div className={styles.addressActions}>
                    {!address.isDefault && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => onSetDefault(address.id)}>
                        {t('addresses.setDefault')}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => {
                        setEditing(address);
                        setCreating(false);
                      }}
                      aria-label={t('addresses.editTitle')}
                    >
                      <Icon name="edit" size={14} />
                    </Button>
                    <ConfirmPopover
                      title={t('addresses.deleteConfirm')}
                      message={t('addresses.tips.deleteWarning')}
                      confirmText={t('addresses.delete')}
                      danger
                      onConfirm={() => onDelete(address.id)}
                    >
                      <Button type="button" variant="danger" size="sm" iconOnly aria-label={t('addresses.delete')}>
                        <Icon name="trash" size={14} />
                      </Button>
                    </ConfirmPopover>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {(creating || editing) && (
            <section className={styles.formCard}>
              <div className={styles.formTitle}>{editing ? t('addresses.editTitle') : t('addresses.addNew')}</div>
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
            </section>
          )}

          <div className={styles.tips}>
            <div className={styles.tipsTitle}>{t('addresses.tips.title')}</div>
            <ul>
              <li>{t('addresses.tips.item1')}</li>
              <li>{t('addresses.tips.item2')}</li>
              <li>{t('addresses.tips.item3')}</li>
              <li>{t('addresses.tips.item4')}</li>
            </ul>
          </div>
        </div>
      )}
    </SettingsPanel>
  );
}
