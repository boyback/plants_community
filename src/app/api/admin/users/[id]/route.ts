/**
 * PATCH /api/admin/users/:id
 *   body:
 *     - { role: 'user' | 'moderator' | 'admin' }           改角色
 *     - { ban: { days: number; reason?: string } }          封禁(days 天,0 = 永久)
 *     - { unban: true }                                    解封
 *     - { pointsDelta: number; reason?: string }            加/减积分(直接改余额 + 记流水)
 *
 * 都落 AdminLog。
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z
  .object({
    role: z.enum(['user', 'moderator', 'admin']).optional(),
    ban: z.object({ days: z.number().int().min(0).max(3650), reason: z.string().max(500).optional() }).optional(),
    unban: z.literal(true).optional(),
    pointsDelta: z.number().int().optional(),
    reason: z.string().max(500).optional(),
  })
  .refine(
    (b) => b.role || b.ban || b.unban || typeof b.pointsDelta === 'number',
    { message: '必须指定至少一个操作' }
  );

function pickId(req: Request) {
  return new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
}

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const body = Body.parse(await req.json());

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return fail(404, '用户不存在');
  if (target.id === me.id && (body.role || body.ban)) {
    return fail(400, '不能对自己执行该操作');
  }

  const updates: Record<string, unknown> = {};
  if (body.role) updates.role = body.role;

  if (body.ban) {
    const days = body.ban.days;
    // 0 = 永久(100 年)
    const until =
      days === 0 ? new Date(Date.now() + 100 * 365 * 86400_000) : new Date(Date.now() + days * 86400_000);
    updates.bannedUntil = until;
    updates.banReason = body.ban.reason ?? '';
  }

  if (body.unban) {
    updates.bannedUntil = null;
    updates.banReason = null;
  }

  if (typeof body.pointsDelta === 'number') {
    // 走事务:改 balance + 落流水
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { pointsBalance: { increment: body.pointsDelta! } },
      });
      await tx.pointsLedger.create({
        data: {
          userId: id,
          type: 'admin',
          delta: body.pointsDelta!,
          balance: target.pointsBalance + body.pointsDelta!,
          remark: body.reason ?? '管理员调整',
        },
      });
    });
    await logAdmin({
      actorId: me.id,
      action: 'user.pointsAdjust',
      targetType: 'user',
      targetId: id,
      reason: body.reason,
      meta: { delta: body.pointsDelta },
    });
  }

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({ where: { id }, data: updates });
  }

  if (body.role) {
    await logAdmin({
      actorId: me.id,
      action: 'user.setRole',
      targetType: 'user',
      targetId: id,
      meta: { role: body.role },
    });
  }
  if (body.ban) {
    await logAdmin({
      actorId: me.id,
      action: 'user.ban',
      targetType: 'user',
      targetId: id,
      reason: body.ban.reason,
      meta: { days: body.ban.days },
    });
  }
  if (body.unban) {
    await logAdmin({
      actorId: me.id,
      action: 'user.unban',
      targetType: 'user',
      targetId: id,
    });
  }

  return { ok: true };
});
