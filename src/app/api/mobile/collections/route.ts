import { prisma } from '@/lib/db';
import { handler, parseJsonArray } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializePost } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const me = await requireUser();

  const [postCollects, itemCollects] = await Promise.all([
    prisma.postCollect.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        post: {
          include: postInclude(),
        },
      },
    }),
    prisma.marketListingItemCollect.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        item: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                shipFrom: true,
                status: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    posts: postCollects.map((item) => ({
      collectedAt: item.createdAt.toISOString(),
      post: serializePost(item.post as any, undefined, undefined, me),
    })),
    marketItems: itemCollects.map((item) => ({
      collectedAt: item.createdAt.toISOString(),
      item: {
        id: item.item.id,
        listingId: item.item.listingId,
        title: item.item.title,
        price: item.item.price,
        stock: item.item.stock,
        soldCount: item.item.soldCount,
        cover: item.item.cover,
        images: parseJsonArray(item.item.images),
        description: item.item.description,
        status: item.item.status,
        listing: item.item.listing,
      },
    })),
  };
});
