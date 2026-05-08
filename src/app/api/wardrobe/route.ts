import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeUserSkin, serializeEquip } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const me = await requireUser();

  const owned = await prisma.userSkin.findMany({
    where: { userId: me.id },
    include: { skin: true },
    orderBy: { obtainedAt: 'desc' },
  });

  const ids = [me.equipBubbleId, me.equipReactionId, me.equipStickerId, me.equipPendantId].filter(
    Boolean
  ) as string[];
  const equipped = ids.length
    ? await prisma.skinItem.findMany({ where: { id: { in: ids } } })
    : [];
  const eqMap = new Map(equipped.map((s) => [s.id, s]));

  return {
    owned: owned.map(serializeUserSkin),
    equip: serializeEquip({
      bubble: me.equipBubbleId ? eqMap.get(me.equipBubbleId) ?? null : null,
      reaction: me.equipReactionId ? eqMap.get(me.equipReactionId) ?? null : null,
      sticker: me.equipStickerId ? eqMap.get(me.equipStickerId) ?? null : null,
      pendant: me.equipPendantId ? eqMap.get(me.equipPendantId) ?? null : null,
    }),
  };
});
