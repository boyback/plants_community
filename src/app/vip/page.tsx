'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { cn, formatPrice } from '@/lib/utils';
import { VipBadge } from '@/components/ui/VipBadge';
import { toast } from '@/components/ui/Toast';
import type { VipPlanInfo } from '@/lib/types';

const PERKS: { icon: string; titleKey: string; descKey: string }[] = [
  { icon: '🚀', titleKey: 'vip.benefits.noPostLimit',  descKey: 'vip.benefits.noPostLimit' },
  { icon: '💼', titleKey: 'vip.benefits.noSellLimit',  descKey: 'vip.benefits.noSellLimit' },
  { icon: '👑', titleKey: 'vip.benefits.highlightName', descKey: 'vip.benefits.highlightName' },
  { icon: '🎨', titleKey: 'vip.benefits.highlightName', descKey: 'vip.benefits.highlightName' },
  { icon: '⚜️', titleKey: 'vip.benefits.exclusiveSkin', descKey: 'vip.benefits.exclusiveSkin' },
  { icon: '💬', titleKey: 'vip.benefits.exclusiveSkin', descKey: 'vip.benefits.exclusiveSkin' },
  { icon: '🔥', titleKey: 'vip.benefits.doubleExp',     descKey: 'vip.benefits.doubleExp' },
  { icon: '🎁', titleKey: 'vip.benefits.priorityReply', descKey: 'vip.benefits.priorityReply' },
];

export default function VipPage() {
  const router = useRouter();
  const { user, vip, pointsBalance, loading: authLoading, refresh } = useAuth();
  const { t } = useI18n();
  const [plans, setPlans] = useState<VipPlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<VipPlanInfo[]>('/api/vip/plans')
      .then(setPlans)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const buy = async (plan: VipPlanInfo) => {
    if (!user) {
      router.push('/login?redirect=/vip');
      return;
    }
    if (plan.key === 'monthly_points') {
      setSubmitting(plan.key);
      try {
        await api.post('/api/vip/exchange');
        toast.success(t('auth.login.success'));
        await refresh();
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : t('error.generic'));
      } finally {
        setSubmitting(null);
      }
      return;
    }
    setSubmitting(plan.key);
    try {
      const r = await api.post<{ orderId: string }>('/api/vip/order', { plan: plan.key });
      router.push(`/checkout/vip/${r.orderId}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('error.generic'));
      setSubmitting(null);
    }
  };

  return (
    <Shell>
      {/* 头部 */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-300 p-8 text-amber-900">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-4xl">👑</span>
            <h1 className="text-3xl font-bold">{t('vip.title')}</h1>
            {vip.isVip && <VipBadge size="md" lifetime={vip.lifetime} />}
          </div>
          <p className="mt-2 max-w-xl text-sm text-amber-900/80">
            {t('vip.subtitle')}
          </p>
          {vip.isVip && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/40 px-3 py-1 text-xs font-medium">
              {vip.lifetime ? (
                <span>♾️ {t('vip.lifetime')}</span>
              ) : vip.expireAt ? (
                <span>{t('vip.expireAt', { time: new Date(vip.expireAt).toLocaleDateString() })}</span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* 权益 */}
      <div className="my-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {PERKS.map((p, i) => (
          <div key={i} className="card p-4">
            <div className="text-2xl">{p.icon}</div>
            <div className="mt-1 text-sm font-semibold text-ink-800">{t(p.titleKey)}</div>
          </div>
        ))}
      </div>

      {/* 套餐 */}
      <h2 className="mb-3 text-base font-semibold text-ink-800">{t('vip.buy')}</h2>
      {loading ? (
        <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {plans.map((p) => {
            const isPoints = p.key === 'monthly_points';
            const isLifetime = p.key === 'lifetime';
            const balanceShort = isPoints && pointsBalance < p.pointsCost;
            return (
              <div
                key={p.key}
                className={cn(
                  'card relative flex flex-col p-5',
                  p.recommended && 'border-2 border-amber-400 ring-2 ring-amber-100',
                  isLifetime && 'border-2 border-violet-300 ring-2 ring-violet-100'
                )}
              >
                {p.recommended && (
                  <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    {t('vip.recommended')}
                  </span>
                )}
                {isLifetime && (
                  <span className="absolute right-3 top-3 rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {t('vip.plans.lifetime')}
                  </span>
                )}
                <div className="text-base font-semibold text-ink-800">{t(`vip.plans.${p.key}`) || p.title}</div>
                <div className="mt-1 text-[11px] text-leaf-700/70">{t(`vip.planSubtitle.${p.key}`) || p.subtitle}</div>
                <div className="mt-4">
                  {isPoints ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-rose-600">{p.pointsCost}</span>
                      <span className="text-xs text-leaf-700/70">💎 {t('common.points')}</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-rose-600">
                        {formatPrice(p.amount)}
                      </span>
                      {!isLifetime && (
                        <span className="text-xs text-leaf-700/70">
                          / {t('vip.durationDays', { days: p.durationDays })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={submitting === p.key || balanceShort}
                  onClick={() => buy(p)}
                  className={cn(
                    'btn mt-auto justify-center',
                    isPoints
                      ? balanceShort
                        ? 'bg-leaf-100 text-leaf-600 cursor-not-allowed'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'btn-primary'
                  )}
                >
                  {submitting === p.key
                    ? t('common.loading')
                    : isPoints
                    ? balanceShort
                      ? t('vip.notEnoughPoints', { current: pointsBalance, need: p.pointsCost })
                      : t('vip.exchange')
                    : t('vip.buy')}
                </button>
                {isPoints && (
                  <div className="mt-2 text-[10px] text-leaf-700/60 text-center">
                    💎 {pointsBalance}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-xl bg-leaf-50/60 p-4 text-[11px] text-leaf-700/70">
        <div className="mb-1 font-medium text-leaf-700">📜 会员服务说明</div>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>大会员是订阅制,到期后等级权限自动回落,不会清空账号</li>
          <li>积分兑换月卡仅能 30 天为单位,重复兑换可累加时长</li>
          <li>终身大会员与订阅时长不冲突,购买后永久保留</li>
          <li>本演示站不收取真实金额,所有支付走 Mock 网关</li>
        </ul>
      </div>

      {!user && (
        <div className="mt-6 text-center">
          <Link href="/login?redirect=/vip" className="btn-primary">
            {t('nav.login')}
          </Link>
        </div>
      )}
    </Shell>
  );
}
