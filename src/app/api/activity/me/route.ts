import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const GET = handler(async () => {
  const me = await requireUser();
  const ym = monthKey();
  const stat = await prisma.monthlyActivity.findUnique({
    where: { userId_yearMonth: { userId: me.id, yearMonth: ym } },
  });

  // 当月所有人按 score 排序,算我的排名
  const allCurr = await prisma.monthlyActivity.findMany({
    where: { yearMonth: ym },
    orderBy: { score: 'desc' },
    select: { userId: true },
  });
  const myRank = allCurr.findIndex((x) => x.userId === me.id);

  return {
    yearMonth: ym,
    score: stat?.score ?? 0,
    rank: myRank >= 0 ? myRank + 1 : null,
    totalParticipants: allCurr.length,
  };
});
