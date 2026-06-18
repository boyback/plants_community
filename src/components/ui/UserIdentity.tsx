'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { EquipState, User } from '@/lib/types';
import { UserAvatar } from './UserAvatar';
import { UserName } from './UserName';
import styles from './UserIdentity.module.scss';

type IdentityUser = Pick<User, 'id' | 'name' | 'avatar'> & {
  level?: number;
  vip?: { isVip?: boolean; lifetime?: boolean } | null;
  equip?: EquipState;
};

type UserIdentitySize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type UserIdentityVariant = 'inline' | 'list' | 'card' | 'profile' | 'compact';

const avatarSize: Record<UserIdentitySize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 52,
  xl: 96,
};

const nameSize: Record<UserIdentitySize, 'xs' | 'sm' | 'md' | 'lg'> = {
  xs: 'xs',
  sm: 'sm',
  md: 'sm',
  lg: 'md',
  xl: 'lg',
};

export function UserIdentity({
  user,
  size = 'md',
  variant = 'inline',
  asLink = true,
  showAvatar = true,
  showName = true,
  showLevel = false,
  showVip = true,
  avatarRing = true,
  subtitle,
  className,
  nameClassName,
  avatarClassName,
  textClassName,
}: {
  user: IdentityUser;
  size?: UserIdentitySize;
  variant?: UserIdentityVariant;
  asLink?: boolean;
  showAvatar?: boolean;
  showName?: boolean;
  showLevel?: boolean;
  showVip?: boolean;
  avatarRing?: boolean;
  subtitle?: ReactNode;
  className?: string;
  nameClassName?: string;
  avatarClassName?: string;
  textClassName?: string;
}) {
  const content = (
    <>
      {showAvatar && (
        <UserAvatar
          src={user.avatar || '/default-avatar.svg'}
          alt={user.name}
          size={avatarSize[size]}
          ring={avatarRing}
          pendant={user.equip?.pendant ?? null}
          isVip={!!user.vip?.isVip}
          className={avatarClassName}
        />
      )}
      {showName && (
        <span className={cn(styles.text, textClassName)}>
          <UserName
            user={user}
            asLink={false}
            size={nameSize[size]}
            showVip={showVip}
            className={nameClassName}
          />
          {showLevel && typeof user.level === 'number' && <span className={styles.level}>Lv.{user.level}</span>}
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </span>
      )}
    </>
  );

  const rootClassName = cn(styles.identity, styles[variant], styles[size], className);
  if (!asLink) return <span className={rootClassName}>{content}</span>;

  return (
    <Link href={`/user/${user.id}`} className={rootClassName}>
      {content}
    </Link>
  );
}
