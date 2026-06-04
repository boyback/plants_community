import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { isVipActive } from '@/lib/vip';
import { serializeUser, serializeEquip } from '@/lib/serializers';
import {
  expProgressConfigured,
  getLevelPermissionConfigs,
  getPermissionsForUserLevel,
  permissionRoleKey,
} from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const me = await getCurrentUser();
  if (!me) return null;

  const full = await prisma.user.findUnique({
    where: { id: me.id },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });
  if (!full) return null;

  const [rolePermissionOverrides, levelPermissions, levelPermissionConfigs] = await Promise.all([
    (prisma as any).rolePermissionOverride.findMany({
      where: { roleKey: permissionRoleKey(full) },
      select: { permission: true, effect: true },
    }),
    getPermissionsForUserLevel(full.level),
    getLevelPermissionConfigs(),
  ]);
  const permissionOverrides = [
    ...levelPermissions.map((permission) => ({ permission, effect: 'grant' as const })),
    ...rolePermissionOverrides,
  ];

  // 装扮
  const ids = [
    full.equipBubbleId,
    full.equipReactionId,
    full.equipStickerId,
    full.equipPendantId,
  ].filter(Boolean) as string[];
  const skins = ids.length
    ? await prisma.skinItem.findMany({ where: { id: { in: ids } } })
    : [];
  const map = new Map(skins.map((s) => [s.id, s]));

  const equip = serializeEquip({
    bubble: full.equipBubbleId ? map.get(full.equipBubbleId) ?? null : null,
    reaction: full.equipReactionId ? map.get(full.equipReactionId) ?? null : null,
    sticker: full.equipStickerId ? map.get(full.equipStickerId) ?? null : null,
    pendant: full.equipPendantId ? map.get(full.equipPendantId) ?? null : null,
  });

  // 今日已签到人数(全站)— 用于在签到卡展示「今天已经有 N 个肉友签到」
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySignedCount = await prisma.user.count({
    where: { lastSignInAt: { gte: todayStart } },
  });

  return {
    user: {
      ...serializeUser({ ...full, permissionOverrides }),
      permissionLevels: Object.fromEntries(
        levelPermissionConfigs.map((item) => [item.permission, item.level])
      ),
    },
    signInStreak: full.signInStreak,
    signedInToday: isToday(full.lastSignInAt),
    todaySignedCount,
    exp: full.exp,
    expProgress: await expProgressConfigured(full.exp),
    pointsBalance: full.pointsBalance,
    privacy: {
      showFollowing: full.privacyShowFollowing,
      showFollowers: full.privacyShowFollowers,
    },
    vip: {
      isVip: isVipActive(full),
      lifetime: full.vipLifetime,
      expireAt: full.vipExpireAt?.toISOString() ?? null,
    },
    equip,
  };
});

function isToday(d: Date | null): boolean {
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
