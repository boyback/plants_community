/**
 * PATCH /api/admin/tasks/:id   启用/停用
 *   body: { enabled: boolean }
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  enabled: z.boolean().optional(),
  rewardPoints: z.number().int().min(0).max(100000).optional(),
  rewardExp: z.number().int().min(0).max(100000).optional(),
  target: z.number().int().min(1).max(10000).optional(),
});

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const body = Body.parse(await req.json());
  const t = await prisma.task.findUnique({ where: { id } });
  if (!t) return fail(404, '任务不存在');
  await prisma.task.update({ where: { id }, data: body });
  await logAdmin({
    actorId: me.id,
    action: 'task.update',
    targetType: 'task',
    targetId: id,
    meta: body,
  });
  return { ok: true };
});
