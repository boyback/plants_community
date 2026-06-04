import { HomeDashboard } from '@/components/home/HomeDashboard';
import { prisma } from '@/lib/db';
import { postInclude } from '@/lib/post-include';
import { serializePost, serializeSkin, serializeUser } from '@/lib/serializers';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';
import type { BannerItem } from '@/lib/types';
import { jsonLdScript, websiteJsonLd, organizationJsonLd } from '@/lib/jsonld';
import { getCurrentUser } from '@/lib/auth';
import { sortPostsForPins } from '@/lib/post-pins';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [
    postsRaw,
    bannersRaw,
    recommendUsersRaw,
    topicsRaw,
    eventsRaw,
    speciesCount,
    marketCount,
    journalCount,
    postCount,
    remindersRaw,
    selectionRaw,
    me,
  ] = await Promise.all([
    prisma.post.findMany({
      where: {
        deleted: false,
        ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
      },
      orderBy: [{ hotScore: 'desc' }, { createdAt: 'desc' }],
      take: 20,
      include: postInclude(),
    }),
    prisma.banner.findMany({
      where: { enabled: true },
      orderBy: { orderIdx: 'asc' },
    }),
    prisma.user.findMany({
      take: 8,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    }),
    prisma.topicRanking.findMany({
      orderBy: [{ recent30dCount: 'desc' }, { postCount: 'desc' }],
      take: 8,
    }),
    prisma.photoContest.findMany({
      where: { status: { in: ['upcoming', 'active', 'voting'] } },
      orderBy: [{ featured: 'desc' }, { startAt: 'desc' }],
      take: 3,
    }),
    prisma.species.count(),
    prisma.marketListing.count({ where: { status: 'on_sale' } }),
    prisma.journal.count(),
    prisma.post.count({
      where: {
        deleted: false,
        ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
      },
    }),
    prisma.species.findMany({
      orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
      take: 3,
      select: {
        id: true,
        name: true,
        cover: true,
        watering: true,
        light: true,
      },
    }),
    prisma.species.findMany({
      orderBy: [{ posts: { _count: 'desc' } }, { orderIdx: 'asc' }, { name: 'asc' }],
      take: 6,
      select: {
        id: true,
        slug: true,
        name: true,
        latinName: true,
        cover: true,
        difficulty: true,
        genus: {
          select: {
            slug: true,
            board: { select: { slug: true } },
          },
        },
      },
    }),
    getCurrentUser().catch(() => null),
  ]);

  const authorPendants = await getAuthorPendants(postsRaw);
  const userPendants = await getUserPendants(recommendUsersRaw);
  const posts = sortPostsForPins(
    postsRaw.map((post: any) => withAuthorPendant(serializePost(post, undefined, undefined, me), authorPendants)),
    [{ scope: 'global', targetId: '' }]
  );

  const banners: BannerItem[] = bannersRaw.map((banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle,
    image: banner.image,
    link: banner.link,
    tint: banner.tint,
    durationMs: banner.durationMs > 0 ? banner.durationMs : undefined,
  }));

  const topics = topicsRaw.map((topic, index) => {
    const post = posts.find((item) => item.tags.includes(topic.tag)) ?? posts[index % Math.max(posts.length, 1)];
    return {
      tag: topic.tag,
      postCount: topic.postCount,
      cover: post?.cover ?? post?.images?.[0] ?? null,
    };
  });

  const reminders = remindersRaw.map((species, index) => ({
    id: species.id,
    speciesName: species.name,
    cover: species.cover,
    text: index === 0 ? `${species.watering} 💧` : index === 1 ? `${species.light} ☀️` : '观察叶片状态 ⚠️',
    when: index === 0 ? '2 小时前' : index === 1 ? '昨天' : '2 天前',
  }));

  const events = eventsRaw.map((event) => ({
    id: event.id,
    title: event.title,
    cover: event.cover,
    status: event.status,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    participantCount: event.participantCount,
  }));

  return (
    <>
      {jsonLdScript([websiteJsonLd(), organizationJsonLd()])}
      <HomeDashboard
        posts={posts}
        banners={banners}
        topics={topics}
        events={events}
        reminders={reminders}
        stats={{
          speciesCount,
          marketCount,
          journalCount,
          postCount,
        }}
        recommendUsers={recommendUsersRaw.map((user) => {
          const serialized = serializeUser(user);
          const pendant = userPendants.get(serialized.id);
          if (pendant) serialized.equip = { ...(serialized.equip ?? {}), pendant };
          return serialized;
        })}
        selections={selectionRaw.map((species) => ({
          id: species.id,
          name: species.name,
          latinName: species.latinName,
          cover: species.cover,
          difficulty: species.difficulty,
          href: species.genus.board
            ? `/plants/${species.genus.board.slug}/${species.genus.slug}/${species.slug}`
            : '/plants',
        }))}
      />
    </>
  );
}

async function getAuthorPendants(postsRaw: Array<{ author?: { id: string; equipPendantId?: string | null } | null }>) {
  const pairs = postsRaw
    .map((post) => ({ authorId: post.author?.id, pendantId: post.author?.equipPendantId }))
    .filter((item): item is { authorId: string; pendantId: string } => Boolean(item.authorId && item.pendantId));
  if (pairs.length === 0) return new Map<string, ReturnType<typeof serializeSkin>>();

  const skins = await prisma.skinItem.findMany({
    where: { id: { in: [...new Set(pairs.map((item) => item.pendantId))] } },
  });
  const skinById = new Map(skins.map((skin) => [skin.id, serializeSkin(skin)]));
  return new Map(
    pairs
      .map((item) => [item.authorId, skinById.get(item.pendantId)] as const)
      .filter((item): item is readonly [string, NonNullable<ReturnType<typeof serializeSkin>>] => Boolean(item[1]))
  );
}

function withAuthorPendant(
  post: ReturnType<typeof serializePost>,
  authorPendants: Map<string, ReturnType<typeof serializeSkin>>
) {
  const pendant = authorPendants.get(post.author.id);
  if (pendant) {
    post.author.equip = { ...(post.author.equip ?? {}), pendant };
  }
  return post;
}

async function getUserPendants(usersRaw: Array<{ id: string; equipPendantId?: string | null }>) {
  const pairs = usersRaw
    .map((user) => ({ userId: user.id, pendantId: user.equipPendantId }))
    .filter((item): item is { userId: string; pendantId: string } => Boolean(item.pendantId));
  if (pairs.length === 0) return new Map<string, ReturnType<typeof serializeSkin>>();

  const skins = await prisma.skinItem.findMany({
    where: { id: { in: [...new Set(pairs.map((item) => item.pendantId))] } },
  });
  const skinById = new Map(skins.map((skin) => [skin.id, serializeSkin(skin)]));
  return new Map(
    pairs
      .map((item) => [item.userId, skinById.get(item.pendantId)] as const)
      .filter((item): item is readonly [string, NonNullable<ReturnType<typeof serializeSkin>>] => Boolean(item[1]))
  );
}
