import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return fail(404, '订单不存在');
  if (order.buyerId !== me.id) return fail(403, '只能取消自己的订单');
  if (order.status !== 'pending_payment') return fail(400, '当前状态不允许取消');

  await prisma.order.update({
    where: { id },
    data: { status: 'cancelled', cancelledAt: new Date() },
  });
  await prisma.payment.updateMany({
    where: { bizId: id, bizType: 'order', status: 'pending' },
    data: { status: 'cancelled' },
  });
  return { ok: true };
});
