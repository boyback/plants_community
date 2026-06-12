'use client';

import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { VipBadge } from '@/components/ui/VipBadge';
import { cn } from '@/lib/utils';
import styles from './UserAccountCard.module.scss';
import { cx } from '@/lib/style-utils';



/**
 * 用户账号卡片 — 显示等级/经验/积分/帖子/粉丝
 * 用于发帖页、发商品页的右侧边栏
 */
export function UserAccountCard() {
  const { user, vip, pointsBalance, expProgress } = useAuth();
  const { t } = useI18n();

  if (!user) return null;

  return (
    <div className={cx(styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_39b2e003, styles.r_49a47a82, styles.r_0d13093a, styles.r_8e63407b)}>
      <div className={cx(styles.r_65281709, styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e, styles.r_359090c2, styles.r_21d33c50)}>
        {t('nav.sidebar.currentAccount')}
        {vip.isVip && <VipBadge size="xs" lifetime={vip.lifetime} />}
      </div>
      <div
        className={cn(cx(styles.r_fc7473ca, styles.r_2689f395),

        vip.isVip ? cx(styles.r_6ae7db2c, styles.r_f30e3b2b, styles.r_9969af0d, styles.r_0f9aede0, styles.r_6c3c24f0, styles.r_f8c8e86d) :

        ''
        )}>

        {user.name}
      </div>
      {expProgress &&
      <>
          <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_b7012bb2, styles.r_8ef2268e, styles.r_1dc571a3, styles.r_69335b95)}>
            <span>Lv.{user.level}</span>
            {expProgress.isMax ?
          <span>{t('nav.sidebar.maxLevel')}</span> :

          <span>{t('nav.sidebar.expToNext', { level: user.level + 1, need: expProgress.pointsToNext })}</span>
          }
          </div>
          <div className={cx(styles.r_b6b02c0e, styles.r_3a1268a4, styles.r_2cd02d11, styles.r_ac204c10, styles.r_f2b23104)}>
            <div
            className={cx(styles.r_668b21aa, styles.r_ac204c10, styles.r_6ae7db2c, styles.r_78ce000e, styles.r_0a6f1c29)}
            style={{ width: `${expProgress.percent}%` }} />

          </div>
        </>
      }
      <div className={cx(styles.r_eccd13ef, styles.r_f3c543ad, styles.r_be2e831b, styles.r_ca6bf630, styles.r_d058ca6d)}>
        <div>
          <div className={cx(styles.r_e83a7042, styles.r_399e11a5)}>{user.posts}</div>
          <div className={styles.r_69335b95}>{t('nav.sidebar.statPosts')}</div>
        </div>
        <div>
          <div className={cx(styles.r_e83a7042, styles.r_399e11a5)}>💎{pointsBalance}</div>
          <div className={styles.r_69335b95}>{t('nav.sidebar.statPoints')}</div>
        </div>
        <div>
          <div className={cx(styles.r_e83a7042, styles.r_399e11a5)}>{user.followers}</div>
          <div className={styles.r_69335b95}>{t('nav.sidebar.statFollowers')}</div>
        </div>
      </div>
    </div>);

}