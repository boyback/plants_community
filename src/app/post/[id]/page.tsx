import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PostActions } from "@/components/post/PostActions";
import { MobileActionBar } from "@/components/post/MobileActionBar";
import { JournalTimeline } from "@/components/post/JournalTimeline";
import { PostAdminMenu } from "@/components/post/PostAdminMenu";
import { PostTypeBadge } from "@/components/ui/PostTypeBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { prisma } from "@/lib/db";
import { postInclude } from "@/lib/post-include";
import { serializePost, serializeSkin } from "@/lib/serializers";
import { getCurrentUser } from "@/lib/auth";
import { formatNumber, formatDateTime, timeAgo } from "@/lib/utils";
import { REVIEW_FILTER_ENABLED } from "@/lib/feature-flags";
import { lookupLivePhotos } from "@/lib/live-photo";
import type { Metadata } from "next";
import type { Post, SkinItem } from "@/lib/types";
import { parseJsonArray } from "@/lib/api";
import { jsonLdScript, postJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { PostBody } from "@/components/post/PostBody";
import { CommentSection } from "@/components/post/CommentSection";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://plantcommunity.cn";

export const dynamic = "force-dynamic";

type TocItem = {
  title: string;
  depth: 2 | 3;
};

type TagCount = {
  name: string;
  count: number;
};

type SpeciesRailItem = {
  id: string;
  slug: string;
  name: string;
  latinName?: string | null;
  description?: string | null;
  cover?: string | null;
  genus?: {
    slug: string;
    board?: { slug: string } | null;
  } | null;
  _count?: {
    posts?: number;
    collects?: number;
    ratings?: number;
  };
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const p = await prisma.post
    .findUnique({
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
        board: { select: { name: true } },
      },
    })
    .catch(() => null);
  if (!p || p.deleted) return {};

  const tags = parseJsonArray(p.tags);
  const board = p.species?.name ?? p.genus?.name ?? p.board?.name ?? "";
  const title = p.title;
  const description =
    (p.contentText?.slice(0, 120) ?? "") ||
    `${p.author.name} 在「${board || "肉友社"}」分享的内容`;
  const keywords = [
    ...tags,
    p.species?.name,
    p.genus?.name,
    p.board?.name,
    "多肉",
    "多肉植物",
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    openGraph: {
      type: "article",
      title,
      description,
      authors: p.author.name,
      images: p.cover ? [{ url: p.cover, alt: p.title }] : undefined,
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const postRaw = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      ...postInclude({ withJournalEntries: true }),
      comments: {
        where: { parentId: null, deleted: false },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          author: {
            include: {
              _count: {
                select: { posts: true, followers: true, following: true },
              },
              badges: { include: { badge: true } },
            },
          },
          replies: {
            where: { deleted: false },
            orderBy: { createdAt: "asc" },
            include: {
              author: {
                include: {
                  _count: {
                    select: { posts: true, followers: true, following: true },
                  },
                  badges: { include: { badge: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!postRaw || postRaw.deleted) notFound();

  void prisma.post
    .update({ where: { id: params.id }, data: { views: { increment: 1 } } })
    .catch(() => null);

  const me = await getCurrentUser();
  const post = serializePost(postRaw, undefined, undefined, me);
  let liked = false;
  let collected = false;
  let attending = false;

  if (me) {
    const [l, c] = await Promise.all([
      prisma.postLike.findUnique({
        where: { userId_postId: { userId: me.id, postId: post.id } },
      }),
      prisma.postCollect.findUnique({
        where: { userId_postId: { userId: me.id, postId: post.id } },
      }),
    ]);
    liked = !!l;
    collected = !!c;

    if (post.event) {
      const ev = await prisma.event.findUnique({ where: { postId: post.id } });
      if (ev) {
        const a = await prisma.eventAttendee.findUnique({
          where: { eventId_userId: { eventId: ev.id, userId: me.id } },
        });
        attending = !!a;
      }
    }
  }

  const livePhotoMap =
    post.images && post.images.length > 0
      ? await lookupLivePhotos(post.images)
      : {};
  const commentAuthorPendantPairs = [
    ...postRaw.comments.map((comment) => ({
      authorId: comment.author.id,
      pendantId: comment.author.equipPendantId,
    })),
    ...postRaw.comments.flatMap((comment) =>
      comment.replies.map((reply) => ({
        authorId: reply.author.id,
        pendantId: reply.author.equipPendantId,
      }))
    ),
  ].filter((item): item is { authorId: string; pendantId: string } =>
    Boolean(item.pendantId)
  );
  const commentAuthorPendantIds = commentAuthorPendantPairs.map((item) => item.pendantId);
  const commentAuthorPendantRows =
    commentAuthorPendantIds.length > 0
      ? await prisma.skinItem.findMany({
          where: { id: { in: [...new Set(commentAuthorPendantIds)] } },
        })
      : [];
  const commentPendantById = new Map(
    commentAuthorPendantRows.map((skin) => [skin.id, serializeSkin(skin)])
  );
  const commentAuthorPendants = Object.fromEntries(
    commentAuthorPendantPairs
      .map((item) => [item.authorId, commentPendantById.get(item.pendantId)] as const)
      .filter((item): item is readonly [string, SkinItem] => Boolean(item[1]))
  ) as Record<string, SkinItem>;

  const visiblePostWhere = {
    deleted: false,
    ...(REVIEW_FILTER_ENABLED ? { reviewStatus: "published" as const } : {}),
  };

  const [
    relatedRaw,
    fallbackRelatedRaw,
    authorMoreRaw,
    hotTagRows,
    hotPostsRaw,
    communityEventsRaw,
    speciesDetail,
  ] = await Promise.all([
    prisma.post.findMany({
      where: {
        ...visiblePostWhere,
        id: { not: post.id },
        ...(postRaw.speciesId
          ? { speciesId: postRaw.speciesId }
          : postRaw.genusId
            ? { genusId: postRaw.genusId }
            : postRaw.boardId
              ? { boardId: postRaw.boardId }
              : {}),
      },
      take: 4,
      orderBy: { createdAt: "desc" },
      include: postInclude(),
    }),
    prisma.post.findMany({
      where: { ...visiblePostWhere, id: { not: post.id } },
      take: 4,
      orderBy: { hotScore: "desc" },
      include: postInclude(),
    }),
    prisma.post.findMany({
      where: {
        ...visiblePostWhere,
        authorId: postRaw.authorId,
        id: { not: post.id },
      },
      take: 4,
      orderBy: { createdAt: "desc" },
      include: postInclude(),
    }),
    prisma.post.findMany({
      where: visiblePostWhere,
      select: { tags: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.post.findMany({
      where: { ...visiblePostWhere, id: { not: post.id } },
      take: 5,
      orderBy: [{ hotScore: "desc" }, { createdAt: "desc" }],
      include: postInclude(),
    }),
    prisma.post.findMany({
      where: { ...visiblePostWhere, type: "event" },
      take: 3,
      orderBy: { createdAt: "desc" },
      include: postInclude(),
    }),
    postRaw.speciesId
      ? prisma.species.findUnique({
          where: { id: postRaw.speciesId },
          include: {
            genus: { include: { board: true } },
            _count: { select: { posts: true, collects: true, ratings: true } },
          },
        })
      : Promise.resolve(null),
  ]);

  const sameGenusSpecies = speciesDetail
    ? await prisma.species.findMany({
        where: {
          genusId: speciesDetail.genusId,
          id: { not: speciesDetail.id },
        },
        include: {
          genus: { include: { board: true } },
          _count: { select: { posts: true, collects: true, ratings: true } },
        },
        take: 4,
        orderBy: [{ orderIdx: "asc" }, { createdAt: "desc" }],
      })
    : [];

  const related =
    relatedRaw.length > 0
      ? relatedRaw.map((p) => serializePost(p))
      : fallbackRelatedRaw.map((p) => serializePost(p));
  const authorMore = authorMoreRaw.map((p) => serializePost(p));
  const hotPosts = hotPostsRaw.map((p) => serializePost(p));
  const communityEvents = communityEventsRaw.map((p) => serializePost(p));
  const tagCounts = buildTagCounts(hotTagRows.map((row) => row.tags));
  const toc = buildArticleToc(post.content, post.contentText);

  const postUrl = `${SITE_URL}/post/${post.id}`;
  const cover = post.cover
    ? post.cover.startsWith("http")
      ? post.cover
      : `${SITE_URL}${post.cover}`
    : undefined;
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
    comments: post.comments,
  });
  const breadcrumb = breadcrumbJsonLd([
    { name: "首页", url: SITE_URL },
    ...(post.board
      ? [{ name: post.board.name, url: `${SITE_URL}/board/${post.board.slug}` }]
      : []),
    { name: post.title || "帖子", url: postUrl },
  ]);

  return (
    <AppShell
      showFloatingAi={false}
      className="xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]"
      rightRail={
        <PostDetailRightRail
          post={post}
          toc={toc}
          relatedTags={post.tags}
          hotTags={tagCounts}
          related={related}
          authorMore={authorMore}
          hotPosts={hotPosts}
          species={speciesDetail}
          sameGenusSpecies={sameGenusSpecies}
          communityEvents={communityEvents}
        />
      }
    >
      {jsonLdScript([ld, breadcrumb])}

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_clamp(520px,32vw,760px)] 2xl:items-start">
        <div className="min-w-0 space-y-5">
        <article className="overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm">
          <div className="border-b border-leaf-100/80 px-5 py-4 md:px-7">
            <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-leaf-700/70">
              <Link href="/" className="hover:text-leaf-800">
                社区
              </Link>
              <Icon name="arrow-right" size={12} />
              {post.board.path.map((p, i) => (
                <span key={`${p.slug}-${i}`} className="contents">
                  <Link
                    href={
                      "/board/" +
                      post.board.path
                        .slice(0, i + 1)
                        .map((x) => encodeURIComponent(x.slug))
                        .join("/")
                    }
                    className="hover:text-leaf-800"
                  >
                    {p.name}
                  </Link>
                  <Icon name="arrow-right" size={12} />
                </span>
              ))}
              <span className="text-ink-500">帖子详情</span>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <PostTypeBadge type={post.type} />
              {post.pinState?.any && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  <Icon name="pin" size={12} />
                  置顶
                </span>
              )}
              {post.locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-600">
                  <Icon name="lock" size={12} />
                  已锁定
                </span>
              )}
            </div>

            <div className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-[24px] font-bold leading-snug text-ink-950 md:text-[30px]">
                  {post.title}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-500">
                  <Link
                    href={`/user/${post.author.id}`}
                    className="flex items-center gap-2 text-ink-800 hover:text-leaf-800"
                  >
                    <Avatar
                      src={post.author.avatar}
                      alt={post.author.name}
                      size={30}
                    />
                    <span className="font-semibold">{post.author.name}</span>
                    <span className="rounded-full bg-leaf-50 px-2 py-0.5 text-[11px] text-leaf-800">
                      Lv.{post.author.level}
                    </span>
                  </Link>
                  <span>{formatDateTime(post.createdAt)}</span>
                  {post.updatedAt && post.updatedAt !== post.createdAt && (
                    <span>编辑于 {formatDateTime(post.updatedAt)}</span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Icon name="eye" size={13} />
                    {formatNumber(post.views)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="comment" size={13} />
                    {formatNumber(post.comments)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="heart" size={13} />
                    {formatNumber(post.likes)}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {me?.id === post.author.id && post.adminPermissions?.canEdit && (
                  <Link
                    href={`/post/${post.id}/edit`}
                    className="hidden h-9 items-center gap-1.5 rounded-xl border border-leaf-100 px-3 text-xs font-semibold text-leaf-800 hover:bg-leaf-50 md:inline-flex"
                  >
                    <Icon name="edit" size={13} />
                    编辑
                  </Link>
                )}
                <PostAdminMenu post={post} user={me} buttonSize="md" />
              </div>
            </div>

            {post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/topic/${encodeURIComponent(t)}`}
                    className="rounded-full bg-leaf-50 px-3 py-1 text-xs font-medium text-leaf-800 transition-colors hover:bg-leaf-100"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-5 md:px-7 md:py-6">
            {REVIEW_FILTER_ENABLED &&
              me?.id === post.author.id &&
              postRaw.reviewStatus !== "published" && (
                <div
                  className={
                    postRaw.reviewStatus === "pending"
                      ? "mb-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-800"
                      : "mb-4 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-xs text-rose-800"
                  }
                >
                  {postRaw.reviewStatus === "pending"
                    ? "帖子正在审核中，通过后才会公开展示。"
                    : "帖子已被驳回。"}
                  {postRaw.reviewReason && (
                    <div className="mt-1 text-[11px] opacity-80">
                      原因：{postRaw.reviewReason}
                    </div>
                  )}
                </div>
              )}

            <PostBody
              post={post}
              livePhotoMap={livePhotoMap}
              initialAttending={attending}
            />
          </div>

          <PostActions
            post={post}
            initialLiked={liked}
            initialCollected={collected}
          />
        </article>

        {post.type === "journal" && post.journal && (
          <JournalTimeline post={post} />
        )}

        </div>

        <div className="min-w-0 2xl:sticky 2xl:top-[88px] 2xl:max-h-[calc(100vh-104px)] 2xl:overflow-y-auto">
          <CommentSection post={post} authorPendants={commentAuthorPendants} />
        </div>

        <MobileActionBar
          post={post}
          initialLiked={liked}
          initialCollected={collected}
        />
      </div>
    </AppShell>
  );
}

function PostDetailRightRail({
  post,
  toc,
  relatedTags,
  hotTags,
  related,
  authorMore,
  hotPosts,
  species,
  sameGenusSpecies,
  communityEvents,
}: {
  post: Post;
  toc: TocItem[];
  relatedTags: string[];
  hotTags: TagCount[];
  related: Post[];
  authorMore: Post[];
  hotPosts: Post[];
  species: SpeciesRailItem | null;
  sameGenusSpecies: SpeciesRailItem[];
  communityEvents: Post[];
}) {
  return (
    <>
      <SideCard title="作者信息">
        <div className="flex items-center gap-3">
          <Avatar src={post.author.avatar} alt={post.author.name} size={52} ring />
          <div className="min-w-0 flex-1">
            <Link
              href={`/user/${post.author.id}`}
              className="block truncate text-sm font-bold text-ink-950 hover:text-leaf-800"
            >
              {post.author.name}
            </Link>
            <div className="mt-1 text-xs text-leaf-700">Lv.{post.author.level}</div>
          </div>
        </div>
        {post.author.bio && (
          <p className="mt-3 line-clamp-2 text-xs leading-5 text-ink-500">
            {post.author.bio}
          </p>
        )}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <RailStat label="帖子" value={formatNumber(post.author.posts)} />
          <RailStat label="图鉴收藏" value={formatNumber(post.author.pointsBalance)} />
          <RailStat label="关注" value={formatNumber(post.author.followers)} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={`/user/${post.author.id}`}
            className="rounded-xl bg-leaf-600 px-4 py-2 text-center text-xs font-semibold text-white hover:bg-leaf-700"
          >
            关注
          </Link>
          <Link
            href={`/messages?to=${post.author.id}`}
            className="rounded-xl border border-leaf-100 px-4 py-2 text-center text-xs font-semibold text-ink-700 hover:bg-leaf-50"
          >
            私信
          </Link>
        </div>
      </SideCard>

      <SideCard title="文章目录">
        {toc.length > 0 ? (
          <ol className="space-y-2 text-xs text-ink-600">
            {toc.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className={item.depth === 3 ? "pl-4 text-ink-500" : ""}
              >
                <span className="mr-2 text-leaf-700">{index + 1}.</span>
                {item.title}
              </li>
            ))}
          </ol>
        ) : (
          <div className="text-xs text-ink-400">正文暂无可提取目录</div>
        )}
      </SideCard>

      {(relatedTags.length > 0 || hotTags.length > 0) && (
        <SideCard title="相关标签">
          <div className="flex flex-wrap gap-2">
            {[...relatedTags, ...hotTags.map((tag) => tag.name)]
              .filter((tag, index, arr) => arr.indexOf(tag) === index)
              .slice(0, 10)
              .map((tag) => (
                <Link
                  key={tag}
                  href={`/topic/${encodeURIComponent(tag)}`}
                  className="rounded-full bg-leaf-50 px-3 py-1.5 text-xs font-medium text-leaf-800 hover:bg-leaf-100"
                >
                  {tag}
                </Link>
              ))}
          </div>
        </SideCard>
      )}

      {hotTags.length > 0 && (
        <SideCard title="热门话题">
          <div className="space-y-2">
            {hotTags.slice(0, 5).map((tag) => (
              <Link
                key={tag.name}
                href={`/topic/${encodeURIComponent(tag.name)}`}
                className="flex items-center justify-between rounded-xl px-2 py-1.5 text-xs hover:bg-leaf-50"
              >
                <span className="font-medium text-ink-700"># {tag.name}</span>
                <span className="text-ink-400">{formatNumber(tag.count)} 帖子</span>
              </Link>
            ))}
          </div>
        </SideCard>
      )}

      {related.length > 0 && (
        <SideCard title="相关帖子推荐" footerHref="/board" footerLabel="查看更多">
          <div className="space-y-3">
            {related.map((item) => (
              <MiniPostItem key={item.id} post={item} />
            ))}
          </div>
        </SideCard>
      )}

      {authorMore.length > 0 && (
        <SideCard title="作者更多内容" footerHref={`/user/${post.author.id}`} footerLabel="查看更多">
          <div className="space-y-3">
            {authorMore.map((item) => (
              <MiniPostItem key={item.id} post={item} compact />
            ))}
          </div>
        </SideCard>
      )}

      {species && <PlantAtlasCard species={species} />}

      {sameGenusSpecies.length > 0 && (
        <SideCard title="同属植物推荐" footerHref="/plants" footerLabel="查看更多">
          <div className="grid grid-cols-4 gap-2">
            {sameGenusSpecies.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href={speciesHref(item)}
                className="group min-w-0"
                title={item.name}
              >
                <div className="aspect-square overflow-hidden rounded-xl bg-leaf-50">
                  {item.cover ? (
                    <img
                      src={item.cover}
                      alt={item.name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-leaf-700">
                      <Icon name="plants" size={18} />
                    </div>
                  )}
                </div>
                <div className="mt-1 truncate text-center text-[11px] text-ink-700">
                  {item.name}
                </div>
              </Link>
            ))}
          </div>
        </SideCard>
      )}

      {communityEvents.length > 0 && (
        <SideCard title="社区活动">
          <div className="space-y-2">
            {communityEvents.map((item) => (
              <Link
                key={item.id}
                href={`/post/${item.id}`}
                className="block rounded-xl bg-leaf-50/70 px-3 py-2 hover:bg-leaf-100/80"
              >
                <div className="line-clamp-1 text-xs font-semibold text-ink-800">
                  {item.title}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-ink-500">
                  <span>{timeAgo(item.createdAt)}</span>
                  <span>{formatNumber(item.views)} 浏览</span>
                </div>
              </Link>
            ))}
          </div>
        </SideCard>
      )}

      {hotPosts.length > 0 && (
        <SideCard title="社区热帖">
          <div className="space-y-3">
            {hotPosts.slice(0, 4).map((item) => (
              <MiniPostItem key={item.id} post={item} compact />
            ))}
          </div>
        </SideCard>
      )}
    </>
  );
}

function SideCard({
  title,
  children,
  footerHref,
  footerLabel,
}: {
  title: string;
  children: React.ReactNode;
  footerHref?: string;
  footerLabel?: string;
}) {
  return (
    <section className="rounded-2xl border border-leaf-100 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-bold text-ink-950">{title}</div>
      {children}
      {footerHref && footerLabel && (
        <Link
          href={footerHref}
          className="mt-4 block border-t border-leaf-100 pt-3 text-center text-xs font-medium text-leaf-800 hover:text-leaf-900"
        >
          {footerLabel} &gt;
        </Link>
      )}
    </section>
  );
}

function RailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-leaf-50 px-2 py-2">
      <div className="text-sm font-bold text-ink-950">{value}</div>
      <div className="mt-0.5 text-[11px] text-ink-500">{label}</div>
    </div>
  );
}

function MiniPostItem({ post, compact }: { post: Post; compact?: boolean }) {
  const image = post.cover ?? post.images?.[0];
  return (
    <Link href={`/post/${post.id}`} className="group flex gap-3">
      <div
        className={
          compact
            ? "h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-leaf-50"
            : "h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-leaf-50"
        }
      >
        {image ? (
          <img
            src={image}
            alt={post.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-leaf-700">
            <Icon name="image" size={18} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-xs font-semibold leading-5 text-ink-800 group-hover:text-leaf-800">
          {post.title}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-400">
          <span>{formatNumber(post.views)} 阅读</span>
          <span>{formatNumber(post.likes)} 喜欢</span>
        </div>
      </div>
    </Link>
  );
}

function PlantAtlasCard({ species }: { species: SpeciesRailItem }) {
  return (
    <SideCard title="植物图鉴卡片">
      <div className="flex gap-3">
        <Link
          href={speciesHref(species)}
          className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-leaf-50"
        >
          {species.cover ? (
            <img
              src={species.cover}
              alt={species.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-leaf-700">
              <Icon name="plants" size={22} />
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={speciesHref(species)}
            className="truncate text-sm font-bold text-ink-950 hover:text-leaf-800"
          >
            {species.name}
          </Link>
          {species.latinName && (
            <div className="mt-1 truncate text-[11px] italic text-ink-400">
              {species.latinName}
            </div>
          )}
          {species.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-500">
              {species.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <RailStat label="人收藏" value={formatNumber(species._count?.collects ?? 0)} />
        <RailStat label="帖子" value={formatNumber(species._count?.posts ?? 0)} />
        <RailStat label="评分" value={formatNumber(species._count?.ratings ?? 0)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={speciesHref(species)}
          className="rounded-xl bg-leaf-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-leaf-700"
        >
          查看图鉴
        </Link>
        <Link
          href="/plants/favorites"
          className="rounded-xl border border-leaf-100 px-3 py-2 text-center text-xs font-semibold text-ink-700 hover:bg-leaf-50"
        >
          已收藏
        </Link>
      </div>
    </SideCard>
  );
}

function buildTagCounts(rawTags: Array<string | null>): TagCount[] {
  const counts = new Map<string, number>();
  for (const row of rawTags) {
    for (const tag of parseJsonArray(row)) {
      const normalized = tag.trim();
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function buildArticleToc(html?: string, text?: string): TocItem[] {
  const headings = [...(html ?? "").matchAll(/<h([23])[^>]*>(.*?)<\/h[23]>/gi)]
    .map((match) => ({
      depth: Number(match[1]) === 3 ? (3 as const) : (2 as const),
      title: cleanText(match[2]),
    }))
    .filter((item) => item.title.length > 0)
    .slice(0, 8);

  if (headings.length > 0) return headings;

  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter((line) => /^\d+[.、]/.test(line) || line.length >= 6)
    .slice(0, 5)
    .map((title) => ({ title: title.replace(/^\d+[.、]\s*/, ""), depth: 2 as const }));
}

function cleanText(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function speciesHref(species: SpeciesRailItem) {
  const categorySlug = species.genus?.board?.slug;
  const genusSlug = species.genus?.slug;
  if (!categorySlug || !genusSlug) return "/plants";
  return `/plants/${categorySlug}/${genusSlug}/${species.slug}`;
}
