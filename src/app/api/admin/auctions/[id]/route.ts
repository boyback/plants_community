/**
 * PATCH /api/admin/auctions/:id
 *   - { action: 'cancel', reason?: string }    取消拍卖(未开始 / 进行中均可)
 *   - { action: 'finish' }                      强制结束进行中的拍卖(按当前最高价)
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  action: z.enum(['cancel', 'finish']),
  reason: z.string().max(500).optional(),
});

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const body = Body.parse(await req.json());
  const a = await prisma.auction.findUnique({ where: { id } });
  if (!a) return fail(404, '拍卖不存在');

  if (body.action === 'cancel') {
    if (a.status === 'finished' || a.status === 'cancelled') {
      return fail(400, '该拍卖已结束');
    }
    await prisma.auction.update({
      where: { id },
      data: { status: 'cancelled' },
    });
    await logAdmin({
      actorId: me.id,
      action: 'auction.cancel',
      targetType: 'auction',
      targetId: id,
      reason: body.reason,
    });
  } else if (body.action === 'finish') {
    if (a.status !== 'live') return fail(400, '只有进行中的拍卖可强制结束');
    // 结束策略:有出价 → won;否则 no_bidder
    const topBid = await prisma.bid.findFirst({
      where: { auctionId: id },
      orderBy: { amount: 'desc' },
    });
    await prisma.auction.update({
      where: { id },
      data: {
        status: 'finished',
        result: topBid ? 'won' : 'no_bidder',
        currentPrice: topBid?.amount ?? a.startPrice,
        winnerId: topBid?.bidderId ?? null,
        endAt: new Date(),
      },
    });
    await logAdmin({
      actorId: me.id,
      action: 'auction.forceFinish',
      targetType: 'auction',
      targetId: id,
      meta: { winnerId: topBid?.bidderId, amount: topBid?.amount },
    });
  }

  return { ok: true };
});
