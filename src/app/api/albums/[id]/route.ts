import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function extractId(url: string): string {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  // /api/albums/[id] → id is at index 2
  return parts[2] || '';
}

// GET /api/albums/[id] - 获取相册详情
export const GET = handler(async (req) => {
  const id = extractId(req.url);

  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, avatar: true, equipPendantId: true },
      },
      images: {
        orderBy: { orderIdx: 'asc' },
        select: { id: true, url: true, caption: true, orderIdx: true },
      },
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  if (!album) return fail(404, '相册不存在');

  await prisma.album.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  return {
    id: album.id,
    title: album.title,
    description: album.description,
    cover: album.cover,
    isPublic: album.isPublic,
    imageCount: album.imageCount,
    viewCount: album.viewCount + 1,
    likeCount: album._count.likes,
    commentCount: album._count.comments,
    createdAt: album.createdAt.toISOString(),
    updatedAt: album.updatedAt.toISOString(),
    user: album.user,
    images: album.images,
  };
});

// PATCH /api/albums/[id] - 更新相册
export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const id = extractId(req.url);
  const body = await req.json();

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return fail(404, '相册不存在');
  if (album.userId !== me.id) return fail(403, '只能编辑自己的相册');

  const updated = await prisma.album.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      ...(body.cover !== undefined && { cover: body.cover }),
    },
  });

  return updated;
});

// DELETE /api/albums/[id] - 删除相册
export const DELETE = handler(async (req) => {
  const me = await requireUser();
  const id = extractId(req.url);

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return fail(404, '相册不存在');
  if (album.userId !== me.id) return fail(403, '只能删除自己的相册');

  await prisma.album.delete({ where: { id } });

  return { ok: true };
});
