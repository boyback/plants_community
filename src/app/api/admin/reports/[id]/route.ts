/**
 * PATCH /api/admin/reports/:id
 *   body: { status: 'resolved' | 'rejected'; note?: string }
 *
 * 处理举报(标为已处理/驳回)。
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  status: z.enum(['resolved', 'rejected']),
  note: z.string().max(500).optional(),
});

export const PATCH = handler(async (req) => {
  const me = await requireAdmin({ allowModerator: true });
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const body = Body.parse(await req.json());
  const r = await prisma.report.findUnique({ where: { id } });
  if (!r) return fail(404, '举报不存在');
  await prisma.report.update({
    where: { id },
    data: {
      status: body.status,
      handledBy: me.id,
      handledAt: new Date(),
      handleNote: body.note ?? null,
    },
  });
  await logAdmin({
    actorId: me.id,
    action: `report.${body.status}`,
    targetType: 'report',
    targetId: id,
    reason: body.note,
    meta: { targetType: r.targetType, targetId: r.targetId },
  });
  return { ok: true };
});
