import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PostActions } from "@/components/post/PostActions";
import { MobileActionBar } from "@/components/post/MobileActionBar";
import {
  JournalChronoTimeline,
  type JournalChronoEntry } from
"@/components/post/JournalChronoTimeline";
import { PostAdminMenu } from "@/components/post/PostAdminMenu";
import { Icon } from "@/components/ui/Icon";
import { ImageGallery } from "@/components/ui/ImageGallery";
import { ButtonLink } from "@/components/ui/Button";
import { UserIdentity } from "@/components/ui/UserIdentity";
import { prisma } from "@/lib/db";
import { postInclude } from "@/lib/post-include";
import { serializePost, serializeSkin } from "@/lib/serializers";
import { getCurrentUser } from "@/lib/auth";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { JOURNAL_ENTRY_DATE_EDIT_ENABLED, REVIEW_FILTER_ENABLED } from "@/lib/feature-flags";
import { lookupLivePhotos } from "@/lib/live-photo";
import type { Metadata } from "next";
import type { Post, SkinItem } from "@/lib/types";
import { parseJsonArray } from "@/lib/api";
import { jsonLdScript, postJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { PostBody } from "@/components/post/PostBody";
import { CommentSection } from "@/components/post/CommentSection";
import { journalStageLabels, normalizeJournalStages, STAGE_META as JOURNAL_STAGE_META } from "@/lib/journal";
import { cn } from "@/lib/utils";
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



const SITE_URL =
process.env.NEXT_PUBLIC_SITE_URL ?? "https://plantcommunity.cn";

export const dynamic = "force-dynamic";

type SpeciesRailItem = {
  id: string;
  slug: string;
  name: string;
  latinName?: string | null;
  description?: string | null;
  cover?: string | null;
  genus?: {
    slug: string;
    board?: {slug: string;} | null;
  } | null;
  _count?: {
    posts?: number;
    collects?: number;
    ratings?: number;
  };
};

const commentAuthorInclude = {
  _count: {
    select: { posts: true, followers: true, following: true }
  },
  badges: { include: { badge: true } }
} as const;

const commentRepliesLevel3 = {
  where: { deleted: false },
  orderBy: { createdAt: "asc" as const },
  include: {
    author: { include: commentAuthorInclude },
    journalEntry: true
  }
} as const;

const commentRepliesLevel2 = {
  where: { deleted: false },
  orderBy: { createdAt: "asc" as const },
  include: {
    author: { include: commentAuthorInclude },
    journalEntry: true,
    replies: commentRepliesLevel3
  }
} as const;

const commentRepliesLevel1 = {
  where: { deleted: false },
  orderBy: { createdAt: "asc" as const },
  include: {
    author: { include: commentAuthorInclude },
    journalEntry: true,
    replies: commentRepliesLevel2
  }
} as const;

export async function generateMetadata({
  params


}: {params: {id: string;};}): Promise<Metadata> {
  const p = await prisma.post.
  findUnique({
    where: { id: params.id },
    select: {
      title: true,
      contentText: true,
      cover: true,
      tags: true,
      deleted: true,
      author: { select: { name: true } },
      species: { select: { name: true } },
      genus: { select: { name: true } },
      board: { select: { name: true } }
    }
  }).
  catch(() => null);
  if (!p || p.deleted) return {};

  const tags = parseJsonArray(p.tags);
  const board = p.species?.name ?? p.genus?.name ?? p.board?.name ?? "";
  const title = p.title;
  const description =
  (p.contentText?.slice(0, 120) ?? "") ||
  `${p.author.name} 在「${board || "植友圈"}」分享的内容`;
  const keywords = [
  ...tags,
  p.species?.name,
  p.genus?.name,
  p.board?.name,
  "多肉",
  "多肉植物"].
  filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    openGraph: {
      type: "article",
      title,
      description,
      authors: p.author.name,
      images: p.cover ? [{ url: p.cover, alt: p.title }] : undefined
    }
  };
}

