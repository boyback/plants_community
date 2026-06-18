import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { levelByConfiguredExp } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const Body = z.object({
  taskId: z.string(),
});

const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());

  const task = await prisma.task.findUnique({ where: { id: body.taskId } });
  if (!task) return fail(404, '任务不存在');

  const cycleKey =
    task.kind === 'daily'
      ? dayKey()
      : task.kind === 'monthly'
      ? monthKey()
      : 'always';

  const tp = await prisma.taskProgress.findUnique({
    where: {
      userId_taskId_cycleKey: {
        userId: me.id,
        taskId: task.id,
        cycleKey,
      },
    },
  });
  if (!tp) return fail(400, '任务尚未开始');
  if (!tp.completed) return fail(400, '任务未完成');
  if (tp.claimed) return fail(400, '已领取奖励');

  await prisma.$transaction(async (tx) => {
    await tx.taskProgress.update({
      where: {
        userId_taskId_cycleKey: {
          userId: me.id,
          taskId: task.id,
          cycleKey,
        },
      },
      data: { claimed: true, claimedAt: new Date() },
    });

    if (task.rewardPoints > 0) {
      const u = await tx.user.update({
        where: { id: me.id },
        data: { pointsBalance: { increment: task.rewardPoints } },
        select: { pointsBalance: true },
      });
      await tx.pointsLedger.create({
        data: {
          userId: me.id,
          type: 'task_complete',
          delta: task.rewardPoints,
          balance: u.pointsBalance,
          refType: 'task',
          refId: task.id,
          remark: `任务奖励:${task.title}`,
        },
      });
    }

    if (task.rewardExp > 0) {
      const u = await tx.user.update({
        where: { id: me.id },
        data: { exp: { increment: task.rewardExp } },
        select: { exp: true, level: true },
      });
      await tx.expLedger.create({
        data: {
          userId: me.id,
          type: 'admin',
          delta: task.rewardExp,
          total: u.exp,
          refType: 'task',
          refId: task.id,
        },
      });
      const computedLevel = await levelByConfiguredExp(u.exp);
      if (computedLevel > u.level) {
        await tx.user.update({
          where: { id: me.id },
          data: { level: computedLevel },
        });
      }
    }
  });

  return { ok: true, rewardPoints: task.rewardPoints, rewardExp: task.rewardExp };
});
