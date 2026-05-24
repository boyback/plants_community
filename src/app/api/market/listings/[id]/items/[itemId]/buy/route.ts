import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { hasUserPermission } from '@/lib/permissions';
import { genOrderNo } from '@/lib/auction';
import type { MarketTradeMode } from '@prisma/client';

export const dynamic = 'force-dynamic';

const Body = z.object({
  quantity: z.number().int().min(1).max(9999).default(1),
  tradeMode: z.enum(['platform_escrow', 'online_payment', 'external']).optional(),
  addressId: z.string().optional(),
  shipName: z.string().min(1).max(40).optional(),
  shipPhone: z.string().min(1).max(20).optional(),
  shipAddress: z.string().min(2).max(200).optional(),
  saveAddress: z.boolean().optional(),
  saveAsDefault: z.boolean().optional(),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  if (!(await hasUserPermission(me, 'market:buy'))) {
    return fail(403, '需要 Lv.5 以上才能购买，或开通会员');
  }

  const params = pickParams(req);
  const listingId = params.id;
  const itemId = params.itemId;
  if (!listingId || !itemId) return fail(400, '参数错误');

  const body = Body.parse(await req.json());
  const item = await prisma.marketListingItem.findUnique({
    where: { id: itemId },
    include: { listing: true },
  });

  if (!item || item.listingId !== listingId) return fail(404, '商品不存在');
  if (item.listing.status !== 'on_sale') return fail(400, '交易帖当前不可购买');
  const allowedTradeModes = await loadListingTradeModes(item.listingId, item.listing.tradeMode);
  const selectedTradeMode = body.tradeMode ?? allowedTradeModes.find((mode) => mode !== 'external') ?? allowedTradeModes[0];
  if (!allowedTradeModes.includes(selectedTradeMode)) return fail(400, '请选择卖家支持的交易方式');
  if (selectedTradeMode === 'external') return fail(400, '该交易方式为自行联系/三方平台交易，不能在线下单');
  if (item.status !== 'on_sale') return fail(400, '商品当前不可购买');
  if (item.stock < body.quantity) return fail(400, '库存不足');
  if (item.listing.sellerId === me.id) return fail(400, '不能购买自己的商品');

  const address = await resolveAddress(me.id, body);
  if ('error' in address) return fail(address.status, address.error);

  const totalPrice = item.price * body.quantity;
  const platformFee = selectedTradeMode === 'online_payment'
    ? Math.ceil(totalPrice * 0.01)
    : 0;
  const sellerAmount = totalPrice - platformFee;

  const order = await prisma.order.create({
    data: {
      orderNo: genOrderNo(),
      source: 'product',
      listingId: item.listingId,
      listingItemId: item.id,
      tradeMode: selectedTradeMode,
      buyerId: me.id,
      sellerId: item.listing.sellerId,
      quantity: body.quantity,
      unitPrice: item.price,
      totalPrice,
      platformFee,
      sellerAmount,
      pointsBackTotal: 0,
      status: 'pending_payment',
      shipName: address.shipName,
      shipPhone: address.shipPhone,
      shipAddress: address.shipAddress,
    },
  });

  return { orderId: order.id, orderNo: order.orderNo, totalPrice };
});

async function loadListingTradeModes(id: string, fallback: MarketTradeMode): Promise<MarketTradeMode[]> {
  try {
    const rows = await prisma.$queryRaw<Array<{ tradeModes: string | null }>>`
      SELECT tradeModes FROM market_listings WHERE id = ${id}
    `;
    return normalizeTradeModes(parseJsonArray(rows[0]?.tradeModes) as MarketTradeMode[], fallback);
  } catch {
    return [fallback];
  }
}

function normalizeTradeModes(modes: MarketTradeMode[] | undefined, fallback: MarketTradeMode): MarketTradeMode[] {
  const allowed: MarketTradeMode[] = ['platform_escrow', 'online_payment', 'external'];
  const result = Array.from(new Set((modes?.length ? modes : [fallback]).filter((mode) => allowed.includes(mode))));
  return result.length ? result : [fallback];
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function pickParams(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const itemIndex = parts.indexOf('items');
  return {
    id: itemIndex > 0 ? parts[itemIndex - 1] : undefined,
    itemId: itemIndex >= 0 ? parts[itemIndex + 1] : undefined,
  };
}

async function resolveAddress(
  userId: string,
  body: z.infer<typeof Body>,
): Promise<
  | { shipName: string; shipPhone: string; shipAddress: string }
  | { status: number; error: string }
> {
  if (body.addressId) {
    const addr = await prisma.address.findUnique({ where: { id: body.addressId } });
    if (!addr) return { status: 404, error: '收货地址不存在' };
    if (addr.userId !== userId) return { status: 403, error: '收货地址无权使用' };
    return {
      shipName: addr.name,
      shipPhone: addr.phone,
      shipAddress: [addr.province, addr.city, addr.district, addr.detail].filter(Boolean).join(' '),
    };
  }

  if (!body.shipName || !body.shipPhone || !body.shipAddress) {
    return { status: 400, error: '请提供收货人姓名、电话和地址' };
  }

  if (body.saveAddress) {
    const count = await prisma.address.count({ where: { userId } });
    const isDefault = body.saveAsDefault ?? count === 0;
    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }
      await tx.address.create({
        data: {
          userId,
          name: body.shipName!,
          phone: body.shipPhone!,
          detail: body.shipAddress!,
          isDefault,
        },
      });
    });
  }

  return {
    shipName: body.shipName,
    shipPhone: body.shipPhone,
    shipAddress: body.shipAddress,
  };
}
