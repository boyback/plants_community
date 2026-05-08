import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const a = await prisma.auction.findUnique({ where: { id } });
  if (!a) return fail(404, '拍卖不存在');
  if (a.sellerId !== me.id) return fail(403, '只能取消自己发布的拍卖');
  if (a.bidCount > 0) return fail(400, '已有出价,无法取消');
  if (a.status !== 'scheduled' && a.status !== 'live') return fail(400, '当前状态不允许取消');

  await prisma.$transaction(async (tx) => {
    await tx.auction.update({
      where: { id },
      data: { status: 'cancelled', result: 'cancelled', actualEndAt: new Date() },
    });
    // 把已经付了保证金的(应该没有,但保险)全部退还
    const ps = await tx.auctionParticipant.findMany({
      where: { auctionId: id, depositStatus: 'held' },
    });
    for (const p of ps) {
      await tx.auctionParticipant.update({
        where: { id: p.id },
        data: { depositStatus: 'refunded' },
      });
      const pts = Math.max(1, Math.floor(p.depositAmount / 100) * 100);
      const u = await tx.user.update({
        where: { id: p.userId },
        data: { pointsBalance: { increment: pts } },
        select: { pointsBalance: true },
      });
      await tx.pointsLedger.create({
        data: {
          userId: p.userId,
          type: 'admin',
          delta: pts,
          balance: u.pointsBalance,
          refType: 'auction_deposit_refund',
          refId: p.id,
          remark: '拍卖取消,保证金退还',
        },
      });
    }
  });

  return { ok: true };
});
