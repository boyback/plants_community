import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeMessage } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

const Body = z.object({
  toId: z.string().min(1),
  text: z.string().min(1).max(2000),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());

  if (body.toId === me.id) return fail(400, '不能给自己发消息');
  const peer = await prisma.user.findUnique({ where: { id: body.toId }, select: { id: true } });
  if (!peer) return fail(404, '对方不存在');

  const msg = await prisma.message.create({
    data: {
      fromId: me.id,
      toId: body.toId,
      text: body.text,
    },
  });

  return serializeMessage(msg, me.id);
});
