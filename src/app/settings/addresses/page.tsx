'use client';

import { useEffect, useState } from 'react';
import { Empty } from '@/components/ui/Empty';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import { AddressForm, type AddressFormValue } from '@/components/address/AddressForm';
import { toast } from '@/components/ui/Toast';
import { ConfirmPopover } from '@/components/ui/ConfirmPopover';
import type { Address } from '@/lib/types';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



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
    } finally {setLoading(false);}};useEffect(() => {if (authLoading) return;if (user) load();else setLoading(false);}, [user, authLoading]);

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

  const tagIcon = (tag?: string | null): string => {
    if (!tag) return '📍';
    if (tag === t('addresses.tags.home') || tag === '家') return '🏠';
    if (tag === t('addresses.tags.office') || tag === '公司') return '🏢';
    if (tag === t('addresses.tags.school') || tag === '学校' || tag === '學校') return '🏫';
    return '📍';
  };

  if (!user) {
    return (
      <div className={cx(styles.r_a4d0f420, styles.r_ca6bf630)}>
        <div className={cx(styles.r_a95699d9, styles.r_1bb88326)}>📦</div>
        <div className={cx(styles.r_42536e69, styles.r_e83a7042)}>{t('addresses.loginRequired')}</div>
      </div>);

  }

  return (
    <div className={styles.r_0478c89a}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_b6777c6d)}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <Icon name="mail" size={20} />
          <h1 className={cx(styles.r_d5c9b000, styles.r_e83a7042)}>{t('addresses.title')}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
          className={styles.r_4f43b5cb}>

          <Icon name="plus" size={14} />
          {t('addresses.addNew')}
        </button>
      </div>

      <p className={cx(styles.r_fc7473ca, styles.r_b17d6a13, styles.r_da019856)}>{t('addresses.subtitle')}</p>

      {loading ?
      <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</div> :
      list.length === 0 && !creating && !editing ?
      <Empty icon="📭" title={t('addresses.empty')} desc={t('addresses.emptyDesc')} /> :

      <div className={styles.r_3e7ce58d}>
          {/* 地址列表 */}
          {list.length > 0 &&
        <ul className={styles.r_6ed543e2}>
              {list.map((a) =>
          <li
            key={a.id}
            className={cn(cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_8e63407b),

            a.isDefault ? cx(styles.r_e0e39c88, styles.r_9ac94195) : styles.r_88b684d2
            )}>

                  <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_7e0b7cdf)}>
                    <span className={styles.r_d5c9b000}>{tagIcon(a.tag)}</span>
                    <div className={styles.r_7e0b7cdf}>
                      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                        <span className={cx(styles.r_2689f395, styles.r_399e11a5)}>{a.name}</span>
                        <span className={cx(styles.r_359090c2, styles.r_7b89cd85)}>{a.phone}</span>
                        {a.tag &&
                  <span className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_5f6a59f1)}>
                            {a.tag}
                          </span>
                  }
                        {a.isDefault &&
                  <span className={cx(styles.r_ac204c10, styles.r_45499621, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395, styles.r_72a4c7cd)}>
                            {t('addresses.default')}
                          </span>
                  }
                      </div>
                      <div className={cx(styles.r_359090c2, styles.r_7b89cd85, styles.r_f283ea9b)}>
                        {[a.province, a.city, a.district, a.detail].filter(Boolean).join(' ')}
                      </div>
                    </div>
                  </div>
                  <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_012fbd12, styles.r_f242aff2)}>
                    {!a.isDefault &&
              <button
                type="button"
                onClick={() => onSetDefault(a.id)}
                className={cx(styles.r_359090c2, styles.r_b17d6a13, styles.r_9825203a)}>

                        {t('addresses.setDefault')}
                      </button>
              }
                    <button
                type="button"
                onClick={() => {setEditing(a);setCreating(false);}}
                className={cx(styles.r_359090c2, styles.r_7b89cd85, styles.r_3364420b)}>

                      <Icon name="edit" size={14} />
                    </button>
                    <ConfirmPopover
                title={t('addresses.deleteConfirm')}
                message={t('addresses.tips.deleteWarning')}
                confirmText={t('addresses.delete')}
                danger
                onConfirm={() => onDelete(a.id)}>

                      <button
                  type="button"
                  className={cx(styles.r_359090c2, styles.r_fa512798, styles.r_744ff542)}>

                        <Icon name="trash" size={14} />
                      </button>
                    </ConfirmPopover>
                  </div>
                </li>
          )}
            </ul>
        }

          {/* 新增/编辑表单 */}
          {(creating || editing) &&
        <div className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_8e63407b)}>
              <div className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}>
                {editing ? t('addresses.editTitle') : t('addresses.addNew')}
              </div>
              <AddressForm
            initial={editing ?? undefined}
            onSubmit={editing ? onUpdate : onCreate}
            onCancel={() => {setCreating(false);setEditing(null);}}
            submitting={submitting}
            submitText={editing ? t('addresses.saveEdit') : t('addresses.save')} />

            </div>
        }

          {/* 提示 */}
          <div className={cx(styles.r_8e63407b, styles.r_d058ca6d, styles.r_69335b95, styles.r_7ebecbb6, styles.r_5f22e64f)}>
            <div className={cx(styles.r_65281709, styles.r_2689f395, styles.r_5f6a59f1)}>{t('addresses.tips.title')}</div>
            <ul className={cx(styles.r_f242aff2, styles.r_1f33b438, styles.r_e2eedc57)}>
              <li>{t('addresses.tips.item1')}</li>
              <li>{t('addresses.tips.item2')}</li>
              <li>{t('addresses.tips.item3')}</li>
              <li>{t('addresses.tips.item4')}</li>
            </ul>
          </div>
        </div>
      }
    </div>);

}