export default async function PostDetailPage({
  params


}: {params: {id: string;};}) {
  const postRaw = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      ...postInclude({ withJournalEntries: true }),
      comments: {
        where: { parentId: null, deleted: false },
        orderBy: { createdAt: "asc" },
        take: 50,
        include: {
          author: { include: commentAuthorInclude },
          journalEntry: true,
          replies: commentRepliesLevel1
        }
      }
    }
  });
  if (!postRaw || postRaw.deleted) notFound();

  void prisma.post.
  update({ where: { id: params.id }, data: { views: { increment: 1 } } }).
  catch(() => null);

  const me = await getCurrentUser();
  if (postRaw.journal?.entries?.length) {
    const entryIds = postRaw.journal.entries.map((entry) => entry.id);
    const entryCommentCounts = await prisma.comment.groupBy({
      by: ['journalEntryId'],
      where: {
        journalEntryId: { in: entryIds },
        parentId: null,
        deleted: false
      },
      _count: { _all: true }
    });
    const entryCommentCountMap = new Map<string, number>();
    entryCommentCounts.forEach((item) => {
      if (item.journalEntryId) entryCommentCountMap.set(item.journalEntryId, item._count._all);
    });
    (postRaw.journal.entries as Array<(typeof postRaw.journal.entries)[number] & {_count?: {likes?: number;comments?: number;};}>).forEach((entry) => {
      entry._count = {
        ...(entry._count ?? {}),
        comments: entryCommentCountMap.get(entry.id) ?? 0
      };
    });
  }

  const post = serializePost(postRaw, undefined, undefined, me);
  const collectCount = await prisma.postCollect.count({
    where: { postId: post.id }
  });
  let liked = false;
  let collected = false;
  let attending = false;

  if (me) {
    const [l, c] = await Promise.all([
    prisma.postLike.findUnique({
      where: { userId_postId: { userId: me.id, postId: post.id } }
    }),
    prisma.postCollect.findUnique({
      where: { userId_postId: { userId: me.id, postId: post.id } }
    })]
    );
    liked = !!l;
    collected = !!c;

    if (post.event) {
      const ev = await prisma.event.findUnique({ where: { postId: post.id } });
      if (ev) {
        const a = await prisma.eventAttendee.findUnique({
          where: { eventId_userId: { eventId: ev.id, userId: me.id } }
        });
        attending = !!a;
      }
    }
  }

  const livePhotoMap =
  post.images && post.images.length > 0 ?
  await lookupLivePhotos(post.images) :
  {};
  const commentAuthorPendantPairs = [
  ...postRaw.comments.map((comment) => ({
    authorId: comment.author.id,
    pendantId: comment.author.equipPendantId,
    bubbleId: comment.author.equipBubbleId
  })),
  ...postRaw.comments.flatMap((comment) =>
  comment.replies.map((reply) => ({
    authorId: reply.author.id,
    pendantId: reply.author.equipPendantId,
    bubbleId: reply.author.equipBubbleId
  }))
  )].
  filter((item) => Boolean(item.pendantId) || Boolean(item.bubbleId));
  const commentAuthorPendantPairsOnly = commentAuthorPendantPairs.filter(
    (item): item is {authorId: string;pendantId: string;bubbleId: string | null;} => Boolean(item.pendantId)
  );
  const commentAuthorBubblePairsOnly = commentAuthorPendantPairs.filter(
    (item): item is {authorId: string;pendantId: string | null;bubbleId: string;} => Boolean(item.bubbleId)
  );
  const commentAuthorPendantIds = commentAuthorPendantPairsOnly.map((item) => item.pendantId);
  const commentAuthorBubbleIds = commentAuthorBubblePairsOnly.map((item) => item.bubbleId);
  const [postAuthorPendantRow, commentAuthorPendantRows, commentAuthorBubbleRows] = await Promise.all([
  postRaw.author.equipPendantId ?
  prisma.skinItem.findUnique({ where: { id: postRaw.author.equipPendantId } }) :
  Promise.resolve(null),
  commentAuthorPendantIds.length > 0 ?
  prisma.skinItem.findMany({
    where: { id: { in: [...new Set(commentAuthorPendantIds)] } }
  }) :
  [],
  commentAuthorBubbleIds.length > 0 ?
  prisma.skinItem.findMany({
    where: { id: { in: [...new Set(commentAuthorBubbleIds)] } }
  }) :
  []]
  );
  const commentPendantById = new Map(
    commentAuthorPendantRows.map((skin) => [skin.id, serializeSkin(skin)])
  );
  const commentBubbleById = new Map(
    commentAuthorBubbleRows.map((skin) => [skin.id, serializeSkin(skin)])
  );
  const commentAuthorPendants = Object.fromEntries(
    commentAuthorPendantPairsOnly.
    map((item) => [item.authorId, commentPendantById.get(item.pendantId)] as const).
    filter((item): item is readonly [string, SkinItem] => Boolean(item[1]))
  ) as Record<string, SkinItem>;
  const commentAuthorBubbles = Object.fromEntries(
    commentAuthorBubblePairsOnly.
    map((item) => [item.authorId, commentBubbleById.get(item.bubbleId)] as const).
    filter((item): item is readonly [string, SkinItem] => Boolean(item[1]))
  ) as Record<string, SkinItem>;
  const postAuthorPendant = postAuthorPendantRow ? serializeSkin(postAuthorPendantRow) : null;

  const visiblePostWhere = {
    deleted: false,
    ...(REVIEW_FILTER_ENABLED ? { reviewStatus: "published" as const } : {})
  };

  const [
  relatedRaw,
  fallbackRelatedRaw,
  communityEventsRaw,
  speciesDetail] =
  await Promise.all([
  prisma.post.findMany({
    where: {
      ...visiblePostWhere,
      id: { not: post.id },
      ...(postRaw.speciesId ?
      { speciesId: postRaw.speciesId } :
      postRaw.genusId ?
      { genusId: postRaw.genusId } :
      postRaw.boardId ?
      { boardId: postRaw.boardId } :
      {})
    },
    take: 4,
    orderBy: { createdAt: "desc" },
    include: postInclude()
  }),
  prisma.post.findMany({
    where: { ...visiblePostWhere, id: { not: post.id } },
    take: 4,
    orderBy: { hotScore: "desc" },
    include: postInclude()
  }),
  prisma.post.findMany({
    where: { ...visiblePostWhere, type: "event" },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: postInclude()
  }),
  postRaw.speciesId ?
  prisma.species.findUnique({
    where: { id: postRaw.speciesId },
    include: {
      genus: { include: { board: true } },
      _count: { select: { posts: true, collects: true, ratings: true } }
    }
  }) :
  Promise.resolve(null)]
  );

  const sameGenusSpecies = speciesDetail ?
  await prisma.species.findMany({
    where: {
      genusId: speciesDetail.genusId,
      id: { not: speciesDetail.id }
    },
    include: {
      genus: { include: { board: true } },
      _count: { select: { posts: true, collects: true, ratings: true } }
    },
    take: 4,
    orderBy: [{ orderIdx: "asc" }, { createdAt: "desc" }]
  }) :
  [];

  const related = [...relatedRaw, ...fallbackRelatedRaw].
  filter((item, index, arr) => arr.findIndex((p) => p.id === item.id) === index).
  slice(0, 4).
  map((p) => serializePost(p));
  const communityEvents = communityEventsRaw.map((p) => serializePost(p));

  const postUrl = `${SITE_URL}/post/${post.id}`;
  const journalChronoEntries = post.type === "journal" && post.journal?.entries ?
  makeJournalChronoEntries(post) :
  [];
  const nearestJournalEntryImage = getNearestJournalEntryImage(journalChronoEntries);
  const journalPlant = postRaw.journal?.userPlantId ?
  await prisma.userPlant.findUnique({
    where: { id: postRaw.journal.userPlantId },
    select: {
      id: true,
      nickname: true,
      acquiredAt: true,
      cover: true,
      note: true
    }
  }) :
  null;
  const journalCompareFallback = post.cover ?? post.images?.[0] ?? nearestJournalEntryImage ?? post.species?.cover ?? "";
  const cover = post.cover ?
  post.cover.startsWith("http") ?
  post.cover :
  `${SITE_URL}${post.cover}` :
  undefined;
  const ld = postJsonLd({
    title: post.title || "帖子",
    excerpt: post.content?.replace(/<[^>]*>/g, "").slice(0, 200),
    cover,
    url: postUrl,
    authorName: post.author.name,
    authorUrl: `${SITE_URL}/user/${post.author.id}`,
    publishedAt: post.createdAt,
    views: post.views,
    likes: post.likes,
    comments: post.comments
  });
  const breadcrumb = breadcrumbJsonLd([
  { name: "首页", url: SITE_URL },
  ...(post.board ?
  [{ name: post.board.name, url: `${SITE_URL}/board/${post.board.slug}` }] :
  []),
  { name: post.title || "帖子", url: postUrl }]
  );

  return (
    <AppShell showFloatingAi={false} showLeftRail={false} className={styles.r_d14dc4ed}>
      {jsonLdScript([ld, breadcrumb])}

      <div className={cx(styles.r_0e12dc7d, styles.r_f3c543ad, styles.r_6da6a3c3, styles.r_726bb2cc, styles.r_b39e60c3, styles.r_8fe321a7)}>
        <div className={cx(styles.r_7e0b7cdf, styles.r_b43b4c08)}>
          <article
            data-post-detail-card
            className={cx(styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
            <div className={cx(styles.r_65fdbade, styles.r_23d3773a, styles.r_d139dd09, styles.r_cb11fec3, styles.r_e341df82)}>
              <div className={cx(styles.breadcrumb, styles.r_da019856, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e, styles.r_359090c2, styles.r_69335b95)}>
                <Link href="/" className={styles.r_81be6435}>
                  社区
                </Link>
                <Icon name="arrow-right" size={12} />
                {post.board.path.map((p, i) =>
                <span key={`${p.slug}-${i}`} className={styles.r_4a756ca0}>
                    <Link
                    href={
                    "/board/" +
                    post.board.path.
                    slice(0, i + 1).
                    map((x) => encodeURIComponent(x.slug)).
                    join("/")
                    }
                    className={styles.r_81be6435}>

                      {p.name}
                    </Link>
                    <Icon name="arrow-right" size={12} />
                  </span>
                )}
                <span className={styles.r_7b89cd85}>帖子详情</span>
              </div>

              <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_0c3bc985)}>
                <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                  {post.type !== "journal" &&
                  <h1 className={cx(styles.r_948ac89b, styles.r_69450ef1, styles.r_e25ca653, styles.r_6d623258, styles.r_9ec973a0)}>
                      {post.title}
                    </h1>
                  }
                  <div className={post.type === "journal" ? cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_513d5c30, styles.r_41c9ba83, styles.r_359090c2, styles.r_7b89cd85) : cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_513d5c30, styles.r_41c9ba83, styles.r_359090c2, styles.r_7b89cd85)}>
                    <span>{formatDateTime(post.createdAt)}</span>
                    {post.updatedAt && post.updatedAt !== post.createdAt &&
                    <span>编辑于 {formatDateTime(post.updatedAt)}</span>
                    }
                    <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}>
                      <Icon name="eye" size={13} />
                      {formatNumber(post.views)}
                    </span>
                  </div>
                </div>

                <div className={cx(styles.r_60fbb771, styles.r_012fbd12, styles.r_3960ffc2, styles.r_77a2a20e)}>
                  {me?.id === post.author.id && post.adminPermissions?.canEdit &&
                  <Link
                    href={`/post/${post.id}/edit`}
                    className={cx(styles.r_99d72c7f, styles.r_e7a768f9, styles.r_3960ffc2, styles.r_58284b4e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0e17f2bd, styles.r_359090c2, styles.r_e83a7042, styles.r_e7eab4cb, styles.r_5756b7b4, styles.r_8e68003e)}>

                      <Icon name="edit" size={13} />
                      编辑
                    </Link>
                  }
                  <PostAdminMenu post={post} user={me} buttonSize="md" />
                </div>
              </div>

              {post.type !== "journal" && post.tags.length > 0 &&
              <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
                  {post.tags.map((t) =>
                <Link
                  key={t}
                  href={`/topic/${encodeURIComponent(t)}`}
                  className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_2689f395, styles.r_e7eab4cb, styles.r_ceb69a6b, styles.r_2efc423a)}>

                      #{t}
                    </Link>
                )}
                </div>
              }
            </div>

            <div className={cx(styles.r_d139dd09, styles.r_09c1ba5f, styles.r_ecdc4c70, styles.r_e341df82, styles.r_cf732e80, styles.r_aac79e37)}>
              {REVIEW_FILTER_ENABLED &&
              me?.id === post.author.id &&
              postRaw.reviewStatus !== "published" &&
              <div
                className={
                postRaw.reviewStatus === "pending" ? cx(styles.r_da019856, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_4908cb75, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_359090c2, styles.r_5c6230d2) : cx(styles.r_da019856, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_959f4a9f, styles.r_62afc924, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_359090c2, styles.r_6699d429)


                }>

                    {postRaw.reviewStatus === "pending" ?
                "帖子正在审核中，通过后才会公开展示。" :
                "帖子已被驳回。"}
                    {postRaw.reviewReason &&
                <div className={cx(styles.r_b6b02c0e, styles.r_d058ca6d, styles.r_714816ef)}>
                        原因：{postRaw.reviewReason}
                      </div>
                }
                  </div>
              }

              {post.type === "journal" && post.journal ?
              <JournalPlantDetailContent
                post={post}
                speciesDetail={speciesDetail}
                plant={journalPlant}
                entries={journalChronoEntries}
                canEditEntryDates={JOURNAL_ENTRY_DATE_EDIT_ENABLED && me?.id === post.author.id} /> :


              <PostBody
                post={post}
                livePhotoMap={livePhotoMap}
                initialAttending={attending} />

              }
            </div>

            <PostActions
              post={post}
              initialLiked={liked}
              initialCollected={collected}
              initialCollectedTotal={collectCount} />

          </article>

          <CommentSection post={post} authorPendants={commentAuthorPendants} authorBubbles={commentAuthorBubbles} />
        </div>

        <aside className={cx(styles.r_99d72c7f, styles.r_7e0b7cdf, styles.r_b43b4c08, styles.r_f271783c, styles.r_69a4bc69, styles.r_c830740d, styles.r_478cc171, styles.r_90b8aaf3)}>
          <PostDetailRightRail
            post={postAuthorPendant ? { ...post, author: { ...post.author, equip: { ...(post.author.equip ?? {}), pendant: postAuthorPendant } } } : post}
            related={related}
            sameGenusSpecies={sameGenusSpecies}
            communityEvents={communityEvents}
            journalEntries={journalChronoEntries}
            journalCompareFallback={journalCompareFallback} />

        </aside>
      </div>

      <MobileActionBar
        post={post}
        initialLiked={liked}
        initialCollected={collected} />

    </AppShell>);

}

