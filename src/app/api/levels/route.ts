import { handler } from '@/lib/api';
import { LEVELS, PERMISSION_LABEL } from '@/lib/levels';
import {
  getLevelExpConfigs,
  getLevelPermissionConfigs,
  permissionsForConfiguredLevel,
} from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const [configs, levelExpConfigs] = await Promise.all([
    getLevelPermissionConfigs(),
    getLevelExpConfigs(),
  ]);
  const expByLevel = new Map(levelExpConfigs.map((item) => [item.level, item]));
  return {
    levels: LEVELS.map((l) => ({
      level: l.level,
      name: expByLevel.get(l.level)?.name ?? l.name,
      expRequired: expByLevel.get(l.level)?.expRequired ?? l.expRequired,
      permissions: permissionsForConfiguredLevel(l.level, configs),
      perks: l.perks,
    })),
    levelPermissionConfigs: configs,
    permissionLabel: PERMISSION_LABEL,
  };
});
