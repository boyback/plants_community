import { notFound } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import { serializeUser, serializePost } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';
import { getCurrentUser, isVipActive } from '@/lib/auth';
import { UserPageClient } from './UserPageClient';

export const dynamic = 'force-dynamic';

export default async function UserPage({ params }: { params: { id: string } }) {
  const uRaw = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });
  if (!uRaw) notFound();

  const user = serializeUser(uRaw);

  const [postsRaw, likedPostsRaw, collectedPostsRaw] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: user.id },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: postInclude(),
    }),
    prisma.post.findMany({
      where: { likes: { some: { userId: user.id } } },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: postInclude(),
    }),
    prisma.post.findMany({
      where: { collects: { some: { userId: user.id } } },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: postInclude(),
    }),
  ]);

  const me = await getCurrentUser();
  let followed = false;
  if (me && me.id !== user.id) {
    const f = await prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId: me.id, followeeId: user.id } },
    });
    followed = !!f;
  }

  const isVip = isVipActive(uRaw);
  const daysLeft =
    !uRaw.vipLifetime && uRaw.vipExpireAt
      ? Math.max(0, Math.ceil((uRaw.vipExpireAt.getTime() - Date.now()) / 86400_000))
      : null;

  return (
    <Shell>
      <UserPageClient
        user={user}
        isMe={me?.id === user.id}
        initialFollowed={followed}
        posts={postsRaw.map(serializePost)}
        likedPosts={likedPostsRaw.map(serializePost)}
        collectedPosts={collectedPostsRaw.map(serializePost)}
        exp={uRaw.exp}
        vip={{
          isVip,
          lifetime: uRaw.vipLifetime,
          expireAt: uRaw.vipExpireAt?.toISOString() ?? null,
        }}
        daysLeft={daysLeft}
      />
    </Shell>
  );
}
