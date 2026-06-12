import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const me = await requireUser();
  const list = await prisma.draft.findMany({
    where: { userId: me.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  return list.map((d) => ({
    id: d.id,
    title: d.title,
    type: d.type,
    savedAt: d.updatedAt.toISOString(),
    payload: safeParse(d.payload),
  }));
});

const Body = z.object({
  id: z.string().optional(),
  title: z.string().default(''),
  type: z.enum(['rich', 'image', 'short', 'vote', 'video', 'event', 'help', 'journal']),
  payload: z.unknown(),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());
  const payloadStr = JSON.stringify(body.payload ?? {});

  if (body.id) {
    const owner = await prisma.draft.findUnique({ where: { id: body.id }, select: { userId: true } });
    if (owner && owner.userId === me.id) {
      const d = await prisma.draft.update({
        where: { id: body.id },
        data: { title: body.title, type: body.type, payload: payloadStr },
      });
      return { id: d.id, savedAt: d.updatedAt.toISOString() };
    }
  }

  const d = await prisma.draft.create({
    data: {
      userId: me.id,
      title: body.title,
      type: body.type,
      payload: payloadStr,
    },
  });
  return { id: d.id, savedAt: d.updatedAt.toISOString() };
});

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
