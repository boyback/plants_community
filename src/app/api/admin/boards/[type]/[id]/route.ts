/**
 * PATCH /api/admin/boards/:type/:id
 *   type = category | genus | species
 *   body: { enabled?: boolean, orderIdx?: number }
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  enabled: z.boolean().optional(),
  orderIdx: z.number().int().optional(),
});

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const id = parts.pop()!;
  const type = parts.pop()!;
  const body = Body.parse(await req.json());

  if (!['category'].includes(type)) return fail(400, 'type 无效(目前只 category 支持启用/禁用)');

  const data: Record<string, unknown> = {};
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled;
  if (typeof body.orderIdx === 'number') data.orderIdx = body.orderIdx;
  if (Object.keys(data).length === 0) return fail(400, '没有变更');

  const exists = await prisma.category.findUnique({ where: { id } });
  if (!exists) return fail(404, 'category 不存在');
  await prisma.category.update({ where: { id }, data });

  await logAdmin({
    actorId: me.id,
    action: `board.${type}.update`,
    targetType: type,
    targetId: id,
    meta: data,
  });
  return { ok: true };
});
