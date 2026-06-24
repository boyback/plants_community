import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { prisma } from '@/lib/db';
import { serializeBadge, serializeUser, serializePost, serializeSkin } from '@/lib/serializers';
import { postInclude } from "@/lib/post-include";
import { getCurrentUser } from '@/lib/auth';
import { withUserPendants } from '@/lib/user-pendants';
import { UserPageClient } from './UserPageClient';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

export default async function UserPage({
  params,
  searchParams



}: {params: {id: string;};searchParams?: {tab?: string;};}) {
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
      badges: { include: { badge: true } }
    }
  });
  if (!uRaw) notFound();

  const user = serializeUser(uRaw);
  if (uRaw.equipPendantId) {
    const pendant = await prisma.skinItem.findUnique({ where: { id: uRaw.equipPendantId } });
    if (pendant) user.equip = { ...(user.equip ?? {}), pendant: serializeSkin(pendant) };
  }

  const allBadgesRaw = await prisma.badge.findMany({
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }]
  });
  const badgeState = new Map(uRaw.badges?.map((ub) => [ub.badgeId, ub.obtained]) ?? []);
  user.badges = allBadgesRaw.map((badge) => serializeBadge(badge, badgeState.get(badge.id) ?? false));

  const me = await getCurrentUser();

  const [postsRaw, likedItemsRaw, collectedItemsRaw, commentsRaw, marketProductsRaw] = await Promise.all([
  prisma.post.findMany({
    where: { authorId: user.id },
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: postInclude()
  }),
  Promise.all([
    prisma.postLike.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { post: { include: postInclude() } }
    }),
    prisma.journalEntryLike.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        journalEntry: {
          include: {
            _count: { select: { likes: true } },
            journal: {
              select: {
                postId: true,
                post: {
                  select: {
                    id: true,
                    title: true,
                    contentText: true,
                    author: { select: { id: true, name: true, avatar: true, equipPendantId: true } }
                  }
                }
              }
            }
          }
        }
      }
    }),
    prisma.albumLike.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        album: {
          select: {
            id: true,
            title: true,
            cover: true,
            likeCount: true,
            imageCount: true,
            createdAt: true,
            user: { select: { id: true, name: true, avatar: true, equipPendantId: true } }
          }
        }
      }
    })
  ]).then(([postLikes, journalLikes, albumLikes]) => [
    ...postLikes.map((item) => ({
      type: 'post' as const,
      likedAt: item.createdAt.toISOString(),
      post: serializePost(item.post, undefined, undefined, me)
    })),
    ...journalLikes.map((item) => ({
      type: 'journal' as const,
      likedAt: item.createdAt.toISOString(),
      journal: {
        id: item.journalEntry.id,
        stage: item.journalEntry.stage,
        stageLabel: item.journalEntry.stageLabel,
        note: item.journalEntry.note,
        images: item.journalEntry.images,
        likes: item.journalEntry._count?.likes ?? 0,
        postId: item.journalEntry.journal.postId,
        postTitle: item.journalEntry.journal.post.title || item.journalEntry.journal.post.contentText || '无标题帖子',
      }
    })),
    ...albumLikes.map((item) => ({
      type: 'album' as const,
      likedAt: item.createdAt.toISOString(),
      album: {
        id: item.album.id,
        title: item.album.title,
        cover: item.album.cover,
        likeCount: item.album.likeCount,
        imageCount: item.album.imageCount,
        createdAt: item.album.createdAt.toISOString(),
        user: item.album.user
      }
    })),
  ].sort((a, b) => new Date(b.likedAt).getTime() - new Date(a.likedAt).getTime())),
  Promise.all([
    prisma.postCollect.findMany({
      where: { userId: user.id },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { post: { include: postInclude() } }
    }),
    prisma.marketListingItemCollect.findMany({
      where: { userId: user.id },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        item: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                shipFrom: true,
                status: true
              }
            }
          }
        }
      }
    }),
    prisma.speciesCollect.findMany({
      where: { userId: user.id },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        species: {
          include: {
            genus: { include: { board: true } },
            _count: { select: { collects: true, posts: true } }
          }
        }
      }
    })
  ]).then(([postCollects, marketItemCollects, speciesCollects]) => [
    ...postCollects.map((item) => ({
      type: 'post' as const,
      collectedAt: item.createdAt.toISOString(),
      post: serializePost(item.post, undefined, undefined, me)
    })),
    ...marketItemCollects.map((item) => ({
      type: 'marketItem' as const,
      collectedAt: item.createdAt.toISOString(),
      marketItem: {
        id: item.item.id,
        listingId: item.item.listingId,
        title: item.item.title || item.item.listing.title,
        description: item.item.description,
        cover: item.item.cover,
        price: item.item.price,
        stock: item.item.stock,
        soldCount: item.item.soldCount,
        collectCount: item.item.collectCount,
        status: item.item.status,
        listing: item.item.listing
      }
    })),
    ...speciesCollects.map((item) => ({
      type: 'species' as const,
      collectedAt: item.createdAt.toISOString(),
      species: {
        id: item.species.id,
        slug: item.species.slug,
        name: item.species.name,
        latinName: item.species.latinName,
        cover: item.species.cover,
        difficulty: item.species.difficulty,
        genusSlug: item.species.genus.slug,
        genusName: item.species.genus.name,
        boardSlug: item.species.genus.board?.slug ?? null,
        boardName: item.species.genus.board?.name ?? null,
        collectCount: item.species._count.collects,
        postCount: item.species._count.posts
      }
    }))
  ].sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())),
  prisma.comment.findMany({
    where: {
      authorId: user.id,
      deleted: false,
      post: {
        deleted: false,
        reviewStatus: 'published'
      }
    },
    take: 80,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      content: true,
      contentText: true,
      likes: true,
      createdAt: true,
      parentId: true,
      parent: {
        select: {
          id: true,
          content: true,
          contentText: true,
          deleted: true,
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              equipPendantId: true,
              level: true
            }
          },
          parent: {
            select: {
              id: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                  equipPendantId: true,
                  level: true
                }
              }
            }
          }
        }
      },
      post: {
        select: {
          id: true,
          title: true,
          contentText: true
        }
      }
    }
  }),
  prisma.marketListingItem.findMany({
    where: {
      status: { not: 'off_shelf' },
      listing: {
        sellerId: user.id,
        status: { in: ['on_sale', 'trading', 'sold_out'] }
      }
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
            select: { categorySlug: true, genusSlug: true, speciesSlug: true, label: true }
          }
        }
      }
    }
  })]
  );
  let followed = false;
  if (me && me.id !== user.id) {
    const f = await prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId: me.id, followeeId: user.id } }
    });
    followed = !!f;
  }

  const posts = await withUserPendants(
    postsRaw.map((p: any) => serializePost(p, undefined, undefined, me)),
    postsRaw
  );
  const comments = await withUserPendants(commentsRaw.map((comment) => ({
    id: comment.id,
    content: comment.content,
    contentText: comment.contentText,
    likes: comment.likes,
    createdAt: comment.createdAt.toISOString(),
    parentId: comment.parentId,
    parent: comment.parent ? {
      id: comment.parent.id,
      content: comment.parent.content,
      contentText: comment.parent.contentText,
      deleted: comment.parent.deleted,
      author: {
        id: comment.parent.author.id,
        name: comment.parent.author.name,
        avatar: comment.parent.author.avatar,
        equipPendantId: comment.parent.author.equipPendantId,
        level: comment.parent.author.level
      },
      parent: comment.parent.parent ? {
        id: comment.parent.parent.id,
        author: {
          id: comment.parent.parent.author.id,
          name: comment.parent.parent.author.name,
          avatar: comment.parent.parent.author.avatar,
          equipPendantId: comment.parent.parent.author.equipPendantId,
          level: comment.parent.parent.author.level
        }
      } : null
    } : null,
    post: {
      id: comment.post.id,
      title: comment.post.title,
      contentText: comment.post.contentText
    }
  })), commentsRaw);
  const likedItems = await withUserPendants(likedItemsRaw, likedItemsRaw);
  const collectedItems = await withUserPendants(collectedItemsRaw, collectedItemsRaw);

  return (
    <AppShell showFloatingAi={false} className={cx(styles.r_d14dc4ed, styles.r_173fa8f0)}>
      <UserPageClient
        user={user}
        isMe={me?.id === user.id}
        initialFollowed={followed}
        posts={posts}
        likedItems={likedItems}
        collectedItems={collectedItems}
        comments={comments}
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
            taxons: item.listing.taxons
          };
        })}
        exp={uRaw.exp} />

    </AppShell>);

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
