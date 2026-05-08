import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const Body = z.object({
  kind: z.enum(['bubble', 'reaction', 'sticker', 'pendant']),
  skinId: z.string().nullable(), // null 表示卸下
});

const FIELD = {
  bubble: 'equipBubbleId',
  reaction: 'equipReactionId',
  sticker: 'equipStickerId',
  pendant: 'equipPendantId',
} as const;

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());

  if (body.skinId) {
    const skin = await prisma.skinItem.findUnique({ where: { id: body.skinId } });
    if (!skin) return fail(404, '皮肤不存在');
    if (skin.kind !== body.kind) return fail(400, '皮肤类型不匹配');
    const owned = await prisma.userSkin.findUnique({
      where: { userId_skinId: { userId: me.id, skinId: body.skinId } },
    });
    if (!owned) return fail(403, '尚未拥有该皮肤');
  }

  await prisma.user.update({
    where: { id: me.id },
    data: { [FIELD[body.kind]]: body.skinId },
  });

  return { ok: true };
});
