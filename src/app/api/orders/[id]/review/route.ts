import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { processRichInput } from '@/lib/richtext';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

const Body = z.object({
  rating: z.number().int().min(1).max(5),
  // 评价富文本:textJson 权威 / text 兜底
  text: z.string().optional(),
  textJson: z.unknown().optional(),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const body = Body.parse(await req.json());
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return fail(404, '订单不存在');
  if (order.buyerId !== me.id) return fail(403, '只有买家能评价');
  if (order.status !== 'pending_review') return fail(400, '当前状态不允许评价');

  const stored = processRichInput({
    json: body.textJson,
    html: body.text,
    textMaxLen: 500,
  });
  if (!stored.text) return fail(400, '评价内容不能为空');

  await prisma.order.update({
    where: { id },
    data: {
      status: 'completed',
      reviewRating: body.rating,
      reviewText: stored.html,
      reviewTextJson: stored.json || null,
      reviewTextPlain: stored.text,
      reviewedAt: new Date(),
    },
  });
  return { ok: true };
});
