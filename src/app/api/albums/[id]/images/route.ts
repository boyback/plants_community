import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function extractId(url: string): string {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[2] || '';
}

const ImageInput = z.object({
  url: z.string().url(),
  caption: z.string().trim().max(200).optional(),
});

// POST /api/albums/[id]/images - 添加图片到相册
export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = extractId(req.url);
  const body = z.object({ images: z.array(ImageInput).min(1).max(100) }).parse(await req.json());

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return fail(404, '相册不存在');
  if (album.userId !== me.id) return fail(403, '只能编辑自己的相册');

  const uniqueImages = uniqueByUrl(body.images);
  const existing = await prisma.albumImage.findMany({
    where: { albumId: id, url: { in: uniqueImages.map((image) => image.url) } },
    select: { url: true },
  });
  const existingUrls = new Set(existing.map((image) => image.url));
  const images = uniqueImages.filter((image) => !existingUrls.has(image.url));
  if (images.length === 0) return { added: 0 };

  const maxOrder = await prisma.albumImage.aggregate({
    where: { albumId: id },
    _max: { orderIdx: true },
  });
  const startIdx = (maxOrder._max.orderIdx ?? -1) + 1;

  const created = await prisma.albumImage.createMany({
    data: images.map((img, i) => ({
      albumId: id,
      url: img.url,
      caption: img.caption,
      orderIdx: startIdx + i,
    })),
  });

  await prisma.album.update({
    where: { id },
    data: {
      imageCount: { increment: created.count },
      cover: album.cover || images[0].url,
    },
  });

  return { added: created.count };
});

// DELETE /api/albums/[id]/images - 删除相册图片
export const DELETE = handler(async (req) => {
  const me = await requireUser();
  const id = extractId(req.url);
  const body = await req.json();

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return fail(404, '相册不存在');
  if (album.userId !== me.id) return fail(403, '只能编辑自己的相册');

  const imageIds = body.imageIds as string[];
  if (!imageIds || imageIds.length === 0) return fail(400, '请选择要删除的图片');

  const deleted = await prisma.albumImage.deleteMany({
    where: {
      id: { in: imageIds },
      albumId: id,
    },
  });

  await prisma.album.update({
    where: { id },
    data: { imageCount: { decrement: deleted.count } },
  });

  return { deleted: deleted.count };
});

function uniqueByUrl(images: Array<{ url: string; caption?: string }>) {
  const seen = new Set<string>();
  return images.filter((image) => {
    if (seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
}
