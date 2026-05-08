/**
 * DELETE /api/admin/posts/:id?reason=xxx
 *   软删除(设 deleted=true)
 *
 * POST   /api/admin/posts/:id/restore
 *   恢复(deleted=false)
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  return new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
}

const DelQuery = z.object({ reason: z.string().max(500).optional() });

export const DELETE = handler(async (req) => {
  const me = await requireAdmin({ allowModerator: true });
  const id = pickId(req);
  const q = DelQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const p = await prisma.post.findUnique({ where: { id } });
  if (!p) return fail(404, '帖子不存在');
  await prisma.post.update({
    where: { id },
    data: {
      deleted: true,
      deletedAt: new Date(),
      deletedBy: me.id,
      deleteReason: q.reason ?? '',
    },
  });
  await logAdmin({
    actorId: me.id,
    action: 'post.delete',
    targetType: 'post',
    targetId: id,
    reason: q.reason,
  });
  return { ok: true };
});
