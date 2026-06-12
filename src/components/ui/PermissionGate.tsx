'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import type { Permission } from '@/lib/levels';
import { hasPermission, PERMISSION_LEVEL } from '@/lib/levels';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import styles from './PermissionGate.module.scss';
import { cx } from '@/lib/style-utils';



/**
 * 用法:
 *   <PermissionGate perm="market:sell">{children}</PermissionGate>
 * 当无权限时,渲染一个友好提示卡;有权限时正常渲染 children。
 */
export function PermissionGate({
  perm,
  children,
  hideWhenAllowed = false




}: {perm: Permission;children: ReactNode;hideWhenAllowed?: boolean;}) {
  const { user, vip } = useAuth() as ReturnType<typeof useAuth> & {
    vip?: {isVip?: boolean;};
  };
  const { t } = useI18n();

  const allowed = hasPermission(
    user ?
    {
      level: user.level,
      isVip: !!vip?.isVip,
      grantedPermissions: user.grantedPermissions as Permission[] | undefined,
      revokedPermissions: user.revokedPermissions as Permission[] | undefined
    } :
    null,
    perm
  );

  if (allowed) {
    return hideWhenAllowed ? null : <>{children}</>;
  }

  if (!user) {
    return (
      <div className={cx(styles.r_0478c89a, styles.r_ca6bf630)}>
        <div className={styles.r_751fb0d1}>🔒</div>
        <div className={cx(styles.r_50d0d216, styles.r_fc7473ca, styles.r_2689f395)}>{t('permission.loginToUse')}</div>
        <Link href="/login" className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
          {t('permission.goLogin')}
        </Link>
      </div>);

  }

  const levelInfo = PERMISSION_LEVEL(perm);
  const configuredLevel = user.permissionLevels?.[perm];
  const hint = typeof configuredLevel === 'number' ?
  t('levels.hint.needLevel', {
    level: configuredLevel,
    name: t(`levels.name.${configuredLevel}`)
  }) :
  configuredLevel === null ?
  t('levels.hint.notEnough') :
  levelInfo ?
  t('levels.hint.needLevel', {
    level: levelInfo.level,
    name: t(`levels.name.${levelInfo.level}`)
  }) :
  t('levels.hint.notEnough');

  return (
    <div className={cx(styles.r_0478c89a, styles.r_ca6bf630)}>
      <div className={styles.r_751fb0d1}>🌱</div>
      <div className={cx(styles.r_50d0d216, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>
        {t('permission.noPermissionPrefix')}{t(`levels.permission.${perm}`)}
      </div>
      <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_69335b95)}>{hint}</div>
      <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_86843cf1, styles.r_77a2a20e)}>
        <Link href="/tasks" className={styles.r_dd702538}>
          {t('permission.doTasksToLevel')}
        </Link>
        <Link href="/vip" className={styles.r_dd702538}>
          {t('permission.openVip')}
        </Link>
      </div>
    </div>);

}