function makeJournalChronoEntries(post: Post): JournalChronoEntry[] {
  return [...(post.journal?.entries ?? [])].
  sort((a, b) => {
    const byDate = new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
    return byDate !== 0 ? byDate : b.orderIdx - a.orderIdx;
  }).
  map((entry) => {
    const meta = JOURNAL_STAGE_META[entry.stage] ?? JOURNAL_STAGE_META.other;
    const stages = normalizeJournalStages(entry.stages, entry.stage);
    const stageLabels = entry.stageLabels ?? journalStageLabels(stages, entry.stageLabel);
    const stageItems = stages.map((stage, index) => {
      const stageMeta = JOURNAL_STAGE_META[stage] ?? JOURNAL_STAGE_META.other;
      return {
        key: `${entry.id}-${stage}`,
        label: stageLabels[index] ?? stageMeta.zh,
        icon: stageMeta.emoji,
        className: stageMeta.color,
      };
    });
    const date = new Date(entry.entryDate);
    return {
      id: entry.id,
      postId: post.id,
      postTitle: post.title,
      dateIso: entry.entryDate,
      dateLabel: formatDateOnly(date),
      yearLabel: String(date.getFullYear()),
      monthDayLabel: monthDay(date),
      stageLabel: stageLabels.join('、') || entry.stageLabel || meta.zh,
      stageIcon: meta.emoji,
      stageClassName: meta.color,
      stageItems,
      note: entry.note,
      images: entry.images,
      comments: entry.comments
    };
  });
}

