/**
 * PATCH /api/admin/users/:id
 *   body:
 *     - { role: 'user' | 'moderator' | 'admin' }           改角色
 *     - { ban: { days: number; reason?: string } }          封禁(days 天,0 = 永久)
 *     - { unban: true }                                    解封
 *     - { pointsDelta: number; reason?: string }            加/减钻石(直接改余额 + 记流水)
 *
 * 都落 AdminLog。
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const ModeratorScopeInput = z.object({
  type: z.enum(['board', 'genus', 'species']),
  targetId: z.string().min(1),
});

const Body = z
  .object({
    role: z.enum(['user', 'moderator', 'admin']).optional(),
    moderatorScopes: z.array(ModeratorScopeInput).max(50).optional(),
    ban: z.object({ days: z.number().int().min(0).max(3650), reason: z.string().max(500).optional() }).optional(),
    unban: z.literal(true).optional(),
    pointsDelta: z.number().int().optional(),
    reason: z.string().max(500).optional(),
  })
  .refine(
    (b) =>
      b.role ||
      b.moderatorScopes ||
      b.ban ||
      b.unban ||
      typeof b.pointsDelta === 'number',
    { message: '必须指定至少一个操作' }
  );

function pickId(req: Request) {
  return new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
}

async function resolveModeratorScopes(
  scopes: z.infer<typeof ModeratorScopeInput>[],
  createdBy: string
) {
  const deduped = Array.from(
    new Map(scopes.map((scope) => [`${scope.type}:${scope.targetId}`, scope])).values()
  );
  const boardIds = deduped.filter((scope) => scope.type === 'board').map((scope) => scope.targetId);
  const genusIds = deduped.filter((scope) => scope.type === 'genus').map((scope) => scope.targetId);
  const speciesIds = deduped.filter((scope) => scope.type === 'species').map((scope) => scope.targetId);

  const [boards, genera, species] = await Promise.all([
    boardIds.length
      ? prisma.board.findMany({
          where: { id: { in: boardIds }, kind: 'family' },
          select: { id: true, name: true },
        })
      : [],
    genusIds.length
      ? prisma.genus.findMany({
          where: { id: { in: genusIds } },
          select: { id: true, name: true, board: { select: { name: true } } },
        })
      : [],
    speciesIds.length
      ? prisma.species.findMany({
          where: { id: { in: speciesIds } },
          select: {
            id: true,
            name: true,
            genus: { select: { name: true, board: { select: { name: true } } } },
          },
        })
      : [],
  ]);

  const boardMap = new Map(boards.map((item) => [item.id, item]));
  const genusMap = new Map(genera.map((item) => [item.id, item]));
  const speciesMap = new Map(species.map((item) => [item.id, item]));

  return deduped.map((scope) => {
    if (scope.type === 'board') {
      const board = boardMap.get(scope.targetId);
      if (!board) throw new Error('版主管辖的科不存在');
      return {
        type: scope.type,
        targetId: board.id,
        targetName: board.name,
        targetPath: board.name,
        createdBy,
      };
    }
    if (scope.type === 'genus') {
      const genus = genusMap.get(scope.targetId);
      if (!genus) throw new Error('版主管辖的属不存在');
      const parent = genus.board?.name;
      return {
        type: scope.type,
        targetId: genus.id,
        targetName: genus.name,
        targetPath: parent ? `${parent} / ${genus.name}` : genus.name,
        createdBy,
      };
    }
    const item = speciesMap.get(scope.targetId);
    if (!item) throw new Error('版主管辖的品种不存在');
    const boardName = item.genus.board?.name;
    const path = [boardName, item.genus.name, item.name].filter(Boolean).join(' / ');
    return {
      type: scope.type,
      targetId: item.id,
      targetName: item.name,
      targetPath: path,
      createdBy,
    };
  });
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

  const nextRole = body.role ?? target.role;
  if (body.role === 'moderator' && (!body.moderatorScopes || body.moderatorScopes.length === 0)) {
    return fail(400, '分配版主时必须选择至少一个科、属或品种');
  }
  if (nextRole === 'moderator' && body.moderatorScopes && body.moderatorScopes.length === 0) {
    return fail(400, '版主至少需要一个辖区');
  }
  if (body.moderatorScopes && body.moderatorScopes.length > 0 && nextRole !== 'moderator') {
    return fail(400, '只有版主角色可以设置辖区');
  }

  const updates: Record<string, unknown> = {};
  if (body.role) updates.role = body.role;
  let resolvedModeratorScopes: Awaited<ReturnType<typeof resolveModeratorScopes>> | null = null;
  if (body.moderatorScopes) {
    try {
      resolvedModeratorScopes = await resolveModeratorScopes(body.moderatorScopes, me.id);
    } catch (e) {
      return fail(400, e instanceof Error ? e.message : '版主管辖范围无效');
    }
  }

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

  if (body.role && body.role !== 'moderator') {
    await prisma.moderatorScope.deleteMany({ where: { userId: id } });
  } else if (resolvedModeratorScopes) {
    await prisma.$transaction(async (tx) => {
      await tx.moderatorScope.deleteMany({ where: { userId: id } });
      if (resolvedModeratorScopes.length > 0) {
        await tx.moderatorScope.createMany({
          data: resolvedModeratorScopes.map((scope) => ({ ...scope, userId: id })),
        });
      }
    });
  }

  if (body.role) {
    await logAdmin({
      actorId: me.id,
      action: 'user.setRole',
      targetType: 'user',
      targetId: id,
      meta: {
        role: body.role,
        moderatorScopes: resolvedModeratorScopes?.map((scope) => ({
          type: scope.type,
          targetId: scope.targetId,
          targetPath: scope.targetPath,
        })),
      },
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
