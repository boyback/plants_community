import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

/**
 * 会话列表:按对话者分组,取最近一条作为会话的 lastMessage。
 * unread = 对方发给我、我未读的消息数。
 */
export const GET = handler(async () => {
  const me = await requireUser();

  // 拉出与 me 相关的所有消息 + 对话者,按时间倒序
  const messages = await prisma.message.findMany({
    where: { OR: [{ fromId: me.id }, { toId: me.id }] },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const peerLatest = new Map<string, (typeof messages)[number]>();
  const peerUnread = new Map<string, number>();

  for (const m of messages) {
    const peer = m.fromId === me.id ? m.toId : m.fromId;
    if (!peerLatest.has(peer)) peerLatest.set(peer, m);
    if (m.toId === me.id && !m.readAt) {
      peerUnread.set(peer, (peerUnread.get(peer) ?? 0) + 1);
    }
  }

  const peerIds = [...peerLatest.keys()];
  const peers = await prisma.user.findMany({
    where: { id: { in: peerIds } },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });
  const peerMap = new Map(peers.map((u) => [u.id, u]));

  const list = peerIds
    .map((id) => {
      const u = peerMap.get(id);
      const last = peerLatest.get(id);
      if (!u || !last) return null;
      return {
        id: [me.id, id].sort().join('_'),
        user: serializeUser(u),
        lastMessage: last.text,
        lastAt: last.createdAt.toISOString(),
        unread: peerUnread.get(id) ?? 0,
        messages: [],
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  return list;
});
