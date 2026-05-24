import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';
import { ALL_PERMISSIONS } from '@/lib/levels';

export const dynamic = 'force-dynamic';

const Permission = z.enum(ALL_PERMISSIONS as unknown as [string, ...string[]]);

const Body = z.object({
  permissions: z.array(
    z.object({
      permission: Permission,
      level: z.number().int().min(1).max(10).nullable(),
    })
  ),
  note: z.string().max(500).optional(),
});

export const PATCH = handler(async (req) => {
  const me = await getCurrentUser();
  if (!me) return fail(401, '请先登录');
  if (!me.isSuperAdmin) return fail(403, '只有超级管理员可以配置等级功能权限');

  const body = Body.parse(await req.json());
  const byPermission = new Map(body.permissions.map((item) => [item.permission, item.level]));
  const rows = ALL_PERMISSIONS.map((permission) => ({
    permission,
    level: byPermission.has(permission) ? byPermission.get(permission)! : null,
    note: body.note ?? null,
    createdBy: me.id,
  }));

  await prisma.$transaction(async (tx) => {
    await (tx as any).levelPermissionConfig.deleteMany({});
    await (tx as any).levelPermissionConfig.createMany({ data: rows });
  });

  await logAdmin({
    actorId: me.id,
    action: 'level.permissions',
    targetType: 'level_permission',
    targetId: undefined,
    reason: body.note,
    meta: { permissions: rows.map(({ permission, level }) => ({ permission, level })) },
  });

  return { ok: true };
});
