import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

/**
 * 查看「某用户的粉丝」。
 * 受 privacyShowFollowers 控制。
 */
export const GET = handler(async (req) => {
  const userId = pickId(req);
  const me = await getCurrentUser();

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      privacyShowFollowers: true,
      _count: { select: { followers: true } },
    },
  });
  if (!target) return fail(404, '用户不存在');

  const isMe = me?.id === target.id;
  if (!target.privacyShowFollowers && !isMe) {
    return fail(403, `${target.name} 设置了「隐藏粉丝列表」`);
  }

  const list = await prisma.follow.findMany({
    where: { followeeId: target.id },
    orderBy: { createdAt: 'desc' },
    include: {
      follower: {
        include: {
          _count: { select: { posts: true, followers: true, following: true } },
          badges: { include: { badge: true } },
        },
      },
    },
    take: 200,
  });

  return {
    total: target._count.followers,
    items: list.map((f) => serializeUser(f.follower)),
  };
});
