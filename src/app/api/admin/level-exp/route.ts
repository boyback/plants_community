import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';
import { LEVELS } from '@/lib/levels';

export const dynamic = 'force-dynamic';

const Body = z.object({
  levels: z.array(
    z.object({
      level: z.number().int().min(1).max(10),
      name: z.string().min(1).max(20),
      expRequired: z.number().int().min(0).max(1_000_000),
    })
  ),
  note: z.string().max(500).optional(),
});

function validateLevels(levels: z.infer<typeof Body>['levels']) {
  const byLevel = new Map(levels.map((item) => [item.level, item]));
  for (const def of LEVELS) {
    if (!byLevel.has(def.level)) return `缺少 Lv.${def.level} 配置`;
  }
  const ordered = LEVELS.map((def) => byLevel.get(def.level)!);
  if (ordered[0].expRequired !== 0) return 'Lv.1 所需经验必须为 0';
  for (let i = 1; i < ordered.length; i += 1) {
    if (ordered[i].expRequired <= ordered[i - 1].expRequired) {
      return `Lv.${ordered[i].level} 所需经验必须大于 Lv.${ordered[i - 1].level}`;
    }
  }
  return null;
}

export const PATCH = handler(async (req) => {
  const me = await getCurrentUser();
  if (!me) return fail(401, '请先登录');
  if (!me.isSuperAdmin) return fail(403, '只有超级管理员可以配置等级经验');

  const body = Body.parse(await req.json());
  const error = validateLevels(body.levels);
  if (error) return fail(400, error);

  await prisma.$transaction(async (tx) => {
    await (tx as any).levelExpConfig.deleteMany({});
    await (tx as any).levelExpConfig.createMany({
      data: body.levels.map((item) => ({
        level: item.level,
        name: item.name,
        expRequired: item.expRequired,
        note: body.note ?? null,
        createdBy: me.id,
      })),
    });
  });

  await logAdmin({
    actorId: me.id,
    action: 'level.exp',
    targetType: 'level_exp',
    targetId: undefined,
    reason: body.note,
    meta: { levels: body.levels },
  });

  return { ok: true };
});
