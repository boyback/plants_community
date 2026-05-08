/**
 * PATCH /api/admin/products/:id
 *   body: { status: 'on_sale' | 'off_shelf', reason?: string }
 *
 * 管理员下架/上架商品。
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  status: z.enum(['on_sale', 'off_shelf']),
  reason: z.string().max(500).optional(),
});

export const PATCH = handler(async (req) => {
  const me = await requireAdmin();
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const body = Body.parse(await req.json());
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p) return fail(404, '商品不存在');
  await prisma.product.update({ where: { id }, data: { status: body.status } });
  await logAdmin({
    actorId: me.id,
    action: `product.${body.status === 'off_shelf' ? 'offshelf' : 'onsale'}`,
    targetType: 'product',
    targetId: id,
    reason: body.reason,
  });
  return { ok: true };
});
