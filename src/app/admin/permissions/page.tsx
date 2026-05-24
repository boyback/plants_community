import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Permission } from '@/lib/levels';
import { getLevelPermissionConfigs } from '@/lib/permissions';
import { LevelPermissionManager, RolePermissionManager } from './RolePermissionManager';

export const dynamic = 'force-dynamic';

type RoleKey = 'user' | 'moderator' | 'admin' | 'super_admin';

const ROLE_KEYS: RoleKey[] = ['user', 'moderator', 'admin', 'super_admin'];

export default async function AdminPermissionsPage() {
  const me = await getCurrentUser();
  if (!me?.isSuperAdmin) {
    redirect('/');
  }

  const [rows, levelPermissionConfigs] = await Promise.all([
    (prisma as any).rolePermissionOverride.findMany({
      where: { roleKey: { in: ROLE_KEYS } },
      select: { roleKey: true, permission: true, effect: true },
      orderBy: { createdAt: 'asc' },
    }),
    getLevelPermissionConfigs(),
  ]);

  const grouped = ROLE_KEYS.map((roleKey) => {
    const own = rows.filter((row: { roleKey: string }) => row.roleKey === roleKey);
    return {
      roleKey,
      grants: own
        .filter((row: { effect: string }) => row.effect === 'grant')
        .map((row: { permission: string }) => row.permission as Permission),
      revokes: own
        .filter((row: { effect: string }) => row.effect === 'revoke')
        .map((row: { permission: string }) => row.permission as Permission),
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink-800">权限管理</h1>
        <p className="mt-1 text-sm text-ink-600">
          按角色类型分配功能权限。用户只负责归属到某个角色，不在这里做单人特例。
        </p>
      </div>

      <div className="rounded-xl border border-leaf-100 bg-leaf-50 p-4 text-sm text-leaf-900">
        权限最终计算顺序:角色显式收回优先，其次角色显式授予，然后是 VIP 权限，最后按功能标注的 Lv.X 默认解锁。
      </div>

      <LevelPermissionManager rows={levelPermissionConfigs} />
      <RolePermissionManager rows={grouped} levelPermissions={levelPermissionConfigs} />
    </div>
  );
}
