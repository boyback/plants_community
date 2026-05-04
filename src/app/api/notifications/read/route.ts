import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const Body = z.object({
  ids: z.array(z.string()).optional(), // 不填则全部标记已读
  all: z.boolean().optional(),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json().catch(() => ({})));

  if (body.all || !body.ids) {
    await prisma.notification.updateMany({
      where: { recipientId: me.id, read: false },
      data: { read: true },
    });
  } else if (body.ids.length > 0) {
    await prisma.notification.updateMany({
      where: {
        recipientId: me.id,
        id: { in: body.ids },
      },
      data: { read: true },
    });
  }

  const unread = await prisma.notification.count({
    where: { recipientId: me.id, read: false },
  });
  return { unread };
});
