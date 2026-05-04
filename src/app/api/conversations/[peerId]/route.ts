import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeMessage, serializeUser } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

function pickPeerId(req: Request) {
  const url = new URL(req.url);
  return url.pathname.split('/').filter(Boolean).pop()!;
}

export const GET = handler(async (req) => {
  const me = await requireUser();
  const peerId = pickPeerId(req);

  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });
  if (!peer) return fail(404, '对方不存在');

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { fromId: me.id, toId: peer.id },
        { fromId: peer.id, toId: me.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  // 标记对方发给我的为已读
  await prisma.message.updateMany({
    where: { fromId: peer.id, toId: me.id, readAt: null },
    data: { readAt: new Date() },
  });

  return {
    user: serializeUser(peer),
    messages: messages.map((m) => serializeMessage(m, me.id)),
  };
});
