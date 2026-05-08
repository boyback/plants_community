import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeTask } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const GET = handler(async () => {
  const me = await requireUser();
  const tasks = await prisma.task.findMany({
    where: { enabled: true },
    orderBy: [{ kind: 'asc' }, { orderIdx: 'asc' }],
  });

  const taskIds = tasks.map((t) => t.id);
  if (taskIds.length === 0) return { daily: [], monthly: [], achievement: [] };

  const cycleKeys = ['always', dayKey(), monthKey()];

  const progress = await prisma.taskProgress.findMany({
    where: {
      userId: me.id,
      taskId: { in: taskIds },
      cycleKey: { in: cycleKeys },
    },
  });
  const pMap = new Map<string, (typeof progress)[number]>();
  for (const p of progress) {
    pMap.set(p.taskId + ':' + p.cycleKey, p);
  }

  const enrich = (t: (typeof tasks)[number]) => {
    const cycleKey = t.kind === 'daily' ? dayKey() : t.kind === 'monthly' ? monthKey() : 'always';
    const tp = pMap.get(t.id + ':' + cycleKey);
    return serializeTask({ ...t, progress: tp ? [tp] : [] });
  };

  return {
    daily: tasks.filter((t) => t.kind === 'daily').map(enrich),
    monthly: tasks.filter((t) => t.kind === 'monthly').map(enrich),
    achievement: tasks.filter((t) => t.kind === 'achievement').map(enrich),
  };
});
