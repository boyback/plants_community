'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
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
import type { Product } from '@/lib/types';
import styles from './ProductDetailClient.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



export function ProductDetailClient({ product }: {product: Product;}) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [addr, setAddr] = useState<AddressPickerValue>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isMine = user && product.seller && user.id === product.seller.id;
  const canBuy = hasPermission(
    user ?
    {
      level: user.level,
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
        <Button disabled variant="muted" fullWidth className={styles.r_0ab86672}>
            {t('market.buy.soldOutBtn')}
          </Button> :
        isMine ?
        <Button disabled variant="muted" fullWidth className={styles.r_0ab86672}>
            {t('market.buy.ownProduct')}
          </Button> :
        !user ?
        <ButtonLink
          href={`/login?redirect=${encodeURIComponent(`/market/${product.id}`)}`}
          fullWidth
          className={styles.r_0ab86672}>

            <Icon name="user" size={14} />
            {t('market.buy.loginToBuy')}
          </ButtonLink> :
        !canBuy ?
        <div className={cx(styles.r_0ab86672, styles.r_6f7e013d)}>
            <Button disabled variant="muted" fullWidth>
              {t('market.buy.cannotBuy')}
            </Button>
            <div className={cx(styles.r_d058ca6d, styles.r_69335b95, styles.r_ca6bf630)}>
              需要 Lv.5 才能购买
            </div>
          </div> :

        <Button
          onClick={() => setOpen(true)}
          fullWidth
          className={styles.r_0ab86672}>

            <Icon name="check" size={14} />
            {t('market.buy.buyNow')}
          </Button>
        }
        <div className={cx(styles.r_eccd13ef, styles.r_1dc571a3, styles.r_6c4cc49e, styles.r_ca6bf630)}>
          {t('market.buy.rewardHint', { n: product.pointsBack })}
        </div>
      </div>

      {open &&
      <Dialog
        open={open}
        onClose={() => {
          if (!submitting) setOpen(false);
        }}
        title={t('market.buy.confirmOrder')}
        maxWidth="lg">

            <p className={cx(styles.r_359090c2, styles.r_69335b95, styles.r_f50e2015)}>{product.title}</p>

            <div className={cx(styles.r_0ab86672, styles.r_3e7ce58d)}>
              <div>
                <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2, styles.r_21d33c50)}>{t('market.buy.quantity')}</label>
                <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                  <Button
                variant="outline"
                size="sm"
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                disabled={qty <= 1}>

                    −
                  </Button>
                  <Input
                className={cx('input', styles.r_baceed34, styles.r_ca6bf630)}
                type="number"
                value={qty}
                onChange={(e) =>
                setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))
                } />

                  <Button
                variant="outline"
                size="sm"
                onClick={() => setQty((n) => Math.min(product.stock, n + 1))}
                disabled={qty >= product.stock}>

                    +
                  </Button>
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
              <Button
            onClick={submit}
            disabled={submitting}
            className={cn(styles.r_af7490b1, submitting && styles.r_f2868c22)}>

                {submitting ? t('market.buy.submitting') : t('market.buy.submit')}
              </Button>
            </div>

            {err &&
        <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>
                {err}
              </div>
        }
        </Dialog>
      }
    </>);

}
