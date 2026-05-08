'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import type { Permission } from '@/lib/levels';
import { hasPermission, PERMISSION_LEVEL } from '@/lib/levels';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';

/**
 * 用法:
 *   <PermissionGate perm="market:sell">{children}</PermissionGate>
 * 当无权限时,渲染一个友好提示卡;有权限时正常渲染 children。
 */
export function PermissionGate({
  perm,
  children,
  hideWhenAllowed = false,
}: {
  perm: Permission;
  children: ReactNode;
  hideWhenAllowed?: boolean;
}) {
  const { user, vip } = useAuth() as ReturnType<typeof useAuth> & {
    vip?: { isVip?: boolean };
  };
  const { t } = useI18n();

  const allowed = hasPermission(
    user ? { level: user.level, isVip: !!vip?.isVip } : null,
    perm
  );

  if (allowed) {
    return hideWhenAllowed ? null : <>{children}</>;
  }

  if (!user) {
    return (
      <div className="card p-6 text-center">
        <div className="text-3xl">🔒</div>
        <div className="mt-2 text-sm font-medium">{t('common.permission.loginToUse')}</div>
        <Link href="/login" className="btn-primary mt-4 inline-flex">
          {t('common.permission.goLogin')}
        </Link>
      </div>
    );
  }

  const levelInfo = PERMISSION_LEVEL(perm);
  const hint = levelInfo
    ? t('levels.hint.needLevel', {
        level: levelInfo.level,
        name: t(`levels.name.${levelInfo.level}`),
      })
    : t('levels.hint.notEnough');

  return (
    <div className="card p-6 text-center">
      <div className="text-3xl">🌱</div>
      <div className="mt-2 text-sm font-medium text-ink-800">
        {t('common.permission.noPermissionPrefix')}{t(`levels.permission.${perm}`)}
      </div>
      <div className="mt-1 text-xs text-leaf-700/70">{hint}</div>
      <div className="mt-4 flex justify-center gap-2">
        <Link href="/tasks" className="btn-outline !text-xs">
          {t('common.permission.doTasksToLevel')}
        </Link>
        <Link href="/vip" className="btn-primary !text-xs">
          {t('common.permission.openVip')}
        </Link>
      </div>
    </div>
  );
}
