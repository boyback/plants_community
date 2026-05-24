import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';
import { ALL_PERMISSIONS } from '@/lib/levels';

export const dynamic = 'force-dynamic';

const RoleKey = z.enum(['user', 'moderator', 'admin', 'super_admin']);
const Permission = z.enum(ALL_PERMISSIONS as unknown as [string, ...string[]]);

const Body = z.object({
  roleKey: RoleKey,
  grants: z.array(Permission).default([]),
  revokes: z.array(Permission).default([]),
  note: z.string().max(500).optional(),
});

function requireSuperAdmin(user: { isSuperAdmin?: boolean | null }) {
  if (!user.isSuperAdmin) return fail(403, '只有超级管理员可以分配角色功能权限');
  return null;
}

export const PATCH = handler(async (req) => {
  const me = await getCurrentUser();
  if (!me) return fail(401, '请先登录');
  const blocked = requireSuperAdmin(me);
  if (blocked) return blocked;

  const body = Body.parse(await req.json());
  const grants = new Set(body.grants);
  const revokes = new Set(body.revokes);
  const overlap = [...grants].filter((p) => revokes.has(p));
  if (overlap.length > 0) return fail(400, '同一权限不能同时授予和收回');

  await prisma.$transaction(async (tx) => {
    await (tx as any).rolePermissionOverride.deleteMany({ where: { roleKey: body.roleKey } });
    const rows = [
      ...[...grants].map((permission) => ({
        roleKey: body.roleKey,
        permission,
        effect: 'grant' as const,
        note: body.note ?? null,
        createdBy: me.id,
      })),
      ...[...revokes].map((permission) => ({
        roleKey: body.roleKey,
        permission,
        effect: 'revoke' as const,
        note: body.note ?? null,
        createdBy: me.id,
      })),
    ];
    if (rows.length > 0) {
      await (tx as any).rolePermissionOverride.createMany({ data: rows });
    }
  });

  await logAdmin({
    actorId: me.id,
    action: 'role.permissions',
    targetType: 'role',
    targetId: body.roleKey,
    reason: body.note,
    meta: { grants: [...grants], revokes: [...revokes] },
  });

  return { ok: true };
});
