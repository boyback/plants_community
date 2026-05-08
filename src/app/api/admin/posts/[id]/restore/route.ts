import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

export const POST = handler(async (req) => {
  const me = await requireAdmin({ allowModerator: true });
  const id = new URL(req.url).pathname.split('/').filter(Boolean)[3]; // /api/admin/posts/:id/restore
  if (!id) return fail(400, '缺少 id');
  const p = await prisma.post.findUnique({ where: { id } });
  if (!p) return fail(404, '帖子不存在');
  await prisma.post.update({
    where: { id },
    data: { deleted: false, deletedAt: null, deletedBy: null, deleteReason: null },
  });
  await logAdmin({
    actorId: me.id,
    action: 'post.restore',
    targetType: 'post',
    targetId: id,
  });
  return { ok: true };
});
