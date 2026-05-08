'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { VipBadge } from './VipBadge';
import type { User } from '@/lib/types';

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
  showVip = true,
}: {
  user: Pick<User, 'id' | 'name'> & {
    vip?: { isVip?: boolean; lifetime?: boolean } | null;
    equip?: { pendant?: { meta?: Record<string, unknown> | null } | null } | null;
  };
  asLink?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showVip?: boolean;
}) {
  const isVip = !!user.vip?.isVip;
  const lifetime = !!user.vip?.lifetime;

  const sizeCls = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }[size];

  // 名字渐变色:VIP = 金色渐变;否则正常
  const nameStyle = isVip
    ? {
        backgroundImage:
          'linear-gradient(90deg,#d97706,#f59e0b,#fbbf24,#f59e0b,#d97706)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        color: 'transparent',
      }
    : undefined;

  const inner = (
    <>
      <span
        className={cn('font-medium', !isVip && 'text-ink-800')}
        style={nameStyle}
      >
        {user.name}
      </span>
      {showVip && isVip && (
        <VipBadge size={size === 'xs' ? 'xs' : 'sm'} lifetime={lifetime} />
      )}
    </>
  );

  if (asLink) {
    return (
      <Link
        href={`/user/${user.id}`}
        className={cn('inline-flex items-center gap-1.5 hover:underline underline-offset-2', sizeCls, className)}
      >
        {inner}
      </Link>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5', sizeCls, className)}>
      {inner}
    </span>
  );
}
