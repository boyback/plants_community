import { prisma } from '@/lib/db';
import {
  ALL_PERMISSIONS,
  LEVELS,
  PERMISSION_LEVEL,
  hasPermission,
  expProgressFromDefs,
  levelByExpFromDefs,
  permissionsForLevel,
  type LevelDef,
  type Permission,
} from '@/lib/levels';
import { isVipActive } from '@/lib/vip';

export interface PermissionOverrides {
  grantedPermissions: Permission[];
  revokedPermissions: Permission[];
}

export type PermissionRoleKey = 'user' | 'moderator' | 'admin' | 'super_admin';
export type LevelPermissionConfig = { permission: Permission; level: number | null };
export type LevelExpConfig = Pick<LevelDef, 'level' | 'name' | 'expRequired'>;

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

export function permissionRoleKey(user: {
  role?: string | null;
  isSuperAdmin?: boolean | null;
}): PermissionRoleKey {
  if (user.isSuperAdmin) return 'super_admin';
  if (user.role === 'moderator' || user.role === 'admin') return user.role;
  return 'user';
}

export async function getRolePermissionOverrides(
  roleKey: PermissionRoleKey
): Promise<PermissionOverrides> {
  const rows = await (prisma as any).rolePermissionOverride.findMany({
    where: { roleKey },
    select: { permission: true, effect: true },
  });
  return splitPermissionOverrides(rows);
}

export function defaultLevelPermissionConfigs(): LevelPermissionConfig[] {
  return ALL_PERMISSIONS.map((permission) => ({
    permission,
    level: PERMISSION_LEVEL(permission)?.level ?? null,
  }));
}

export async function getLevelPermissionConfigs(): Promise<LevelPermissionConfig[]> {
  const rows = await (prisma as any).levelPermissionConfig.findMany({
    select: { permission: true, level: true },
  });
  const byPermission = new Map<string, number | null>(
    rows.map((row: { permission: string; level: number | null }) => [
      row.permission,
      row.level,
    ] as const)
  );
  return defaultLevelPermissionConfigs().map((fallback) => ({
    permission: fallback.permission,
    level: byPermission.has(fallback.permission)
      ? (byPermission.get(fallback.permission) ?? null)
      : fallback.level,
  }));
}

export function permissionsForConfiguredLevel(
  level: number,
  configs: LevelPermissionConfig[]
): Permission[] {
  const set = new Set<Permission>();
  for (const config of configs) {
    if (typeof config.level === 'number' && config.level <= level) {
      set.add(config.permission);
    }
  }
  return [...set];
}

export async function getPermissionsForUserLevel(level: number): Promise<Permission[]> {
  const configs = await getLevelPermissionConfigs();
  if (configs.length === 0) return permissionsForLevel(level);
  return permissionsForConfiguredLevel(level, configs);
}

export async function getLevelExpConfigs(): Promise<LevelExpConfig[]> {
  const rows = await (prisma as any).levelExpConfig.findMany({
    select: { level: true, name: true, expRequired: true },
    orderBy: { level: 'asc' },
  });
  if (!Array.isArray(rows) || rows.length === 0) {
    return LEVELS.map(({ level, name, expRequired }) => ({ level, name, expRequired }));
  }
  const byLevel = new Map(
    rows.map((row: { level: number; name: string; expRequired: number }) => [row.level, row])
  );
  return LEVELS.map(({ level, name, expRequired }) => {
    const row = byLevel.get(level);
    return {
      level,
      name: row?.name ?? name,
      expRequired: row?.expRequired ?? expRequired,
    };
  });
}

export async function levelByConfiguredExp(exp: number): Promise<number> {
  return levelByExpFromDefs(exp, await getLevelExpConfigs());
}

export async function expProgressConfigured(exp: number) {
  return expProgressFromDefs(exp, await getLevelExpConfigs());
}

export async function hasUserPermission(
  user: {
    id: string;
    level: number;
    vipExpireAt: Date | null;
    vipLifetime: boolean;
    role?: string | null;
    isSuperAdmin?: boolean | null;
  },
  perm: Permission
): Promise<boolean> {
  const [overrides, levelPermissions] = await Promise.all([
    getRolePermissionOverrides(permissionRoleKey(user)),
    getPermissionsForUserLevel(user.level),
  ]);
  return hasPermission(
    {
      level: 0,
      isVip: isVipActive(user),
      grantedPermissions: [...levelPermissions, ...overrides.grantedPermissions],
      revokedPermissions: overrides.revokedPermissions,
    },
    perm
  );
}
