import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const me = await requireUser();
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);
  const cursor = url.searchParams.get('cursor') ?? undefined;

  const items = await prisma.pointsLedger.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  let nextCursor: string | null = null;
  if (items.length > limit) nextCursor = items.pop()!.id;

  return {
    items: items.map((i) => ({
      id: i.id,
      type: i.type,
      delta: i.delta,
      balance: i.balance,
      refType: i.refType,
      refId: i.refId,
      remark: i.remark,
      createdAt: i.createdAt.toISOString(),
    })),
    nextCursor,
  };
});
