import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const me = await requireUser();
  // 取最新余额(防止冗余字段不同步)
  const u = await prisma.user.findUnique({
    where: { id: me.id },
    select: { pointsBalance: true, exp: true, level: true },
  });
  // 累计获得 / 消费
  const ledger = await prisma.pointsLedger.findMany({
    where: { userId: me.id },
    select: { delta: true },
  });
  const earned = ledger.filter((x) => x.delta > 0).reduce((s, x) => s + x.delta, 0);
  const spent = -ledger.filter((x) => x.delta < 0).reduce((s, x) => s + x.delta, 0);

  return {
    balance: u?.pointsBalance ?? 0,
    earned,
    spent,
    exp: u?.exp ?? 0,
    level: u?.level ?? 1,
  };
});
