import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { hasUserPermission } from '@/lib/permissions';
import { genOrderNo } from '@/lib/auction';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2]; // /api/market/products/[id]/buy
}

/**
 * 三种模式接受地址:
 *   1. addressId  →  从用户地址簿读
 *   2. saveAddress + 字段 →  下单同时新增到地址簿(可选标记为默认)
 *   3. 仅传字段(不传 addressId / saveAddress) → 临时填写,不入地址簿
 */
const Body = z.object({
  quantity: z.number().int().min(1).max(9999).default(1),
  // 模式 1
  addressId: z.string().optional(),
  // 模式 2 / 3
  shipName: z.string().min(1).max(40).optional(),
  shipPhone: z.string().min(1).max(20).optional(),
  shipAddress: z.string().min(2).max(200).optional(),
  // 模式 2 标记
  saveAddress: z.boolean().optional(),
  saveAsDefault: z.boolean().optional(),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  if (!(await hasUserPermission(me, 'market:buy'))) {
    return fail(403, '需要 Lv.5 以上才能购买');
  }

  const productId = pickId(req);
  const body = Body.parse(await req.json());

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return fail(404, '商品不存在');
  if (product.status !== 'on_sale') return fail(400, '商品当前不可购买');
  if (product.stock < body.quantity) return fail(400, '库存不足');
  if (product.sellerId === me.id) return fail(400, '不能购买自己的商品');

  // 解析收件地址
  let shipName: string;
  let shipPhone: string;
  let shipAddress: string;

  if (body.addressId) {
    const addr = await prisma.address.findUnique({ where: { id: body.addressId } });
    if (!addr) return fail(404, '收件地址不存在');
    if (addr.userId !== me.id) return fail(403, '收件地址无权使用');
    shipName = addr.name;
    shipPhone = addr.phone;
    shipAddress = composeAddress(addr);
  } else {
    if (!body.shipName || !body.shipPhone || !body.shipAddress) {
      return fail(400, '请提供收件人姓名、电话和地址');
    }
    shipName = body.shipName;
    shipPhone = body.shipPhone;
    shipAddress = body.shipAddress;

    // 模式 2:同时入地址簿
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

  const totalPrice = product.price * body.quantity;
  const pointsBackTotal = product.pointsBack * body.quantity;

  const order = await prisma.order.create({
    data: {
      orderNo: genOrderNo(),
      source: 'product',
      productId: product.id,
      buyerId: me.id,
      sellerId: product.sellerId,
      quantity: body.quantity,
      unitPrice: product.price,
      totalPrice,
      pointsBackTotal,
      status: 'pending_payment',
      shipName,
      shipPhone,
      shipAddress,
    },
  });

  return { orderId: order.id, orderNo: order.orderNo, totalPrice };
});

function composeAddress(a: {
  province: string | null;
  city: string | null;
  district: string | null;
  detail: string;
}) {
  const parts = [a.province, a.city, a.district, a.detail].filter(Boolean);
  return parts.join(' ');
}
