'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from "@/lib/client-api";
import { cn, formatPrice } from '@/lib/utils';
import { VipBadge } from '@/components/ui/VipBadge';
import { toast } from '@/components/ui/Toast';
import type { VipPlanInfo } from '@/lib/types';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



const PERKS: {icon: string;titleKey: string;descKey: string;}[] = [
{ icon: '🚀', titleKey: 'vip.benefits.noPostLimit', descKey: 'vip.benefits.noPostLimit' },
{ icon: '💼', titleKey: 'vip.benefits.noSellLimit', descKey: 'vip.benefits.noSellLimit' },
{ icon: '👑', titleKey: 'vip.benefits.highlightName', descKey: 'vip.benefits.highlightName' },
{ icon: '🎨', titleKey: 'vip.benefits.highlightName', descKey: 'vip.benefits.highlightName' },
{ icon: '⚜️', titleKey: 'vip.benefits.exclusiveSkin', descKey: 'vip.benefits.exclusiveSkin' },
{ icon: '💬', titleKey: 'vip.benefits.exclusiveSkin', descKey: 'vip.benefits.exclusiveSkin' },
{ icon: '🔥', titleKey: 'vip.benefits.doubleExp', descKey: 'vip.benefits.doubleExp' },
{ icon: '🎁', titleKey: 'vip.benefits.priorityReply', descKey: 'vip.benefits.priorityReply' }];


