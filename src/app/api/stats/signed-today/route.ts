/**
 * 今日已签到的全站人数(未登录也可访问)
 *
 * GET /api/stats/signed-today
 *
 * 用 Cache-Control 在边缘缓存 30 秒,避免高频查询打 DB
 */
import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const count = await prisma.user.count({
    where: { lastSignInAt: { gte: todayStart } },
  });

  return { count };
});
