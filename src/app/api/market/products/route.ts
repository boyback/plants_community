import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, stringifyJson } from '@/lib/api';
import { requireUser, isVipActive } from '@/lib/auth';
import { serializeProduct } from '@/lib/serializers';
import { productInclude } from '@/lib/market-include';
import { hasPermission } from '@/lib/levels';
import { processRichInput } from '@/lib/richtext';
import type { ProductSource, ProductStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// 列表(支持 source / category / 排序 / 关键词)
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const source = url.searchParams.get('source') as ProductSource | null;
  const category = url.searchParams.get('category') ?? undefined;
  const q = url.searchParams.get('q') ?? undefined;
  const sort = url.searchParams.get('sort') ?? 'latest'; // latest | price_asc | price_desc | hot
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '24'), 100);
  const cursor = url.searchParams.get('cursor') ?? undefined;

  const orderBy =
    sort === 'price_asc'  ? [{ price: 'asc'  as const }] :
    sort === 'price_desc' ? [{ price: 'desc' as const }] :
    sort === 'hot'        ? [{ orders: { _count: 'desc' as const } }, { createdAt: 'desc' as const }] :
                            [{ createdAt: 'desc' as const }];

  const where = {
    status: { in: ['on_sale', 'sold_out'] as ProductStatus[] },
    ...(source ? { source } : {}),
    ...(category ? { category } : {}),
    ...(q ? { title: { contains: q } } : {}),
  };

  const list = await prisma.product.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: productInclude(),
  });

  let nextCursor: string | null = null;
  if (list.length > limit) {
    const next = list.pop()!;
    nextCursor = next.id;
  }
  return { items: list.map(serializeProduct), nextCursor };
});

// C2C 发布(需要 market:sell 权限)
const CreateBody = z.object({
  title: z.string().min(2).max(80),
  // 商品描述富文本:descriptionJson 权威 / description 兜底
  description: z.string().optional(),
  descriptionJson: z.unknown().optional(),
  category: z.string().min(1),
  price: z.number().int().min(1),       // 单位:分
  originalPrice: z.number().int().optional(),
  cover: z.string(),
  images: z.array(z.string()).max(9).optional(),
  tags: z.array(z.string()).max(6).optional(),
  shipFrom: z.string().optional(),
  pointsBack: z.number().int().min(0).max(99999).optional(),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const isVip = isVipActive(me);
  if (!hasPermission({ level: me.level, isVip }, 'market:sell')) {
    return fail(403, '当前等级不允许在交易区出售,开通大会员或升级到 Lv.8 即可解锁');
  }
  const body = CreateBody.parse(await req.json());

  const stored = processRichInput({
    json: body.descriptionJson,
    html: body.description,
    textMaxLen: 1000,
  });
  if (!stored.text) return fail(400, '商品描述不能为空');

  const product = await prisma.product.create({
    data: {
      source: 'c2c',
      title: body.title,
      description: stored.html,
      descriptionJson: stored.json || null,
      descriptionText: stored.text,
      category: body.category,
      cover: body.cover,
      images: stringifyJson(body.images ?? [body.cover]),
      tags: stringifyJson(body.tags ?? []),
      price: body.price,
      originalPrice: body.originalPrice ?? null,
      stock: 1,
      pointsBack: body.pointsBack ?? Math.round(body.price * 0.05) / 10, // 5% 回积分(粗略)
      shipFrom: body.shipFrom,
      sellerId: me.id,
      status: 'on_sale',
    },
    include: productInclude(),
  });
  return serializeProduct(product);
});
