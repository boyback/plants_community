import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const id = new URL(req.url).pathname.split('/').filter(Boolean).at(-2);
  if (!id) return fail(400, '参数错误');

  const listing = await prisma.marketListing.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      cover: true,
      minPrice: true,
      maxPrice: true,
      status: true,
      sellerId: true,
    },
  });

  if (!listing) return fail(404, '交易信息不存在');

  return {
    id: listing.id,
    title: listing.title,
    cover: listing.cover,
    minPrice: listing.minPrice,
    maxPrice: listing.maxPrice,
    status: listing.status,
    sellerId: listing.sellerId,
    href: `/market/${listing.id}`,
  };
});
