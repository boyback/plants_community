'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from "@/lib/client-api";
import { hasPermission, type Permission } from '@/lib/levels';
import { cn, formatPrice } from '@/lib/utils';
import {
  AddressPicker,
  type AddressPickerValue,
  pickerValueToOrderBody,
  validateAddressPicker } from
'@/components/address/AddressPicker';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import type { Product } from '@/lib/types';
import styles from './ProductDetailClient.module.scss';
import { cx } from '@/lib/style-utils';



export function ProductDetailClient({ product }: {product: Product;}) {
  const router = useRouter();
  const { user, vip } = useAuth();
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [addr, setAddr] = useState<AddressPickerValue>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useBodyScrollLock(open);

  const isMine = user && product.seller && user.id === product.seller.id;
  const canBuy = hasPermission(
    user ?
    {
      level: user.level,
      isVip: vip.isVip,
      grantedPermissions: user.grantedPermissions as Permission[] | undefined,
      revokedPermissions: user.revokedPermissions as Permission[] | undefined
    } :
    null,
    "market:buy"
  );
  const total = product.price * qty;
  const isSoldOut = product.status !== 'on_sale' || product.stock <= 0;

  const submit = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/market/${product.id}`));
      return;
    }
    setErr(null);
    const validErr = validateAddressPicker(addr, t);
    if (validErr) return setErr(validErr);

    setSubmitting(true);
    try {
      const r = await api.post<{orderId: string;}>(
        `/api/market/products/${product.id}/buy`,
        {
          quantity: qty,
          ...pickerValueToOrderBody(addr)
        }
      );
      router.push(`/checkout/${r.orderId}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('market.buy.submitFail'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.r_8e63407b}>
        <div className={cx(styles.r_359090c2, styles.r_69335b95)}>{t('market.buy.price')}</div>
        <div className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_595fceba)}>{formatPrice(product.price)}</div>

        {isSoldOut ?
        <button disabled className={cx(styles.r_0ab86672, styles.r_6da6a3c3, styles.r_86843cf1, styles.r_f2b23104, styles.r_b17d6a13)}>
            {t('market.buy.soldOutBtn')}
          </button> :
        isMine ?
        <button disabled className={cx(styles.r_0ab86672, styles.r_6da6a3c3, styles.r_86843cf1, styles.r_f2b23104, styles.r_b17d6a13)}>
            {t('market.buy.ownProduct')}
          </button> :
        !user ?
        <Link
          href={`/login?redirect=${encodeURIComponent(`/market/${product.id}`)}`}
          className={cx(styles.r_0ab86672, styles.r_6da6a3c3, styles.r_86843cf1)}>

            <Icon name="user" size={14} />
            {t('market.buy.loginToBuy')}
          </Link> :
        !canBuy ?
        <div className={cx(styles.r_0ab86672, styles.r_6f7e013d)}>
            <button disabled className={cx(styles.r_6da6a3c3, styles.r_86843cf1, styles.r_f2b23104, styles.r_b17d6a13)}>
              {t('market.buy.cannotBuy')}
            </button>
            <div className={cx(styles.r_d058ca6d, styles.r_69335b95, styles.r_ca6bf630)}>
              {t('market.buy.needLv5OrVip')}
            </div>
            <Link href="/vip" className={cx(styles.r_b6b02c0e, styles.r_6da6a3c3, styles.r_86843cf1, styles.r_dd702538)}>
              {t('market.buy.openVip')}
            </Link>
          </div> :

        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cx(styles.r_0ab86672, styles.r_6da6a3c3, styles.r_86843cf1)}>

            <Icon name="check" size={14} />
            {t('market.buy.buyNow')}
          </button>
        }
        <div className={cx(styles.r_eccd13ef, styles.r_1dc571a3, styles.r_6c4cc49e, styles.r_ca6bf630)}>
          {t('market.buy.rewardHint', { n: product.pointsBack })}
        </div>
      </div>

      {open &&
      <div
        className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_f3c543ad, styles.r_67d66567, styles.r_094a9df0, styles.r_8e63407b)}
        onClick={() => !submitting && setOpen(false)}>

          <div
          className={cx(styles.r_6da6a3c3, styles.r_6199866f, styles.r_0478c89a, styles.r_b4168890, styles.r_92bf82f4)}
          onClick={(e) => e.stopPropagation()}>

            <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_60541e1e, styles.r_1004c0c3)}>
              <div className={styles.r_36e579c0}>
                <h3 className={cx(styles.r_4ee73492, styles.r_e83a7042)}>{t('market.buy.confirmOrder')}</h3>
                <p className={cx(styles.r_359090c2, styles.r_69335b95, styles.r_f50e2015)}>{product.title}</p>
              </div>
              <button
              type="button"
              onClick={() => setOpen(false)}
              className={cx(styles.r_b17d6a13, styles.r_81be6435)}
              aria-label={t('market.buy.close')}>

                <Icon name="close" size={18} />
              </button>
            </div>

            <div className={styles.r_3e7ce58d}>
              <div>
                <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_21d33c50)}>{t('market.buy.quantity')}</label>
                <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                  <button
                  type="button"
                  onClick={() => setQty((n) => Math.max(1, n - 1))}
                  className={cx(styles.r_23b4e5ed, styles.r_ebb407e8)}
                  disabled={qty <= 1}>

                    −
                  </button>
                  <input
                  className={cx(styles.r_baceed34, styles.r_ca6bf630)}
                  type="number"
                  value={qty}
                  onChange={(e) =>
                  setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))
                  } />

                  <button
                  type="button"
                  onClick={() => setQty((n) => Math.min(product.stock, n + 1))}
                  className={cx(styles.r_23b4e5ed, styles.r_ebb407e8)}
                  disabled={qty >= product.stock}>

                    +
                  </button>
                  <span className={cx(styles.r_c68af998, styles.r_359090c2, styles.r_69335b95)}>{t('market.buy.stockLabel', { n: product.stock })}</span>
                </div>
              </div>

              <div>
                <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_21d33c50)}>{t('market.buy.shipAddress')}</label>
                <AddressPicker value={addr} onChange={setAddr} />
              </div>
            </div>

            <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e, styles.r_b950dda2, styles.r_88b684d2, styles.r_ce335a8e)}>
              <div className={cx(styles.r_359090c2, styles.r_69335b95)}>
                {t('market.buy.totalLabel')}
                <span className={cx(styles.r_4ee73492, styles.r_69450ef1, styles.r_595fceba)}>
                  {formatPrice(total)}
                </span>
                <span className={styles.r_61b99e43}>{t('market.buy.pointsBackTotal', { n: product.pointsBack * qty })}</span>
              </div>
              <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className={cn(styles.r_af7490b1, submitting && styles.r_f2868c22)}>

                {submitting ? t('market.buy.submitting') : t('market.buy.submit')}
              </button>
            </div>

            {err &&
          <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>
                {err}
              </div>
          }
          </div>
        </div>
      }
    </>);

}
