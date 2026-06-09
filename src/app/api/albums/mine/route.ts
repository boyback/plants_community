import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const me = await requireUser();

  const albums = await prisma.album.findMany({
    where: { userId: me.id },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: {
      images: {
        orderBy: { orderIdx: 'asc' },
        take: 100,
        select: { id: true, url: true, caption: true, orderIdx: true },
      },
    },
  });

  return {
    items: albums.map((album) => ({
      id: album.id,
      title: album.title,
      description: album.description,
      cover: album.cover || album.images[0]?.url || null,
      isPublic: album.isPublic,
      imageCount: album.imageCount,
      createdAt: album.createdAt.toISOString(),
      updatedAt: album.updatedAt.toISOString(),
      images: album.images.map((image) => ({
        id: image.id,
        url: image.url,
        caption: image.caption,
        orderIdx: image.orderIdx,
      })),
    })),
  };
});
