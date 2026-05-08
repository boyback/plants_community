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
 * 查看「某用户关注了哪些人」。
 * 受 privacyShowFollowing 控制:若被查看者关闭此开关,则 返回 403 + reason,除非自己查自己。
 */
export const GET = handler(async (req) => {
  const userId = pickId(req);
  const me = await getCurrentUser();

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      privacyShowFollowing: true,
      _count: { select: { following: true } },
    },
  });
  if (!target) return fail(404, '用户不存在');

  const isMe = me?.id === target.id;
  if (!target.privacyShowFollowing && !isMe) {
    return fail(403, `${target.name} 设置了「隐藏关注列表」`);
  }

  const list = await prisma.follow.findMany({
    where: { followerId: target.id },
    orderBy: { createdAt: 'desc' },
    include: {
      followee: {
        include: {
          _count: { select: { posts: true, followers: true, following: true } },
          badges: { include: { badge: true } },
        },
      },
    },
    take: 200,
  });

  return {
    total: target._count.following,
    items: list.map((f) => serializeUser(f.followee)),
  };
});
