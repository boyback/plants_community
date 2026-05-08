/**
 * PATCH /api/admin/orders/:id
 *   - { action: 'ship', trackingNo?: string }    标发货
 *   - { action: 'refund', reason?: string }      退款(退金额到用户积分或标记 refunded)
 *   - { action: 'complete' }                      强制完成
 *   - { action: 'cancel', reason?: string }       强制取消
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  action: z.enum(['ship', 'refund', 'complete', 'cancel']),
  trackingNo: z.string().max(64).optional(),
  reason: z.string().max(500).optional(),
});

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const body = Body.parse(await req.json());
  const o = await prisma.order.findUnique({ where: { id } });
  if (!o) return fail(404, '订单不存在');

  if (body.action === 'ship') {
    if (o.status !== 'pending_ship') return fail(400, '订单状态不允许发货');
    await prisma.order.update({
      where: { id },
      data: {
        status: 'pending_receipt',
        trackingNo: body.trackingNo ?? null,
        shippedAt: new Date(),
      },
    });
    await logAdmin({
      actorId: me.id,
      action: 'order.ship',
      targetType: 'order',
      targetId: id,
      meta: { trackingNo: body.trackingNo },
    });
  } else if (body.action === 'refund') {
    if (!['pending_ship', 'pending_receipt', 'pending_review', 'completed'].includes(o.status)) {
      return fail(400, '订单状态不允许退款');
    }
    await prisma.order.update({ where: { id }, data: { status: 'refunded' } });
    await logAdmin({
      actorId: me.id,
      action: 'order.refund',
      targetType: 'order',
      targetId: id,
      reason: body.reason,
    });
  } else if (body.action === 'complete') {
    await prisma.order.update({ where: { id }, data: { status: 'completed' } });
    await logAdmin({
      actorId: me.id,
      action: 'order.complete',
      targetType: 'order',
      targetId: id,
    });
  } else if (body.action === 'cancel') {
    await prisma.order.update({ where: { id }, data: { status: 'cancelled' } });
    await logAdmin({
      actorId: me.id,
      action: 'order.cancel',
      targetType: 'order',
      targetId: id,
      reason: body.reason,
    });
  }

  return { ok: true };
});