function getNearestJournalEntryImage(entries: JournalChronoEntry[]) {
  const now = Date.now();
  return entries.
  filter((entry) => entry.images.length > 0).
  sort((a, b) => {
    const diff = Math.abs(new Date(a.dateIso).getTime() - now) - Math.abs(new Date(b.dateIso).getTime() - now);
    if (diff !== 0) return diff;
    return new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime();
  })[0]?.images[0] ?? null;
}

function JournalPlantDetailContent({
  post,
  speciesDetail,
  plant,
  entries,
  canEditEntryDates





}: {post: Post;speciesDetail: SpeciesRailItem | null;plant: {id: string;nickname: string;acquiredAt: Date;cover?: string | null;note?: string | null;} | null;entries: JournalChronoEntry[];canEditEntryDates: boolean;}) {
  const journalStartDate = post.journal?.startDate ? new Date(post.journal.startDate) : new Date(post.createdAt);
  const entriesAsc = [...entries].sort(
    (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()
  );
  const entriesDesc = [...entriesAsc].reverse();
  const firstEntry = entriesAsc[0] ?? null;
  const latestEntry = entriesDesc[0] ?? null;
  const nearestJournalEntryImage = getNearestJournalEntryImage(entries);
  const cover = post.cover ?? post.images?.[0] ?? nearestJournalEntryImage ?? post.species?.cover ?? speciesDetail?.cover ?? plant?.cover ?? "";
  const nickname = plant?.nickname ?? post.journal?.subjectName ?? post.title;
  const acquiredAt = firstEntry ? new Date(firstEntry.dateIso) : plant?.acquiredAt ?? journalStartDate;
  const speciesLabel = speciesDetail?.name ?? post.journal?.speciesName ?? post.species?.name ?? post.board.name;
  const speciesHrefValue = speciesDetail ? speciesHref(speciesDetail) : post.board.level === "species" ? `/board/${post.board.path.map((item) => item.slug).join("/")}` : "/plants";
  return (
    <div className={styles.r_b43b4c08}>
      <section className={cx(styles.r_f3c543ad, styles.r_b39e60c3, styles.r_c1253da6)}>
        <div className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_438b2237)}>
          {cover ?
          <Image src={cover} alt={nickname} fill unoptimized className={styles.r_7d85d0c2} /> :

          <div className={cx(styles.r_f3c543ad, styles.r_668b21aa, styles.r_67d66567, styles.r_5f6a59f1)}>
              <Icon name="plants" size={38} />
            </div>
          }
        </div>

        <div className={cx(styles.r_7e0b7cdf, styles.r_3e7ce58d)}>
          <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_60541e1e, styles.r_8ef2268e, styles.r_1004c0c3)}>
            <div className={styles.r_7e0b7cdf}>
              <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
                <h2 className={cx(styles.r_751fb0d1, styles.r_69450ef1, styles.r_6d623258)}>{nickname}</h2>
                <Icon name="star" size={17} className={styles.r_1dd48761} fill="currentColor" />
              </div>
              <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
                <Link
                  href={speciesHrefValue}
                  className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_58284b4e, styles.r_ac204c10, styles.r_6bceb016, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_ceb69a6b, styles.r_e269e58c)}>

                  <Icon name="plants" size={13} />
                  <span>{speciesLabel}</span>
                </Link>
                {post.tags.map((tag) =>
                <Link
                  key={tag}
                  href={`/topic/${encodeURIComponent(tag)}`}
                  className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_2689f395, styles.r_e7eab4cb, styles.r_ceb69a6b, styles.r_2efc423a)}>

                    #{tag}
                  </Link>
                )}
              </div>
              <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_b39e60c3, styles.r_fc7473ca, styles.r_eb6abb1f)}>
                <span>入手时间：{formatDateOnly(acquiredAt)}</span>
                <span>养护时长：{formatDuration(acquiredAt, new Date())}</span>
              </div>
              {entries.length > 0 &&
              <>
                  <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_b39e60c3, styles.r_fc7473ca, styles.r_eb6abb1f)}>
                    <TimelineSummaryItem label="开始时间" value={firstEntry ? firstEntry.dateLabel : formatDateOnly(acquiredAt)} />
                    <TimelineSummaryItem label="结束时间" value={latestEntry ? latestEntry.dateLabel : "暂无"} />
                    <TimelineSummaryItem label="总条数" value={`${entries.length}条`} />
                  </div>
                </>
              }
            </div>

          </div>
        </div>
      </section>

      <section className={styles.r_3e7ce58d}>
        <div>
          <h3 className={cx(styles.r_4ee73492, styles.r_69450ef1, styles.r_6d623258)}>成长时间轴</h3>
        </div>
        <JournalChronoTimeline entries={entries} canEditDates={canEditEntryDates} />
      </section>
    </div>);

}

