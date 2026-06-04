/** 判断用户当前是否 VIP */
export function isVipActive(user: {
  vipExpireAt: Date | null;
  vipLifetime: boolean;
}): boolean {
  if (user.vipLifetime) return true;
  if (!user.vipExpireAt) return false;
  return user.vipExpireAt.getTime() > Date.now();
}
