'use client';

/**
 * 在 server component 里也想翻译短文本时用的小组件。
 *
 * 用法:
 *   <I18nText k="nav.home" />
 *   <I18nText k="orders.actions.pay" fallback="支付" />
 *
 * 注意:会触发一次 client hydration,SSR 时先渲染 fallback / key。
 */
import { useI18n } from '@/i18n/I18nContext';

export function I18nText({
  k,
  fallback,
  vars,
}: {
  k: string;
  fallback?: string;
  vars?: Record<string, string | number>;
}) {
  const { t } = useI18n();
  const value = t(k, vars);
  if (value === k && fallback) return <>{fallback}</>;
  return <>{value}</>;
}
