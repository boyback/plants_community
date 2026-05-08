import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { confirmPayment } from '@/lib/payment';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Demo 专用:模拟"我已经付款"按钮(等价于第三方网关 webhook)。
 * 只允许支付单的拥有者触发。
 */
function pickPayNo(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const payNo = pickPayNo(req);
  const p = await prisma.payment.findUnique({ where: { payNo } });
  if (!p) return fail(404, '支付单不存在');
  if (p.userId !== me.id) return fail(403, '无权操作');

  const r = await confirmPayment(payNo);
  return r;
});
