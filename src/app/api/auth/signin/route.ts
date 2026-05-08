import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { emitEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export const POST = handler(async () => {
  const me = await requireUser();
  const now = new Date();
  const last = me.lastSignInAt;

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isYesterday = (prev: Date, today: Date) => {
    const y = new Date(today);
    y.setDate(today.getDate() - 1);
    return isSameDay(prev, y);
  };

  let streak = me.signInStreak;
  let alreadySigned = false;

  if (last && isSameDay(last, now)) {
    alreadySigned = true;
  } else if (last && isYesterday(last, now)) {
    streak = streak + 1;
  } else {
    streak = 1;
  }

  if (!alreadySigned) {
    await prisma.user.update({
      where: { id: me.id },
      data: {
        lastSignInAt: now,
        signInStreak: streak,
      },
    });
    // 触发事件:加积分/EXP/活跃度 + 任务进度
    await emitEvent({ kind: 'signin', userId: me.id });
  }

  return { signInStreak: streak, signedInToday: true, alreadySigned };
});
