import { z } from 'zod';
import { Prisma } from '@prisma/client';

export const AlbumSyncInput = z
  .object({
    mode: z.enum(['none', 'new', 'existing']).default('none'),
    albumId: z.string().optional(),
    title: z.string().trim().max(50).optional(),
    description: z.string().trim().max(500).optional(),
    syncCoverAsAlbumCover: z.boolean().default(false),
  })
  .optional();

export type AlbumSyncInputValue = z.infer<typeof AlbumSyncInput>;

type AlbumSyncParams = {
  tx: Prisma.TransactionClient;
  sync: AlbumSyncInputValue;
  userId: string;
  postId: string;
  postTitle: string;
  cover?: string | null;
  images: string[];
};

export function collectAlbumSyncImages({
  cover,
  images,
  journal,
}: {
  cover?: string | null;
  images?: string[] | null;
  journal?: { entries?: Array<{ images?: string[] | null }> } | null;
}) {
  return uniqueUrls([
    ...(cover ? [cover] : []),
    ...(images ?? []),
    ...((journal?.entries ?? []).flatMap((entry) => entry.images ?? [])),
  ]);
}

export async function syncPostImagesToAlbum({
  tx,
  sync,
  userId,
  postId,
  postTitle,
  cover,
  images,
}: AlbumSyncParams) {
  if (!sync || sync.mode === 'none') return null;

  const urls = uniqueUrls(images);
  if (urls.length === 0) return null;
  const preferredCover = sync.syncCoverAsAlbumCover && cover ? cover : urls[0];

  if (sync.mode === 'new') {
    return tx.album.create({
      data: {
        userId,
        sourcePostId: postId,
        title: sync.title?.trim() || `${postTitle.slice(0, 42) || '帖子'} 配图`,
        description: sync.description?.trim() || null,
        isPublic: true,
        cover: preferredCover,
        imageCount: urls.length,
        images: {
          create: urls.map((url, orderIdx) => ({ url, orderIdx })),
        },
      },
      select: { id: true },
    });
  }

  if (sync.mode === 'existing') {
    if (!sync.albumId) {
      throw new Error('请选择要追加的相册');
    }

    const album = await tx.album.findFirst({
      where: { id: sync.albumId, userId },
      select: { id: true, cover: true },
    });
    if (!album) {
      throw new Error('只能同步到自己的相册');
    }

    const existing = await tx.albumImage.findMany({
      where: { albumId: album.id, url: { in: urls } },
      select: { url: true },
    });
    const existingUrls = new Set(existing.map((item) => item.url));
    const nextUrls = urls.filter((url) => !existingUrls.has(url));

    let added = 0;
    if (nextUrls.length > 0) {
      const maxOrder = await tx.albumImage.aggregate({
        where: { albumId: album.id },
        _max: { orderIdx: true },
      });
      const startIdx = (maxOrder._max.orderIdx ?? -1) + 1;
      const created = await tx.albumImage.createMany({
        data: nextUrls.map((url, index) => ({
          albumId: album.id,
          url,
          orderIdx: startIdx + index,
        })),
      });
      added = created.count;
    }

    await tx.album.update({
      where: { id: album.id },
      data: {
        ...(added > 0 && { imageCount: { increment: added } }),
        cover: sync.syncCoverAsAlbumCover && cover ? cover : album.cover || urls[0],
      },
    });

    return { id: album.id };
  }

  return null;
}

function uniqueUrls(urls: string[]) {
  const seen = new Set<string>();
  return urls
    .map((url) => url.trim())
    .filter((url) => {
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
}
