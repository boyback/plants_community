import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { getCurrentUser, isVipActive } from '@/lib/auth';
import { serializeUser, serializeEquip } from '@/lib/serializers';
import { expProgress } from '@/lib/levels';

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

  return {
    user: serializeUser(full),
    signInStreak: full.signInStreak,
    signedInToday: isToday(full.lastSignInAt),
    exp: full.exp,
    expProgress: expProgress(full.exp),
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
