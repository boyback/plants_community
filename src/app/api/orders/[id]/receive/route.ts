import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return fail(404, '订单不存在');
  if (order.buyerId !== me.id) return fail(403, '只有买家能确认收货');
  if (order.status !== 'pending_receipt') return fail(400, '当前状态不允许确认收货');

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status: 'pending_review', receivedAt: new Date() },
    });

    if (order.source === 'product' && order.listingItemId) {
      const item = await tx.marketListingItem.findUnique({
        where: { id: order.listingItemId },
        select: { id: true, listingId: true, stock: true },
      });
      if (item && item.stock <= 0) {
        await tx.marketListingItem.update({
          where: { id: item.id },
          data: { status: 'sold_out' },
        });

        const activeCount = await tx.marketListingItem.count({
          where: {
            listingId: item.listingId,
            status: { in: ['on_sale', 'trading'] },
          },
        });
        if (activeCount === 0) {
          await tx.marketListing.update({
            where: { id: item.listingId },
            data: { status: 'sold_out' },
          });
        }
      }
    }
  });
  return { ok: true };
});