function TimelineSummaryItem({ label, value }: {label: string;value: string;}) {
  return (
    <span>{label}：{value}</span>);

}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthDay(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function formatDuration(start: Date, end: Date) {
  const days = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
  if (days < 31) return `${Math.max(days, 1)}天`;
  if (days < 365) return `${Math.max(1, Math.round(days / 30))}个月`;
  const years = Math.floor(days / 365);
  const months = Math.round(days % 365 / 30);
  return months > 0 ? `${years}年${months}个月` : `${years}年`;
}

function PostDetailRightRail({
  post,
  related,
  sameGenusSpecies,
  communityEvents,
  journalEntries,
  journalCompareFallback







}: {post: Post;related: Post[];sameGenusSpecies: SpeciesRailItem[];communityEvents: Post[];journalEntries: JournalChronoEntry[];journalCompareFallback: string;}) {
  const journalStartDate = post.journal?.startDate ? new Date(post.journal.startDate) : null;
  const journalEntriesAsc = [...journalEntries].sort(
    (a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime()
  );
  const firstEntry = journalEntriesAsc[0] ?? null;
  const latestEntry = journalEntriesAsc[journalEntriesAsc.length - 1] ?? null;
  const compareItems = [
  {
    date: firstEntry ? firstEntry.dateLabel : journalStartDate ? formatDateOnly(journalStartDate) : "开始",
    src: firstEntry?.images[0] ?? journalCompareFallback
  },
  {
    date: latestEntry ? latestEntry.dateLabel : "暂无",
    src: latestEntry?.images[0] ?? journalCompareFallback
  }].
  filter((item): item is {date: string;src: string;} => Boolean(item.src));

  return (
    <>
      <SideCard title="作者信息">
        <div className={styles.authorHeader}>
          <div className={styles.authorIdentity}>
            <UserIdentity
              user={post.author}
              size="lg"
              variant="profile"
              showLevel
              avatarPendantLayout="reserve"
              nameClassName={styles.authorName}
              textClassName={styles.authorText}
            />
          </div>
          <div className={styles.authorActions}>
            <ButtonLink href={`/user/${post.author.id}`} size="sm" className={styles.authorAction}>
              关注
            </ButtonLink>
            <ButtonLink href={`/messages?to=${post.author.id}`} variant="outline" size="sm" className={styles.authorAction}>
              私信
            </ButtonLink>
          </div>
        </div>
        {post.author.bio &&
        <p className={cx(styles.r_eccd13ef, styles.r_054cb4e3, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>
            {post.author.bio}
          </p>
        }
        <div className={cx(styles.r_0ab86672, styles.r_f3c543ad, styles.r_be2e831b, styles.r_77a2a20e, styles.r_ca6bf630)}>
          <RailStat label="帖子" value={formatNumber(post.author.posts)} />
          <RailStat label="图鉴收藏" value={formatNumber(post.author.pointsBalance)} />
          <RailStat label="关注" value={formatNumber(post.author.followers)} />
        </div>
      </SideCard>

      {post.type === "journal" && post.journal &&
      <>
          <SideCard title="成长对比">
            {compareItems.length > 0 ?
            <ImageGallery
              images={compareItems.map((item) => item.src)}
              labels={compareItems.map((item) => ({ label: item.date }))} /> :

            <div className={cx(styles.r_f3c543ad, styles.r_b59cd297, styles.r_67d66567, styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_d058ca6d, styles.r_7b89cd85)}>
                暂无对比图片
              </div>
            }
            <p className={cx(styles.r_eccd13ef, styles.r_ca6bf630, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>从第一张记录到现在，这一路的变化都在这里。</p>
          </SideCard>

        </>
      }

      {related.length > 0 &&
      <SideCard title="相关帖子" footerHref="/board" footerLabel="查看更多">
          <div className={styles.r_6ed543e2}>
            {related.map((item) =>
          <MiniPostItem key={item.id} post={item} />
          )}
          </div>
        </SideCard>
      }

      {sameGenusSpecies.length > 0 &&
      <SideCard title="同属植物推荐" footerHref="/plants" footerLabel="查看更多">
          <div className={cx(styles.r_f3c543ad, styles.r_32aac21b, styles.r_77a2a20e)}>
            {sameGenusSpecies.slice(0, 4).map((item) =>
          <Link
            key={item.id}
            href={speciesHref(item)}
            className={cx(styles.r_64292b1c, styles.r_7e0b7cdf)}
            title={item.name}>

                <div className={cx(styles.r_b59cd297, styles.r_2cd02d11, styles.r_a217b4ea, styles.r_7ebecbb6)}>
                  {item.cover ?
              <img
                src={item.cover}
                alt={item.name}
                className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2, styles.r_56bf8ae8, styles.r_1a9195e1)} /> :


              <div className={cx(styles.r_f3c543ad, styles.r_668b21aa, styles.r_67d66567, styles.r_5f6a59f1)}>
                      <Icon name="plants" size={18} />
                    </div>
              }
                </div>
                <div className={cx(styles.r_b6b02c0e, styles.r_f283ea9b, styles.r_ca6bf630, styles.r_d058ca6d, styles.r_eb6abb1f)}>
                  {item.name}
                </div>
              </Link>
          )}
          </div>
        </SideCard>
      }

      {communityEvents.length > 0 &&
      <SideCard title="社区活动">
          <div className={styles.r_6f7e013d}>
            {communityEvents.map((item) =>
          <Link
            key={item.id}
            href={`/post/${item.id}`}
            className={cx(styles.r_0214b4b3, styles.r_a217b4ea, styles.r_52f53b18, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_c18f7f8c)}>

                <div className={cx(styles.r_f50e2015, styles.r_359090c2, styles.r_e83a7042, styles.r_399e11a5)}>
                  {item.title}
                </div>
                <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_d058ca6d, styles.r_7b89cd85)}>
                  <span>{formatDateTime(item.createdAt)}</span>
                  <span>{formatNumber(item.views)} 浏览</span>
                </div>
              </Link>
          )}
          </div>
        </SideCard>
      }

    </>);

}

function SideCard({
  title,
  children,
  footerHref,
  footerLabel





}: {title: string;children: React.ReactNode;footerHref?: string;footerLabel?: string;}) {
  return (
    <section className={cx(styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_438b2237)}>
      <div className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_69450ef1, styles.r_6d623258)}>{title}</div>
      {children}
      {footerHref && footerLabel &&
      <Link
        href={footerHref}
        className={cx(styles.r_0ab86672, styles.r_0214b4b3, styles.r_b950dda2, styles.r_88b684d2, styles.r_ce335a8e, styles.r_ca6bf630, styles.r_359090c2, styles.r_2689f395, styles.r_e7eab4cb, styles.r_5eca0425)}>

          {footerLabel} &gt;
        </Link>
      }
    </section>);

}

