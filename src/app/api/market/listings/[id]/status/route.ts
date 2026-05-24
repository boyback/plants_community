import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const Body = z.object({
  status: z.enum(['on_sale', 'off_shelf']),
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
    }
  });

  return { id, status: body.status };
});
