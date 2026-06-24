import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, stringifyJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { hasUserPermission } from '@/lib/permissions';
import { processRichInput } from '@/lib/richtext';
import { serializeAuction } from '@/lib/serializers';
import { auctionInclude } from '@/lib/auction-include';
import { advanceAuctionState } from '@/lib/auction';
import { AuctionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

// 列表
export const GET = handler(async (req) => {
  await advanceAuctionState();

  const url = new URL(req.url);
  const status = url.searchParams.get('status'); // 缺省 = 不限
  const sellerId = url.searchParams.get('seller') ?? undefined;
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '24'), 100);
  const cursor = url.searchParams.get('cursor') ?? undefined;

  const where: Record<string, unknown> = {};
  // 仅当显式传 status 时才过滤;按 seller 查时(我的拍卖)默认不过滤,展示全部
  if (status === 'live') where.status = AuctionStatus.live;
  else if (status === 'scheduled') where.status = AuctionStatus.scheduled;
  else if (status === 'finished') where.status = AuctionStatus.finished;
  else if (!sellerId) where.status = AuctionStatus.live; // 没传 status 也没传 seller 时,默认 live
  if (sellerId) where.sellerId = sellerId;

  const orderBy =
    status === 'live'
      ? [{ endAt: 'asc' as const }]
      : status === 'scheduled'
      ? [{ startAt: 'asc' as const }]
      : [{ updatedAt: 'desc' as const }];

  const list = await prisma.auction.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: auctionInclude(),
  });
  let nextCursor: string | null = null;
  if (list.length > limit) nextCursor = list.pop()!.id;
  return { items: list.map(serializeAuction), nextCursor };
});

// 创建
const CreateBody = z.object({
  title: z.string().min(2).max(80),
  description: z.string().optional(),
  descriptionJson: z.unknown().optional(),
  category: z.string().min(1),
  cover: z.string(),
  images: z.array(z.string()).max(9).optional(),
  tags: z.array(z.string()).max(6).optional(),

  startPrice: z.number().int().min(100),       // ≥ 1 元
  minIncrement: z.number().int().min(100).optional(),
  buyNowPrice: z.number().int().min(100).optional(),
  reservePrice: z.number().int().min(0).optional(),
  depositAmount: z.number().int().min(100),    // ≥ 1 元

  startAt: z.string(),
  endAt: z.string(),
  antiSnipeMinutes: z.number().int().min(0).max(30).optional(),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  if (!(await hasUserPermission(me, 'market:sell'))) {
    return fail(403, '当前等级不允许发布拍卖,Lv.8 起可发布');
  }
  const body = CreateBody.parse(await req.json());

  const startAt = new Date(body.startAt);
  const endAt = new Date(body.endAt);
  if (!(startAt < endAt)) return fail(400, '结束时间必须晚于开始时间');
  if (endAt.getTime() - startAt.getTime() < 5 * 60 * 1000)
    return fail(400, '拍卖时长至少 5 分钟');

  if (body.buyNowPrice && body.buyNowPrice <= body.startPrice)
    return fail(400, '一口价必须大于起拍价');
  if (body.reservePrice && body.reservePrice < body.startPrice)
    return fail(400, '保留价不能低于起拍价');

  const stored = processRichInput({
    json: body.descriptionJson,
    html: body.description,
    textMaxLen: 1000,
  });
  if (!stored.text) return fail(400, '请填写拍卖描述');

  const created = await prisma.auction.create({
    data: {
      sellerId: me.id,
      title: body.title,
      cover: body.cover,
      images: stringifyJson(body.images ?? [body.cover]),
      description: stored.html,
      descriptionJson: stored.json || null,
      descriptionText: stored.text,
      category: body.category,
      tags: stringifyJson(body.tags ?? []),
      startPrice: body.startPrice,
      minIncrement: body.minIncrement ?? 100,
      buyNowPrice: body.buyNowPrice ?? null,
      reservePrice: body.reservePrice ?? null,
      depositAmount: body.depositAmount,
      startAt,
      endAt,
      antiSnipeMinutes: body.antiSnipeMinutes ?? 5,
      currentPrice: body.startPrice,
      // 立即开始时直接 live
      status: startAt.getTime() <= Date.now() ? AuctionStatus.live : AuctionStatus.scheduled,
    },
    include: auctionInclude(),
  });

  return serializeAuction(created);
});