function RailStat({ label, value }: {label: string;value: string;}) {
  return (
    <div className={cx(styles.r_a217b4ea, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_03b4dd7f)}>
      <div className={cx(styles.r_fc7473ca, styles.r_69450ef1, styles.r_6d623258)}>{value}</div>
      <div className={cx(styles.r_15e1b1f4, styles.r_d058ca6d, styles.r_7b89cd85)}>{label}</div>
    </div>);

}

function MiniPostItem({ post, compact }: {post: Post;compact?: boolean;}) {
  const image = post.cover ?? post.images?.[0] ?? getNearestPostJournalEntryImage(post) ?? post.species?.cover ?? firstImageFromHtml(post.content);
  const description = post.type === "journal" ?
  getNearestPostJournalEntryNote(post) :
  post.contentText?.trim() || textFromHtml(post.content) || "";
  return (
    <Link href={`/post/${post.id}`} className={cx(styles.r_64292b1c, styles.r_60fbb771, styles.r_1004c0c3)}>
      <div
        className={
        compact ? cx(styles.r_508ebf85, styles.r_e7e37107, styles.r_012fbd12, styles.r_2cd02d11, styles.r_a217b4ea, styles.r_7ebecbb6) : cx(styles.r_acaee621, styles.r_ed831a4d, styles.r_012fbd12, styles.r_2cd02d11, styles.r_a217b4ea, styles.r_7ebecbb6)


        }>

        {image ?
        <img
          src={image}
          alt={post.title}
          className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2, styles.r_56bf8ae8, styles.r_1a9195e1)} /> :


        <div className={cx(styles.r_f3c543ad, styles.r_668b21aa, styles.r_67d66567, styles.r_5f6a59f1)}>
            <Icon name="image" size={18} />
          </div>
        }
      </div>
      <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
        <div className={cx(styles.miniPostTextLine, styles.r_f50e2015, styles.r_359090c2, styles.r_e83a7042, styles.r_7054e276, styles.r_399e11a5, styles.r_d94501d2)}>
          {post.title}
        </div>
        <div className={cx(styles.miniPostTextLine, styles.miniPostDescription, styles.r_b6b02c0e, styles.r_f50e2015, styles.r_d058ca6d, styles.r_66a36c90)}>
          {description}
        </div>
        <div className={cx(styles.miniPostMetaRow, styles.r_b6b02c0e, styles.r_60fbb771, styles.r_3960ffc2, styles.r_d058ca6d, styles.r_66a36c90)}>
          <span>{formatDateTime(post.createdAt)}</span>
          <span className={styles.miniPostMetaActions}>
            <span className={styles.miniPostMetaItem}>
              <Icon name="eye" size={12} />
              {formatNumber(post.views)}
            </span>
            <span className={styles.miniPostMetaDivider} />
            <span className={styles.miniPostMetaItem}>
              <Icon name="thumbs-up" size={12} />
              {formatNumber(post.likes)}
            </span>
          </span>
        </div>
      </div>
    </Link>);

}

