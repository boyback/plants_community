'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { hasPermission, type Permission } from '@/lib/levels';
import { cn, formatPrice } from '@/lib/utils';
import {
  AddressPicker,
  type AddressPickerValue,
  pickerValueToOrderBody,
  validateAddressPicker,
} from '@/components/address/AddressPicker';
import type { Product } from '@/lib/types';

export function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const { user, vip } = useAuth();
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [addr, setAddr] = useState<AddressPickerValue>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isMine = user && product.seller && user.id === product.seller.id;
  const canBuy = hasPermission(
    user
      ? {
          level: user.level,
          isVip: vip.isVip,
          grantedPermissions: user.grantedPermissions as Permission[] | undefined,
          revokedPermissions: user.revokedPermissions as Permission[] | undefined,
        }
      : null,
    'market:buy'
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
      const r = await api.post<{ orderId: string }>(
        `/api/market/products/${product.id}/buy`,
        {
          quantity: qty,
          ...pickerValueToOrderBody(addr),
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
      <div className="card p-4">
        <div className="text-xs text-leaf-700/70">{t('market.buy.price')}</div>
        <div className="text-2xl font-bold text-rose-600">{formatPrice(product.price)}</div>

        {isSoldOut ? (
          <button disabled className="btn mt-4 w-full justify-center bg-leaf-100 text-leaf-600">
            {t('market.buy.soldOutBtn')}
          </button>
        ) : isMine ? (
          <button disabled className="btn mt-4 w-full justify-center bg-leaf-100 text-leaf-600">
            {t('market.buy.ownProduct')}
          </button>
        ) : !user ? (
          <Link
            href={`/login?redirect=${encodeURIComponent(`/market/${product.id}`)}`}
            className="btn-primary mt-4 w-full justify-center"
          >
            <Icon name="user" size={14} />
            {t('market.buy.loginToBuy')}
          </Link>
        ) : !canBuy ? (
          <div className="mt-4 space-y-2">
            <button disabled className="btn w-full justify-center bg-leaf-100 text-leaf-600">
              {t('market.buy.cannotBuy')}
            </button>
            <div className="text-[11px] text-leaf-700/70 text-center">
              {t('market.buy.needLv5OrVip')}
            </div>
            <Link href="/vip" className="btn-outline mt-1 w-full justify-center !text-xs">
              {t('market.buy.openVip')}
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-primary mt-4 w-full justify-center"
          >
            <Icon name="check" size={14} />
            {t('market.buy.buyNow')}
          </button>
        )}
        <div className="mt-3 text-[10px] text-leaf-700/60 text-center">
          {t('market.buy.rewardHint', { n: product.pointsBack })}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex-1">
                <h3 className="text-base font-semibold">{t('market.buy.confirmOrder')}</h3>
                <p className="text-xs text-leaf-700/70 line-clamp-1">{product.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-leaf-600 hover:text-leaf-800"
                aria-label={t('market.buy.close')}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-leaf-700/80">{t('market.buy.quantity')}</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty((n) => Math.max(1, n - 1))}
                    className="btn-outline !px-3 !py-1"
                    disabled={qty <= 1}
                  >
                    −
                  </button>
                  <input
                    className="input w-16 text-center"
                    type="number"
                    value={qty}
                    onChange={(e) =>
                      setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setQty((n) => Math.min(product.stock, n + 1))}
                    className="btn-outline !px-3 !py-1"
                    disabled={qty >= product.stock}
                  >
                    +
                  </button>
                  <span className="ml-2 text-xs text-leaf-700/70">{t('market.buy.stockLabel', { n: product.stock })}</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-leaf-700/80">{t('market.buy.shipAddress')}</label>
                <AddressPicker value={addr} onChange={setAddr} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-leaf-100 pt-3">
              <div className="text-xs text-leaf-700/70">
                {t('market.buy.totalLabel')}
                <span className="text-base font-bold text-rose-600">
                  {formatPrice(total)}
                </span>
                <span className="ml-1.5">{t('market.buy.pointsBackTotal', { n: product.pointsBack * qty })}</span>
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className={cn('btn-primary !px-4', submitting && 'opacity-60')}
              >
                {submitting ? t('market.buy.submitting') : t('market.buy.submit')}
              </button>
            </div>

            {err && (
              <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {err}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
