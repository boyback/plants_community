/**
 * 顶/取消顶 一张品种现场照
 *   POST   /api/species/:id/photos/:pid/vote
 *   DELETE /api/species/:id/photos/:pid/vote
 */
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickIds(req: Request) {
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  // /api/species/<id>/photos/<pid>/vote
  return { speciesId: segs[segs.length - 4]!, pid: segs[segs.length - 2]! };
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const { speciesId, pid } = pickIds(req);

  const photo = await prisma.speciesPhoto.findUnique({
    where: { id: pid },
    select: { id: true, speciesId: true, status: true, uploaderId: true },
  });
  if (!photo) return fail(404, '照片不存在');
  if (photo.speciesId !== speciesId) return fail(400, '路径不匹配');
  if (photo.status !== 'approved') return fail(400, '只有已通过的照片可以投票');
  if (photo.uploaderId === me.id) return fail(400, '不能给自己投票');

  // 用 unique 上去重,如果已经投过了直接返回当前数据
  const existing = await prisma.speciesPhotoVote.findUnique({
    where: { photoId_userId: { photoId: pid, userId: me.id } },
  });
  if (existing) {
    const cur = await prisma.speciesPhoto.findUnique({
      where: { id: pid },
      select: { votes: true },
    });
    return { ok: true, alreadyVoted: true, votes: cur?.votes ?? 0 };
  }

  // 事务:写 vote 行 + votes 缓存 +1
  const [, updated] = await prisma.$transaction([
    prisma.speciesPhotoVote.create({
      data: { photoId: pid, userId: me.id },
    }),
    prisma.speciesPhoto.update({
      where: { id: pid },
      data: { votes: { increment: 1 } },
      select: { votes: true },
    }),
  ]);

  return { ok: true, alreadyVoted: false, votes: updated.votes };
});

export const DELETE = handler(async (req) => {
  const me = await requireUser();
  const { speciesId, pid } = pickIds(req);

  const photo = await prisma.speciesPhoto.findUnique({
    where: { id: pid },
    select: { id: true, speciesId: true },
  });
  if (!photo) return fail(404, '照片不存在');
  if (photo.speciesId !== speciesId) return fail(400, '路径不匹配');

  const existing = await prisma.speciesPhotoVote.findUnique({
    where: { photoId_userId: { photoId: pid, userId: me.id } },
  });
  if (!existing) {
    const cur = await prisma.speciesPhoto.findUnique({
      where: { id: pid },
      select: { votes: true },
    });
    return { ok: true, removed: false, votes: cur?.votes ?? 0 };
  }

  const [, updated] = await prisma.$transaction([
    prisma.speciesPhotoVote.delete({
      where: { photoId_userId: { photoId: pid, userId: me.id } },
    }),
    prisma.speciesPhoto.update({
      where: { id: pid },
      data: { votes: { decrement: 1 } },
      select: { votes: true },
    }),
  ]);

  return { ok: true, removed: true, votes: updated.votes };
});
