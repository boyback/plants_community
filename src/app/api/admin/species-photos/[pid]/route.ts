/**
 * Admin: 操作单张照片
 *   PATCH /api/admin/species-photos/:pid
 *   body: { action: 'approve' | 'reject' | 'pin' | 'unpin' | 'delete', reason?: string }
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const Body = z.object({
  action: z.enum(['approve', 'reject', 'pin', 'unpin', 'delete']),
  reason: z.string().max(200).optional(),
});

function pickPid(req: Request) {
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  return segs[segs.length - 1]!;
}

export const PATCH = handler(async (req) => {
  await requireAdmin({ allowModerator: true });
  const pid = pickPid(req);
  const body = Body.parse(await req.json());

  const photo = await prisma.speciesPhoto.findUnique({ where: { id: pid } });
  if (!photo) return fail(404, '照片不存在');

  switch (body.action) {
    case 'approve':
      await prisma.speciesPhoto.update({
        where: { id: pid },
        data: { status: 'approved', rejectReason: null },
      });
      break;
    case 'reject':
      await prisma.speciesPhoto.update({
        where: { id: pid },
        data: { status: 'rejected', rejectReason: body.reason ?? null },
      });
      break;
    case 'pin':
      // 一次只允许一张钉顶:同品种其他先取消钉
      await prisma.$transaction([
        prisma.speciesPhoto.updateMany({
          where: { speciesId: photo.speciesId, pinned: true },
          data: { pinned: false },
        }),
        prisma.speciesPhoto.update({
          where: { id: pid },
          data: { pinned: true, status: 'approved' },
        }),
      ]);
      break;
    case 'unpin':
      await prisma.speciesPhoto.update({
        where: { id: pid },
        data: { pinned: false },
      });
      break;
    case 'delete':
      await prisma.speciesPhoto.delete({ where: { id: pid } });
      break;
  }

  return { ok: true };
});
