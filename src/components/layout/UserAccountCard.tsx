'use client';

import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { VipBadge } from '@/components/ui/VipBadge';
import { cn } from '@/lib/utils';

/**
 * 用户账号卡片 — 显示等级/经验/积分/帖子/粉丝
 * 用于发帖页、发商品页的右侧边栏
 */
export function UserAccountCard() {
  const { user, vip, pointsBalance, expProgress } = useAuth();
  const { t } = useI18n();

  if (!user) return null;

  return (
    <div className="rounded-none border border-leaf-100 bg-gradient-to-br from-leaf-50 to-white p-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-leaf-700/80">
        {t('nav.sidebar.currentAccount')}
        {vip.isVip && <VipBadge size="xs" lifetime={vip.lifetime} />}
      </div>
      <div
        className={cn(
          'text-sm font-medium',
          vip.isVip
            ? 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 bg-clip-text text-transparent'
            : ''
        )}
      >
        {user.name}
      </div>
      {expProgress && (
        <>
          <div className="mt-2 flex items-baseline justify-between text-[10px] text-leaf-700/70">
            <span>Lv.{user.level}</span>
            {expProgress.isMax ? (
              <span>{t('nav.sidebar.maxLevel')}</span>
            ) : (
              <span>{t('nav.sidebar.expToNext', { level: user.level + 1, need: expProgress.pointsToNext })}</span>
            )}
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-leaf-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-leaf-400 to-leaf-600"
              style={{ width: `${expProgress.percent}%` }}
            />
          </div>
        </>
      )}
      <div className="mt-3 grid grid-cols-3 text-center text-[11px]">
        <div>
          <div className="font-semibold text-ink-800">{user.posts}</div>
          <div className="text-leaf-700/70">{t('nav.sidebar.statPosts')}</div>
        </div>
        <div>
          <div className="font-semibold text-ink-800">💎{pointsBalance}</div>
          <div className="text-leaf-700/70">{t('nav.sidebar.statPoints')}</div>
        </div>
        <div>
          <div className="font-semibold text-ink-800">{user.followers}</div>
          <div className="text-leaf-700/70">{t('nav.sidebar.statFollowers')}</div>
        </div>
      </div>
    </div>
  );
}
