import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeNotification } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const me = await requireUser();
  const list = await prisma.notification.findMany({
    where: { recipientId: me.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      from: {
        include: {
          _count: { select: { posts: true, followers: true, following: true } },
          badges: { include: { badge: true } },
        },
      },
    },
  });
  const unread = list.filter((n) => !n.read).length;
  return {
    items: list.map(serializeNotification),
    unread,
  };
});
