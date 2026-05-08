import { handler } from '@/lib/api';
import { getCurrentUser, isVipActive } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const me = await getCurrentUser();
  if (!me) return { isVip: false, lifetime: false, expireAt: null, daysLeft: null };

  const lifetime = me.vipLifetime;
  const isVip = isVipActive(me);
  const daysLeft =
    !lifetime && me.vipExpireAt
      ? Math.max(0, Math.ceil((me.vipExpireAt.getTime() - Date.now()) / 86400_000))
      : null;
  return {
    isVip,
    lifetime,
    expireAt: me.vipExpireAt?.toISOString() ?? null,
    daysLeft,
    firstAt: me.vipFirstAt?.toISOString() ?? null,
  };
});
