'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { EquipState, User } from '@/lib/types';
import styles from './UserName.module.scss';
import { cx } from '@/lib/style-utils';



/** 显示用户名,并附带当前装扮提供的昵称挂饰。 */
export function UserName({
  user,
  asLink = true,
  size = 'sm',
  className









}: {user: Pick<User, 'id' | 'name'> & {equip?: EquipState;};asLink?: boolean;size?: 'xs' | 'sm' | 'md' | 'lg';className?: string;}) {
  const pendant = user.equip?.pendant;
  const pendantMeta = pendant?.meta as Record<string, unknown> | null | undefined;
  const nameBadge = typeof pendantMeta?.nameBadge === 'string' ? pendantMeta.nameBadge : null;
  const showNameBadge = Boolean(nameBadge);

  const sizeCls = {
    xs: styles.r_359090c2,
    sm: styles.r_fc7473ca,
    md: styles.r_4ee73492,
    lg: styles.r_42536e69
  }[size];

  const inner =
  <>
      <span
      className={cn(styles.r_2689f395, styles.r_399e11a5)}>

        {user.name}
      </span>
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