export default function VipPage() {
  const router = useRouter();
  const { user, vip, pointsBalance, loading: authLoading, refresh } = useAuth();
  const { t } = useI18n();
  const [plans, setPlans] = useState<VipPlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    api.
    get<VipPlanInfo[]>('/api/vip/plans').
    then(setPlans).
    catch(() => null).
    finally(() => setLoading(false));
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
      const r = await api.post<{orderId: string;}>('/api/vip/order', { plan: plan.key });
      router.push(`/checkout/vip/${r.orderId}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('error.generic'));
      setSubmitting(null);
    }
  };

  return (
    <Shell>
      {/* 头部 */}
      <div className={styles.r_2cd02d11}>
        <div className={cx(styles.r_39b2e003, styles.r_96b881c8, styles.r_f61dcff4, styles.r_db539fdb, styles.r_845f5336, styles.r_67e74965)}>
          <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_1004c0c3)}>
            <span className={styles.r_a95699d9}>👑</span>
            <h1 className={cx(styles.r_751fb0d1, styles.r_69450ef1)}>{t('vip.title')}</h1>
            {vip.isVip && <VipBadge size="md" lifetime={vip.lifetime} />}
          </div>
          <p className={cx(styles.r_50d0d216, styles.r_9ef2b581, styles.r_fc7473ca, styles.r_7ed65ab7)}>
            {t('vip.subtitle')}
          </p>
          {vip.isVip &&
          <div className={cx(styles.r_eccd13ef, styles.r_52083e7d, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_ac204c10, styles.r_c6b7c8a6, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_2689f395)}>
              {vip.lifetime ?
            <span>♾️ {t('vip.lifetime')}</span> :
            vip.expireAt ?
            <span>{t('vip.expireAt', { time: new Date(vip.expireAt).toLocaleDateString() })}</span> :
            null}
            </div>
          }
        </div>
      </div>

      {/* 权益 */}
      <div className={cx(styles.r_1256b2f6, styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_d59f314f)}>
        {PERKS.map((p, i) =>
        <div key={i} className={styles.r_8e63407b}>
            <div className={styles.r_3febee09}>{p.icon}</div>
            <div className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{t(p.titleKey)}</div>
          </div>
        )}
      </div>

      {/* 套餐 */}
      <h2 className={cx(styles.r_1bb88326, styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>{t('vip.buy')}</h2>
      {loading ?
      <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</div> :

      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_1004c0c3, styles.r_e00ad816, styles.r_19d9b25e, styles.r_a4ecef1e)}>
          {plans.map((p) => {
          const isPoints = p.key === 'monthly_points';
          const isLifetime = p.key === 'lifetime';
          const balanceShort = isPoints && pointsBalance < p.pointsCost;
          return (
            <div
              key={p.key}
              className={cn(cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_8dddea07, styles.r_c07e54fd),

              p.recommended && cx(styles.r_65935df5, styles.r_18679832, styles.r_16b1efa5, styles.r_e6e348a5),
              isLifetime && cx(styles.r_65935df5, styles.r_fa398807, styles.r_16b1efa5, styles.r_7cd23189)
              )}>

                {p.recommended &&
              <span className={cx(styles.r_da4dbfbc, styles.r_c100b64c, styles.r_8782d84c, styles.r_ac204c10, styles.r_a5a0d879, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_69450ef1, styles.r_67e74965)}>
                    {t('vip.recommended')}
                  </span>
              }
                {isLifetime &&
              <span className={cx(styles.r_da4dbfbc, styles.r_c100b64c, styles.r_8782d84c, styles.r_ac204c10, styles.r_aea07fd2, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_69450ef1, styles.r_72a4c7cd)}>
                    {t('vip.plans.lifetime')}
                  </span>
              }
                <div className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>{t(`vip.plans.${p.key}`) || p.title}</div>
                <div className={cx(styles.r_b6b02c0e, styles.r_d058ca6d, styles.r_69335b95)}>{t(`vip.planSubtitle.${p.key}`) || p.subtitle}</div>
                <div className={styles.r_0ab86672}>
                  {isPoints ?
                <div className={cx(styles.r_60fbb771, styles.r_b7012bb2, styles.r_44ee8ba0)}>
                      <span className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_595fceba)}>{p.pointsCost}</span>
                      <span className={cx(styles.r_359090c2, styles.r_69335b95)}>💎 {t('common.points')}</span>
                    </div> :

                <div className={cx(styles.r_60fbb771, styles.r_b7012bb2, styles.r_44ee8ba0)}>
                      <span className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_595fceba)}>
                        {formatPrice(p.amount)}
                      </span>
                      {!isLifetime &&
                  <span className={cx(styles.r_359090c2, styles.r_69335b95)}>
                          / {t('vip.durationDays', { days: p.durationDays })}
                        </span>
                  }
                    </div>
                }
                </div>
                <button
                type="button"
                disabled={submitting === p.key || balanceShort}
                onClick={() => buy(p)}
                className={cn(cx(styles.r_9953408a, styles.r_86843cf1),

                isPoints ?
                balanceShort ? cx(styles.r_f2b23104, styles.r_b17d6a13, styles.r_29b733e4) : cx(styles.r_931bc423, styles.r_72a4c7cd, styles.r_7ee371ab) :


                'btn-primary'
                )}>

                  {submitting === p.key ?
                t('common.loading') :
                isPoints ?
                balanceShort ?
                t('vip.notEnoughPoints', { current: pointsBalance, need: p.pointsCost }) :
                t('vip.exchange') :
                t('vip.buy')}
                </button>
                {isPoints &&
              <div className={cx(styles.r_50d0d216, styles.r_1dc571a3, styles.r_6c4cc49e, styles.r_ca6bf630)}>
                    💎 {pointsBalance}
                  </div>
              }
              </div>);

        })}
        </div>
      }

      <div className={cx(styles.r_4e5d2af5, styles.r_a217b4ea, styles.r_a8a62ca4, styles.r_8e63407b, styles.r_d058ca6d, styles.r_69335b95)}>
        <div className={cx(styles.r_65281709, styles.r_2689f395, styles.r_5f6a59f1)}>📜 会员服务说明</div>
        <ul className={cx(styles.r_f242aff2, styles.r_1f33b438, styles.r_e2eedc57)}>
          <li>大会员是订阅制,到期后等级权限自动回落,不会清空账号</li>
          <li>钻石兑换月卡仅能 30 天为单位,重复兑换可累加时长</li>
          <li>终身大会员与订阅时长不冲突,购买后永久保留</li>
          <li>本演示站不收取真实金额,所有支付走 Mock 网关</li>
        </ul>
      </div>

      {!user &&
      <div className={cx(styles.r_31f25533, styles.r_ca6bf630)}>
          <Link href="/login?redirect=/vip" className="btn-primary">
            {t('nav.login')}
          </Link>
        </div>
      }
    </Shell>);

}
