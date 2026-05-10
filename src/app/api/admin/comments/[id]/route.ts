/**
 * DELETE /api/admin/comments/:id?reason=xxx    软删除
 * POST   /api/admin/comments/:id/restore       恢复
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

export const DELETE = handler(async (req: Request) => {
  const me = await requireAdmin();
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const id = parts[parts.length - 1];
  const reason = url.searchParams.get('reason') || null;

  const c = await prisma.comment.findUnique({ where: { id } });
  if (!c) return fail(404, '评论不存在');
  if (c.deleted) return fail(409, '已删除');

  await prisma.comment.update({
    where: { id },
    data: {
      deleted: true,
      deletedAt: new Date(),
      deletedBy: me.id,
      deleteReason: reason,
    },
  });
  await logAdmin({
    actorId: me.id,
    action: 'comment.delete',
    targetType: 'comment',
    targetId: id,
    reason: reason ?? undefined,
  });
  return { ok: true };
});

export const POST = handler(async (req: Request) => {
  const me = await requireAdmin();
  const url = new URL(req.url);
  // 路径形式 /api/admin/comments/:id 或 /api/admin/comments/:id/restore
  const parts = url.pathname.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  const id = last === 'restore' ? parts[parts.length - 2] : last;

  const c = await prisma.comment.findUnique({ where: { id } });
  if (!c) return fail(404, '评论不存在');

  await prisma.comment.update({
    where: { id },
    data: {
      deleted: false,
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
    },
  });
  await logAdmin({
    actorId: me.id,
    action: 'comment.restore',
    targetType: 'comment',
    targetId: id,
  });
  return { ok: true };
});
