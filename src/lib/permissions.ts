import { prisma } from '@/lib/db';
import { hasPermission, type Permission } from '@/lib/levels';
import { isVipActive } from '@/lib/auth';

export interface PermissionOverrides {
  grantedPermissions: Permission[];
  revokedPermissions: Permission[];
}

export function splitPermissionOverrides(
  rows: { permission: string; effect: 'grant' | 'revoke' }[]
): PermissionOverrides {
  return {
    grantedPermissions: rows
      .filter((r) => r.effect === 'grant')
      .map((r) => r.permission as Permission),
    revokedPermissions: rows
      .filter((r) => r.effect === 'revoke')
      .map((r) => r.permission as Permission),
  };
}

export async function getUserPermissionOverrides(
  userId: string
): Promise<PermissionOverrides> {
  const rows = await prisma.userPermissionOverride.findMany({
    where: { userId },
    select: { permission: true, effect: true },
  });
  return splitPermissionOverrides(rows);
}

export async function hasUserPermission(
  user: {
    id: string;
    level: number;
    vipExpireAt: Date | null;
    vipLifetime: boolean;
  },
  perm: Permission
): Promise<boolean> {
  const overrides = await getUserPermissionOverrides(user.id);
  return hasPermission(
    {
      level: user.level,
      isVip: isVipActive(user),
      ...overrides,
    },
    perm
  );
}
