import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { prisma } from '@/lib/db';
import { serializeUser, serializePost } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';
import { getCurrentUser } from '@/lib/auth';
import { isVipActive } from '@/lib/vip';
import { UserPageClient } from './UserPageClient';

export const dynamic = 'force-dynamic';

export default async function UserPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { tab?: string };
}) {
  if (params.id === 'me') {
    const me = await getCurrentUser();
    if (!me) redirect('/login?redirect=/user/me');
    const tab = searchParams?.tab ? `?tab=${encodeURIComponent(searchParams.tab)}` : '';
    redirect(`/user/${me.id}${tab}`);
  }

  const uRaw = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });
  if (!uRaw) notFound();

  const user = serializeUser(uRaw);

  const [postsRaw, likedPostsRaw, collectedPostsRaw, commentsRaw, marketProductsRaw] = await Promise.all([
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
    prisma.comment.findMany({
      where: {
        authorId: user.id,
        deleted: false,
        post: {
          deleted: false,
          reviewStatus: 'published',
        },
      },
      take: 80,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        contentText: true,
        likes: true,
        createdAt: true,
        post: {
          select: {
            id: true,
            title: true,
            contentText: true,
          },
        },
      },
    }),
    prisma.marketListingItem.findMany({
      where: {
        status: { not: 'off_shelf' },
        listing: {
          sellerId: user.id,
          status: { in: ['on_sale', 'sold_out'] },
        },
      },
      take: 80,
      orderBy: { createdAt: 'desc' },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            shipFrom: true,
            status: true,
            viewCount: true,
            commentCount: true,
            taxons: {
              orderBy: { id: 'asc' },
              select: { categorySlug: true, genusSlug: true, speciesSlug: true, label: true },
            },
          },
        },
      },
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
    <AppShell showFloatingAi={false} className="!max-w-[1280px] pt-4">
      <UserPageClient
        user={user}
        isMe={me?.id === user.id}
        initialFollowed={followed}
        posts={postsRaw.map((p: any) => serializePost(p, undefined, undefined, me))}
        likedPosts={likedPostsRaw.map((p: any) => serializePost(p, undefined, undefined, me))}
        collectedPosts={collectedPostsRaw.map((p: any) => serializePost(p, undefined, undefined, me))}
        comments={commentsRaw.map((comment) => ({
          id: comment.id,
          content: comment.content,
          contentText: comment.contentText,
          likes: comment.likes,
          createdAt: comment.createdAt.toISOString(),
          post: {
            id: comment.post.id,
            title: comment.post.title,
            contentText: comment.post.contentText,
          },
        }))}
        products={marketProductsRaw.map((item) => {
          const images = parseJsonArray(item.images);
          return {
            id: item.id,
            listingId: item.listingId,
            title: item.title || item.listing.title,
            description: item.description,
            cover: item.cover,
            images: images.length ? images : [item.cover],
            price: item.price,
            stock: item.stock,
            status: item.status,
            listingStatus: item.listing.status,
            createdAt: item.createdAt.toISOString(),
            url: `/market/${item.listingId}?item=${item.id}`,
            shipFrom: item.listing.shipFrom,
            views: item.listing.viewCount,
            comments: item.listing.commentCount,
            taxons: item.listing.taxons,
          };
        })}
        exp={uRaw.exp}
        vip={{
          isVip,
          lifetime: uRaw.vipLifetime,
          expireAt: uRaw.vipExpireAt?.toISOString() ?? null,
        }}
        daysLeft={daysLeft}
      />
    </AppShell>
  );
}

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
