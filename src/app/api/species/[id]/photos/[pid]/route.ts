/**
 * 单张品种现场照:
 *   DELETE  /api/species/:id/photos/:pid    上传者本人 或 管理员可删
 */
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickIds(req: Request) {
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  return { speciesId: segs[segs.length - 3]!, pid: segs[segs.length - 1]! };
}

export const DELETE = handler(async (req) => {
  const me = await requireUser();
  const { speciesId, pid } = pickIds(req);

  const photo = await prisma.speciesPhoto.findUnique({
    where: { id: pid },
    select: { id: true, speciesId: true, uploaderId: true },
  });
  if (!photo) return fail(404, '照片不存在');
  if (photo.speciesId !== speciesId) return fail(400, '路径不匹配');

  const isAdmin = me.role === 'admin';
  if (photo.uploaderId !== me.id && !isAdmin) {
    return fail(403, '只能删除自己上传的照片');
  }

  await prisma.speciesPhoto.delete({ where: { id: pid } });
  return { ok: true };
});
