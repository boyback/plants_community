'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { VipBadge } from './VipBadge';
import type { EquipState, User } from '@/lib/types';
import styles from './UserName.module.scss';
import { cx } from '@/lib/style-utils';



/**
 * 显示用户名,自带:
 * - 大会员变色昵称(根据装扮的挂件主题色或默认金色)
 * - VIP 标识
 *
 * 注意:Demo 中用户的 VIP 状态信息要么由调用方明确传入(isVip),
 * 要么从 user 对象的 ext 字段读取。我们这里采用「保守」策略——
 * 任何用户对象上有 vip.isVip = true 时显示 VIP 样式。
 */
export function UserName({
  user,
  asLink = true,
  size = 'sm',
  className,
  showVip = true









}: {user: Pick<User, 'id' | 'name'> & {vip?: {isVip?: boolean;lifetime?: boolean;} | null;equip?: EquipState;};asLink?: boolean;size?: 'xs' | 'sm' | 'md' | 'lg';className?: string;showVip?: boolean;}) {
  const isVip = !!user.vip?.isVip;
  const lifetime = !!user.vip?.lifetime;
  const pendant = user.equip?.pendant;
  const pendantMeta = pendant?.meta as Record<string, unknown> | null | undefined;
  const nameBadge = typeof pendantMeta?.nameBadge === 'string' ? pendantMeta.nameBadge : pendant?.preview;
  const showNameBadge = Boolean(nameBadge && pendant?.slug !== 'pendant-default');

  const sizeCls = {
    xs: styles.r_359090c2,
    sm: styles.r_fc7473ca,
    md: styles.r_4ee73492,
    lg: styles.r_42536e69
  }[size];

  // 名字渐变色:VIP = 金色渐变;否则正常
  const nameStyle = isVip ?
  {
    backgroundImage:
    "linear-gradient(90deg,#d97706,#f59e0b,#fbbf24,#f59e0b,#d97706)",
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    color: 'transparent'
  } :
  undefined;

  const inner =
  <>
      <span
      className={cn(styles.r_2689f395, !isVip && styles.r_399e11a5)}
      style={nameStyle}>

        {user.name}
      </span>
      {showVip && isVip &&
    <VipBadge size={size === 'xs' ? 'xs' : 'sm'} lifetime={lifetime} />
    }
      {showNameBadge &&
    <span className={styles.namePendant} title={pendant?.name} aria-hidden>
        {nameBadge}
      </span>
    }
    </>;


  if (asLink) {
    return (
      <Link
        href={`/user/${user.id}`}
        className={cn(cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_58284b4e, styles.r_f673f4a7, styles.r_a28fefe3), sizeCls, className)}>

        {inner}
      </Link>);

  }
  return (
    <span className={cn(cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_58284b4e), sizeCls, className)}>
      {inner}
    </span>);

}
