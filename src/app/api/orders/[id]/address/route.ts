import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

const Body = z.object({
  // 三种模式同 buy 接口
  addressId: z.string().optional(),
  shipName: z.string().min(1).max(40).optional(),
  shipPhone: z.string().min(1).max(20).optional(),
  shipAddress: z.string().min(2).max(200).optional(),
  saveAddress: z.boolean().optional(),
  saveAsDefault: z.boolean().optional(),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return fail(404, '订单不存在');
  if (order.buyerId !== me.id) return fail(403, '只有买家能填写收货地址');
  if (order.status !== 'pending_payment') return fail(400, '当前状态不允许修改地址');

  const body = Body.parse(await req.json());

  let shipName: string;
  let shipPhone: string;
  let shipAddress: string;

  if (body.addressId) {
    const addr = await prisma.address.findUnique({ where: { id: body.addressId } });
    if (!addr) return fail(404, '收件地址不存在');
    if (addr.userId !== me.id) return fail(403, '收件地址无权使用');
    shipName = addr.name;
    shipPhone = addr.phone;
    shipAddress = [addr.province, addr.city, addr.district, addr.detail].filter(Boolean).join(' ');
  } else {
    if (!body.shipName || !body.shipPhone || !body.shipAddress) {
      return fail(400, '请提供收件人姓名、电话和地址');
    }
    shipName = body.shipName;
    shipPhone = body.shipPhone;
    shipAddress = body.shipAddress;
    if (body.saveAddress) {
      const count = await prisma.address.count({ where: { userId: me.id } });
      const isDefault = body.saveAsDefault ?? count === 0;
      await prisma.$transaction(async (tx) => {
        if (isDefault) {
          await tx.address.updateMany({
            where: { userId: me.id, isDefault: true },
            data: { isDefault: false },
          });
        }
        await tx.address.create({
          data: {
            userId: me.id,
            name: shipName,
            phone: shipPhone,
            detail: shipAddress,
            isDefault,
          },
        });
      });
    }
  }

  await prisma.order.update({
    where: { id },
    data: { shipName, shipPhone, shipAddress },
  });
  return { ok: true };
});
