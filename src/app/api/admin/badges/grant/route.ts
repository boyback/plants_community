/**
 * POST /api/admin/badges/grant
 *   body: { badgeId: string; userIds: string[] | null; all?: boolean }
 *
 * - 指定 userIds: 给这些用户发
 * - all=true:    给所有用户发(谨慎!)
 *
 * 幂等:已经 obtained=true 的不重复发。
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  badgeId: z.string().min(1),
  userIds: z.array(z.string()).optional(),
  all: z.boolean().optional(),
}).refine((b) => (b.userIds && b.userIds.length > 0) || b.all === true, {
  message: '必须提供 userIds 或 all=true',
});

export const POST = handler(async (req) => {
  const me = await requireAdmin();
  const body = Body.parse(await req.json());
  const badge = await prisma.badge.findUnique({ where: { id: body.badgeId } });
  if (!badge) return fail(404, '徽章不存在');

  let userIds: string[];
  if (body.all) {
    const users = await prisma.user.findMany({ select: { id: true } });
    userIds = users.map((u) => u.id);
  } else {
    userIds = body.userIds!;
  }

  const now = new Date();
  let granted = 0;
  // 批量 upsert:已有且 obtained=true 的跳过
  for (const uid of userIds) {
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId: uid, badgeId: badge.id } },
    });
    if (existing?.obtained) continue;
    if (existing) {
      await prisma.userBadge.update({
        where: { userId_badgeId: { userId: uid, badgeId: badge.id } },
        data: { obtained: true, obtainedAt: now },
      });
    } else {
      await prisma.userBadge.create({
        data: { userId: uid, badgeId: badge.id, obtained: true, obtainedAt: now },
      });
    }
    granted += 1;
  }

  await logAdmin({
    actorId: me.id,
    action: 'badge.grant',
    targetType: 'badge',
    targetId: badge.id,
    meta: { badgeName: badge.name, granted, scope: body.all ? 'all' : 'specific' },
  });

  return { granted, total: userIds.length, badgeName: badge.name };
});
