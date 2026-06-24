import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const Body = z.object({
  status: z.enum(['on_sale', 'trading', 'sold_out', 'off_shelf']),
});

function pickId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const body = Body.parse(await req.json());
  const listing = await prisma.marketListing.findUnique({
    where: { id },
    select: { id: true, sellerId: true },
  });
  if (!listing) return fail(404, '交易帖不存在');
  if (listing.sellerId !== me.id) return fail(403, '只能管理自己的交易帖');

  await prisma.$transaction(async (tx) => {
    await tx.marketListing.update({
      where: { id },
      data: { status: body.status },
    });
    if (body.status === 'off_shelf') {
      await tx.marketListingItem.updateMany({
        where: { listingId: id },
        data: { status: 'off_shelf' },
      });
    } else if (body.status === 'trading') {
      await tx.marketListingItem.updateMany({
        where: { listingId: id, status: { not: 'off_shelf' } },
        data: { status: 'trading' },
      });
    } else if (body.status === 'sold_out') {
      await tx.marketListingItem.updateMany({
        where: { listingId: id, status: { not: 'off_shelf' } },
        data: { status: 'sold_out', stock: 0 },
      });
    } else if (body.status === 'on_sale') {
      await tx.marketListingItem.updateMany({
        where: { listingId: id, status: { in: ['trading', 'sold_out'] } },
        data: { status: 'on_sale' },
      });
    }
  });

  return { id, status: body.status };
});
