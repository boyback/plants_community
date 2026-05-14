import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function extractId(url: string): string {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  return parts[2] || '';
}

// GET /api/albums/[id]/like - 检查是否已点赞
export const GET = handler(async (req) => {
  const me = await requireUser();
  const id = extractId(req.url);

  const like = await prisma.albumLike.findUnique({
    where: { albumId_userId: { albumId: id, userId: me.id } },
  });

  return { liked: !!like };
});

// POST /api/albums/[id]/like - 切换点赞
export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = extractId(req.url);

  const album = await prisma.album.findUnique({ where: { id } });
  if (!album) return fail(404, '相册不存在');

  try {
    await prisma.albumLike.create({
      data: { albumId: id, userId: me.id },
    });
    await prisma.album.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
    });
    return { liked: true };
  } catch {
    await prisma.albumLike.delete({
      where: { albumId_userId: { albumId: id, userId: me.id } },
    });
    await prisma.album.update({
      where: { id },
      data: { likeCount: { decrement: 1 } },
    });
    return { liked: false };
  }
});
