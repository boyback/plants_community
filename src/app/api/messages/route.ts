import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeMessage } from '@/lib/serializers';
import { emitMessage } from '@/lib/realtime/notify';
import type { MessagePayload } from '@/lib/types';

export const dynamic = 'force-dynamic';

const Body = z.object({
  toId: z.string().min(1),
  text: z.string().min(1).max(2000),
  payload: z.object({
    type: z.literal('market_listing'),
    listingId: z.string().min(1),
  }).optional(),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());

  if (body.toId === me.id) return fail(400, '不能给自己发消息');
  const peer = await prisma.user.findUnique({ where: { id: body.toId }, select: { id: true } });
  if (!peer) return fail(404, '对方不存在');

  const payloadResult = body.payload ? await buildMessagePayload(body.payload, body.toId) : { payload: null };
  if ('error' in payloadResult) return fail(payloadResult.status, payloadResult.error);
  const payload = payloadResult.payload;

  const msg = await prisma.message.create({
    data: {
      fromId: me.id,
      toId: body.toId,
      text: body.text,
      payload: payload ? JSON.stringify(payload) : null,
    },
  });

  emitMessage(body.toId, {
    id: msg.id,
    fromId: me.id,
    toId: body.toId,
    text: body.text,
    payload,
    createdAt: msg.createdAt.toISOString(),
  });

  return serializeMessage(msg, me.id);
});

async function buildMessagePayload(
  payload: z.infer<typeof Body>['payload'],
  toId: string,
): Promise<
  | { payload: MessagePayload | null }
  | { status: number; error: string }
> {
  if (!payload) return { payload: null };

  const listing = await prisma.marketListing.findUnique({
    where: { id: payload.listingId },
    select: {
      id: true,
      title: true,
      cover: true,
      minPrice: true,
      maxPrice: true,
      status: true,
      sellerId: true,
    },
  });

  if (!listing) return { status: 404, error: '交易信息不存在' };
  if (listing.sellerId !== toId) return { status: 400, error: '只能把商品卡片发送给对应卖家' };

  return {
    payload: {
      type: 'market_listing' as const,
      listing: {
        id: listing.id,
        title: listing.title,
        cover: listing.cover,
        minPrice: listing.minPrice,
        maxPrice: listing.maxPrice,
        status: listing.status,
        href: `/market/${listing.id}`,
      },
    },
  };
}
