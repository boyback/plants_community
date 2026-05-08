import { handler } from '@/lib/api';
import { LEVELS, VIP_PERMISSIONS, PERMISSION_LABEL } from '@/lib/levels';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  return {
    levels: LEVELS.map((l) => ({
      level: l.level,
      name: l.name,
      expRequired: l.expRequired,
      permissions: l.permissions,
      perks: l.perks,
    })),
    vipPermissions: VIP_PERMISSIONS,
    permissionLabel: PERMISSION_LABEL,
  };
});
