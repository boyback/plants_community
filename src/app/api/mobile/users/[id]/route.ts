import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { isVipActive } from '@/lib/vip';
import { serializePost, serializeUser } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  return new URL(req.url).pathname.split('/').filter(Boolean).at(-1)!;
}

export const GET = handler(async (req) => {
  const id = pickId(req);
  const [raw, me] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    }),
    getCurrentUser().catch(() => null),
  ]);

  if (!raw) return fail(404, '用户不存在');

  const [posts, followed] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: id, deleted: false },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: postInclude(),
    }),
    me && me.id !== id
      ? prisma.follow.findUnique({
          where: { followerId_followeeId: { followerId: me.id, followeeId: id } },
        })
      : Promise.resolve(null),
  ]);

  return {
    user: serializeUser(raw),
    isMe: me?.id === id,
    followed: Boolean(followed),
    exp: raw.exp,
    vip: {
      isVip: isVipActive(raw),
      lifetime: raw.vipLifetime,
      expireAt: raw.vipExpireAt?.toISOString() ?? null,
    },
    posts: posts.map((post) => serializePost(post as any, undefined, undefined, me)),
  };
});
