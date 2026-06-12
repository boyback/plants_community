import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { Permission } from '@/lib/levels';
import { getLevelPermissionConfigs } from '@/lib/permissions';
import { LevelPermissionManager, RolePermissionManager } from './RolePermissionManager';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

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
    orderBy: { createdAt: 'asc' }
  }),
  getLevelPermissionConfigs()]
  );

  const grouped = ROLE_KEYS.map((roleKey) => {
    const own = rows.filter((row: {roleKey: string;}) => row.roleKey === roleKey);
    return {
      roleKey,
      grants: own.
      filter((row: {effect: string;}) => row.effect === 'grant').
      map((row: {permission: string;}) => row.permission as Permission),
      revokes: own.
      filter((row: {effect: string;}) => row.effect === 'revoke').
      map((row: {permission: string;}) => row.permission as Permission)
    };
  });

  return (
    <div className={styles.r_3e7ce58d}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)}>权限管理</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_02eb621e)}>
          按角色类型分配功能权限。用户只负责归属到某个角色，不在这里做单人特例。
        </p>
      </div>

      <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_7ebecbb6, styles.r_8e63407b, styles.r_fc7473ca, styles.r_fa5fa43b)}>
        权限最终计算顺序:角色显式收回优先，其次角色显式授予，然后是 VIP 权限，最后按功能标注的 Lv.X 默认解锁。
      </div>

      <LevelPermissionManager rows={levelPermissionConfigs} />
      <RolePermissionManager rows={grouped} levelPermissions={levelPermissionConfigs} />
    </div>);

}