function getNearestPostJournalEntryImage(post: Post) {
  const entries = post.journal?.entries ?? [];
  const now = Date.now();
  return entries.
  filter((entry) => entry.images.length > 0).
  sort((a, b) => {
    const diff = Math.abs(new Date(a.entryDate).getTime() - now) - Math.abs(new Date(b.entryDate).getTime() - now);
    if (diff !== 0) return diff;
    return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
  })[0]?.images[0] ?? null;
}

function getNearestPostJournalEntryNote(post: Post) {
  const entries = post.journal?.entries ?? [];
  const now = Date.now();
  return [...entries].
  sort((a, b) => {
    const diff = Math.abs(new Date(a.entryDate).getTime() - now) - Math.abs(new Date(b.entryDate).getTime() - now);
    if (diff !== 0) return diff;
    return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
  })[0]?.note.trim() ?? "";
}

function firstImageFromHtml(html?: string) {
  const match = html?.match(/<img[^>]+src=(?:"([^"]+)"|'([^']+)')/i);
  const src = match?.[1] ?? match?.[2];
  return src?.replace(/&amp;/g, "&");
}

function textFromHtml(html?: string) {
  return html?.
  replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, " ").
  replace(/<[^>]+>/g, " ").
  replace(/&nbsp;/g, " ").
  replace(/&amp;/g, "&").
  replace(/&quot;/g, '"').
  replace(/&#039;/g, "'").
  replace(/\s+/g, " ").
  trim();
}

function speciesHref(species: SpeciesRailItem) {
  const categorySlug = species.genus?.board?.slug;
  const genusSlug = species.genus?.slug;
  if (!categorySlug || !genusSlug) return "/plants";
  return `/plants/${categorySlug}/${genusSlug}/${species.slug}`;
}
