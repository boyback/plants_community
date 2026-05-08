import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

const Body = z.object({ trackingNo: z.string().min(1).max(64) });

export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const body = Body.parse(await req.json());
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return fail(404, '订单不存在');

  // 官方订单可由系统自动发货,这里直接允许买家无 sellerId 的官方订单也能"模拟发货"
  // 真实场景:仅 sellerId === me.id 才允许;官方订单交由后台
  const allowed = order.sellerId ? order.sellerId === me.id : true;
  if (!allowed) return fail(403, '无权发货');

  if (order.status !== 'pending_ship') return fail(400, '当前状态不允许发货');

  await prisma.order.update({
    where: { id },
    data: {
      status: 'pending_receipt',
      trackingNo: body.trackingNo,
      shippedAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      recipientId: order.buyerId,
      type: 'system',
      text: `📦 你的订单已发货,运单号:${body.trackingNo}`,
      link: `/orders`,
    },
  });

  return { ok: true };
});
