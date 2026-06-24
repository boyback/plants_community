import { ProductSource } from '@prisma/client';
import { prisma } from '@/lib/db';

const PENDANT_UNLOCKS = {
  active: { slug: 'pendant-leaf-crown', obtainedFrom: 'achievement' },
  adminFlower: { slug: 'pendant-flower-bud', obtainedFrom: 'admin' },
  signin7: { slug: 'pendant-dew-ring', obtainedFrom: 'achievement' },
  summerPost: { slug: 'pendant-sun-speckle', obtainedFrom: 'event' },
  speciesContribution: { slug: 'pendant-archive-bookmark', obtainedFrom: 'achievement' },
  journalPost: { slug: 'pendant-timeline-marker', obtainedFrom: 'achievement' },
  marketListing: { slug: 'pendant-trade-tag', obtainedFrom: 'trade' },
  moderator: { slug: 'pendant-moderator-badge', obtainedFrom: 'admin' },
  silverPeyotePost: { slug: 'pendant-silver-peyote', obtainedFrom: 'achievement' },
  starAsteriasPost: { slug: 'pendant-star-asterias', obtainedFrom: 'achievement' },
  haworthiaPost: { slug: 'pendant-haworthia-window', obtainedFrom: 'achievement' },
  variegata: { slug: 'pendant-variegata-ribbon', obtainedFrom: 'admin' },
} as const;

const AUTO_RULES = [
  PENDANT_UNLOCKS.active,
  PENDANT_UNLOCKS.signin7,
  PENDANT_UNLOCKS.summerPost,
  PENDANT_UNLOCKS.speciesContribution,
  PENDANT_UNLOCKS.journalPost,
  PENDANT_UNLOCKS.marketListing,
  PENDANT_UNLOCKS.silverPeyotePost,
  PENDANT_UNLOCKS.starAsteriasPost,
  PENDANT_UNLOCKS.haworthiaPost,
] as const;

const AUTO_SLUGS = AUTO_RULES.map((rule) => rule.slug);

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function hasSevenDayStreak(rows: Array<{ createdAt: Date }>) {
  const keys = [...new Set(rows.map((row) => dateKey(row.createdAt)))].sort();
  if (keys.length < 7) return false;

  let streak = 1;
  for (let i = 1; i < keys.length; i++) {
    const prev = new Date(`${keys[i - 1]}T00:00:00.000Z`).getTime();
    const current = new Date(`${keys[i]}T00:00:00.000Z`).getTime();
    if (current - prev === 86400000) {
      streak += 1;
      if (streak >= 7) return true;
    } else {
      streak = 1;
    }
  }
  return false;
}

async function hasPublishedPostBySpeciesName(userId: string, speciesName: string) {
  const species = await prisma.species.findFirst({
    where: { name: speciesName },
    select: { id: true },
  });
  if (!species) return false;

  const count = await prisma.post.count({
    where: {
      authorId: userId,
      speciesId: species.id,
      deleted: false,
      reviewStatus: 'published',
    },
  });
  return count > 0;
}

export async function syncAvatarPendantUnlocks(userId: string) {
  const skins = await prisma.skinItem.findMany({
    where: {
      kind: 'pendant',
      enabled: true,
      slug: { in: AUTO_SLUGS },
    },
    select: { id: true, slug: true },
  });
  if (skins.length === 0) return [];

  const owned = await prisma.userSkin.findMany({
    where: {
      userId,
      skinId: { in: skins.map((skin) => skin.id) },
    },
    select: { skinId: true },
  });
  const ownedIds = new Set(owned.map((item) => item.skinId));
  const skinBySlug = new Map(skins.map((skin) => [skin.slug, skin]));

  const [
    publishedPosts,
    commentCount,
    signinCount,
    signinRows,
    contributionCount,
    journalCount,
    marketListingCount,
    c2cProductCount,
    silverPeyotePost,
    starAsteriasPost,
    haworthiaPost,
  ] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: userId, deleted: false, reviewStatus: 'published' },
      select: { createdAt: true },
      take: 500,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.comment.count({
      where: { authorId: userId, deleted: false },
    }),
    prisma.pointsLedger.count({
      where: { userId, type: 'signin' },
    }),
    prisma.pointsLedger.findMany({
      where: { userId, type: 'signin' },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { createdAt: true },
    }),
    prisma.speciesContribution.count({ where: { userId } }),
    prisma.post.count({
      where: { authorId: userId, type: 'journal', deleted: false, reviewStatus: 'published' },
    }),
    prisma.marketListing.count({ where: { sellerId: userId } }),
    prisma.product.count({ where: { sellerId: userId, source: ProductSource.c2c } }),
    hasPublishedPostBySpeciesName(userId, '银冠玉'),
    hasPublishedPostBySpeciesName(userId, '星兜'),
    hasPublishedPostBySpeciesName(userId, '玉露'),
  ]);

  const unlockedSlugs = new Set<string>();
  const hasSummerPost = publishedPosts.some((post) => {
    const month = post.createdAt.getMonth() + 1;
    return month >= 6 && month <= 8;
  });

  if (publishedPosts.length > 0 || commentCount > 0 || signinCount > 0) unlockedSlugs.add(PENDANT_UNLOCKS.active.slug);
  if (hasSevenDayStreak(signinRows)) unlockedSlugs.add(PENDANT_UNLOCKS.signin7.slug);
  if (hasSummerPost) unlockedSlugs.add(PENDANT_UNLOCKS.summerPost.slug);
  if (contributionCount > 0) unlockedSlugs.add(PENDANT_UNLOCKS.speciesContribution.slug);
  if (journalCount > 0) unlockedSlugs.add(PENDANT_UNLOCKS.journalPost.slug);
  if (marketListingCount > 0 || c2cProductCount > 0) unlockedSlugs.add(PENDANT_UNLOCKS.marketListing.slug);
  if (silverPeyotePost) unlockedSlugs.add(PENDANT_UNLOCKS.silverPeyotePost.slug);
  if (starAsteriasPost) unlockedSlugs.add(PENDANT_UNLOCKS.starAsteriasPost.slug);
  if (haworthiaPost) unlockedSlugs.add(PENDANT_UNLOCKS.haworthiaPost.slug);

  const rows: Array<{ userId: string; skinId: string; obtainedFrom: string }> = [];
  for (const slug of unlockedSlugs) {
    const skin = skinBySlug.get(slug);
    const rule = AUTO_RULES.find((item) => item.slug === slug);
    if (!skin || !rule || ownedIds.has(skin.id)) continue;
    rows.push({
      userId,
      skinId: skin.id,
      obtainedFrom: rule.obtainedFrom,
    });
  }

  if (rows.length > 0) {
    await prisma.userSkin.createMany({
      data: rows,
      skipDuplicates: true,
    });
  }

  return rows.map((row) => row.skinId);
}

export async function grantAvatarPendantToUser(userId: string, skinId: string) {
  const skin = await prisma.skinItem.findFirst({
    where: { id: skinId, kind: 'pendant' },
    select: { id: true },
  });
  if (!skin) return false;

  await prisma.userSkin.createMany({
    data: [{ userId, skinId: skin.id, obtainedFrom: 'admin' }],
    skipDuplicates: true,
  });
  return true;
}
