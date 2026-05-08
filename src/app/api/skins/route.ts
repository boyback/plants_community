import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { serializeSkin } from '@/lib/serializers';
import type { SkinKind } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') as SkinKind | null;
  const me = await getCurrentUser();

  const list = await prisma.skinItem.findMany({
    where: {
      enabled: true,
      ...(kind ? { kind } : {}),
    },
    orderBy: [{ orderIdx: 'asc' }, { pricePoints: 'asc' }],
  });

  // 已拥有的皮肤集合
  const owned = me
    ? new Set(
        (
          await prisma.userSkin.findMany({
            where: { userId: me.id },
            select: { skinId: true },
          })
        ).map((x) => x.skinId)
      )
    : new Set<string>();

  return list.map((s) => ({
    ...serializeSkin(s),
    owned: owned.has(s.id),
  }));
});
