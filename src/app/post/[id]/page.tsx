import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PostBody } from '@/components/post/PostBody';
import { PostActions } from '@/components/post/PostActions';
import { MobileActionBar } from '@/components/post/MobileActionBar';
import { CommentSection } from '@/components/post/CommentSection';
import { JournalTimeline } from '@/components/post/JournalTimeline';
import { PostCard } from '@/components/post/PostCard';
import { PostAdminMenu } from '@/components/post/PostAdminMenu';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { I18nText } from '@/components/ui/I18nText';
import { prisma } from '@/lib/db';
import { postInclude } from '@/lib/post-include';
import { serializePost } from '@/lib/serializers';
import { getCurrentUser } from '@/lib/auth';
import { formatNumber, formatDateTime, boardUrl } from '@/lib/utils';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';
import { lookupLivePhotos } from '@/lib/live-photo';
import type { Metadata } from 'next';
import { parseJsonArray } from '@/lib/api';
import { jsonLdScript, postJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://plantcommunity.cn';

export const dynamic = 'force-dynamic';

/** SEO:用帖子标题 + 摘要做 metadata */
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
  const board = p.species?.name ?? p.genus?.name ?? p.board?.name ?? '';
  const title = p.title;
  const description =
    (p.contentText?.slice(0, 120) ?? '') ||
    `${p.author.name} 在「${board || '肉友社'}」分享的内容`;
  const keywords = [
    ...tags,
    p.species?.name,
    p.genus?.name,
    p.board?.name,
    '多肉',
    '多肉植物',
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    openGraph: {
      type: 'article',
      title,
      description,
      authors: p.author.name,
      images: p.cover ? [{ url: p.cover, alt: p.title }] : undefined,
    },
  };
}

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const postRaw = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      ...postInclude({ withJournalEntries: true }),
      comments: {
        where: { parentId: null, deleted: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          author: {
            include: {
              _count: { select: { posts: true, followers: true, following: true } },
              badges: { include: { badge: true } },
            },
          },
          replies: {
            where: { deleted: false },
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                include: {
                  _count: { select: { posts: true, followers: true, following: true } },
                  badges: { include: { badge: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!postRaw) notFound();

  // 阅读 +1(无阻塞)
  void prisma.post
    .update({ where: { id: params.id }, data: { views: { increment: 1 } } })
    .catch(() => null);

  const post = serializePost(postRaw);

  const me = await getCurrentUser();
  let liked = false;
  let collected = false;
  let myVoteOptions: string[] = [];
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

    if (post.vote) {
      const records = await prisma.voteRecord.findMany({
        where: {
          vote: { postId: post.id },
          userId: me.id,
        },
      });
      myVoteOptions = records.map((r) => r.optionId);
    }
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

  // Live Photo 反查(本帖图片)
  const livePhotoMap =
    post.images && post.images.length > 0
      ? await lookupLivePhotos(post.images)
      : {};

  // 相关帖子
  const relatedRaw = await prisma.post.findMany({
    where: {
      boardId: postRaw.boardId,
      id: { not: post.id },
    },
    take: 4,
    orderBy: { createdAt: 'desc' },
    include: postInclude(),
  });
  let related = relatedRaw.map(serializePost);
  if (related.length === 0) {
    const fRaw = await prisma.post.findMany({
      where: { id: { not: post.id } },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: postInclude(),
    });
    related = fRaw.map(serializePost);
  }

  // SEO: 帖子页 JSON-LD
  const postUrl = `${SITE_URL}/post/${post.id}`;
  const firstImage = post.images?.[0];
  const cover = firstImage
    ? firstImage.startsWith('http') ? firstImage : `${SITE_URL}${firstImage}`
    : undefined;
  const ld = postJsonLd({
    title: post.title || '帖子',
    excerpt: post.content?.replace(/<[^>]*>/g, '').slice(0, 200),
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
    { name: '首页', url: SITE_URL },
    ...(post.board
      ? [{ name: post.board.name, url: `${SITE_URL}/board/${post.board.slug}` }]
      : []),
    { name: post.title || '帖子', url: postUrl },
  ]);

  return (
    <Shell>
      {/* SEO: 帖子页 JSON-LD(DiscussionForumPosting + 面包屑) */}
      {jsonLdScript([ld, breadcrumb])}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* 左侧主内容区 */}
        <div>
          <div className="mb-4 flex items-center gap-1.5 text-xs text-leaf-700/70">
            <Link href="/" className="hover:text-leaf-700">
              <I18nText k="nav.home" fallback="首页" />
            </Link>
            <Icon name="arrow-right" size={12} />
            {post.board.path.map((p, i) => (
              <span key={i} className="contents">
                <Link
                  href={'/board/' + post.board.path.slice(0, i + 1).map((x) => encodeURIComponent(x.slug)).join('/')}
                  className="hover:text-leaf-700"
                >
                  {p.name}
                </Link>
                <Icon name="arrow-right" size={12} />
              </span>
            ))}
            <span className="truncate text-ink-700">{post.title}</span>
          </div>

          <article className="card p-6 md:p-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <PostTypeBadge type={post.type} />
                {post.pinned && (
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
                <Link href={boardUrl(post.board)} className="chip hover:bg-leaf-100">
                  {post.board.icon} {post.board.name}
                </Link>
                {post.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/topic/${encodeURIComponent(t)}`}
                    className="rounded-full bg-leaf-50 px-2.5 py-0.5 text-xs text-leaf-700 hover:bg-leaf-100 transition-colors"
                  >
                    #{t}
                  </Link>
                ))}
              </div>

              <h1 className="mb-4 text-2xl font-bold leading-relaxed text-ink-800 md:text-3xl">
                {post.title}
              </h1>

              <div className="mb-6 flex items-center gap-3 border-b border-leaf-100 pb-4">
                <Link href={`/user/${post.author.id}`}>
                  <Avatar src={post.author.avatar} alt={post.author.name} size={40} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/user/${post.author.id}`}
                    className="text-sm font-medium text-ink-800 hover:text-leaf-700"
                  >
                    {post.author.name}
                  </Link>
                  <div className="text-[11px] text-leaf-700/70">
                    Lv.{post.author.level} · {formatDateTime(post.createdAt)} ·
                    <Icon name="eye" size={11} className="mx-1" />
                    {formatNumber(post.views)} <I18nText k="detail.post.views" fallback="阅读" />
                  </div>
                </div>
                {/* 作者本人 · 仅 rich/short/video 可编辑(其他类型数据复杂禁止) */}
                {me?.id === post.author.id &&
                  ['rich', 'short', 'video'].includes(post.type) && (
                    <Link
                      href={`/post/${post.id}/edit`}
                      className="btn-outline !text-xs"
                    >
                      <Icon name="edit" size={12} />
                      编辑
                    </Link>
                  )}
                {/* 超级管理员按钮 */}
                {me?.isSuperAdmin && <PostAdminMenu post={post} user={me} />}
              </div>

              {/* 审核状态提示(仅作者本人 · 启用审核功能时才显示) */}
              {REVIEW_FILTER_ENABLED &&
                me?.id === post.author.id &&
                postRaw.reviewStatus !== 'published' && (
                  <div
                    className={
                      postRaw.reviewStatus === 'pending'
                        ? 'mb-4 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs text-amber-800'
                        : 'mb-4 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-3 text-xs text-rose-800'
                    }
                  >
                    {postRaw.reviewStatus === 'pending' ? '🕒 ' : '🚫 '}
                    {postRaw.reviewStatus === 'pending'
                      ? '帖子含外链,正在审核中,通过后才会公开展示。'
                      : '帖子被驳回。'}
                    {postRaw.reviewReason && (
                      <div className="mt-1 text-[11px] opacity-80">
                        原因:{postRaw.reviewReason}
                      </div>
                    )}
                  </div>
                )}

              <PostBody
                post={post}
                initialVoted={myVoteOptions}
                initialAttending={attending}
                livePhotoMap={livePhotoMap}
              />
          </article>

          <PostActions post={post} initialLiked={liked} initialCollected={collected} />
          <MobileActionBar post={post} initialLiked={liked} initialCollected={collected} />

          {post.type === 'journal' && post.journal && <JournalTimeline post={post} />}

          <CommentSection post={post} />
        </div>

        {/* 右侧侧边栏 */}
        <aside className="hidden lg:block space-y-4">
          {/* 作者信息卡片 */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <Avatar src={post.author.avatar} alt={post.author.name} size={48} ring />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{post.author.name}</div>
                <div className="mt-0.5 line-clamp-2 text-[11px] text-leaf-700/70">
                  {post.author.bio}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 border-t border-leaf-100 pt-3 text-center text-xs">
              <div>
                <div className="font-semibold text-ink-800">{post.author.posts}</div>
                <div className="text-leaf-700/70"><I18nText k="detail.post.postsLabel" fallback="帖子" /></div>
              </div>
              <div>
                <div className="font-semibold text-ink-800">{formatNumber(post.author.followers)}</div>
                <div className="text-leaf-700/70"><I18nText k="detail.post.followersLabel" fallback="粉丝" /></div>
              </div>
              <div>
                <div className="font-semibold text-ink-800">{formatNumber(post.author.following)}</div>
                <div className="text-leaf-700/70"><I18nText k="detail.post.followingLabel" fallback="关注" /></div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link href={`/user/${post.author.id}`} className="btn-outline flex-1 justify-center !text-xs">
                <I18nText k="nav.myProfile" fallback="主页" />
              </Link>
              <Link href={`/messages?to=${post.author.id}`} className="btn-primary flex-1 justify-center !text-xs">
                <I18nText k="nav.messages" fallback="私信" />
              </Link>
            </div>
          </div>

          {/* 相关帖子 */}
          <div className="card p-4">
            <div className="mb-3 text-sm font-semibold text-ink-800">📖 <I18nText k="detail.post.related" fallback="本版相关" /></div>
            <div className="space-y-3">
              {related.map((p) => (
                <PostCard key={p.id} post={p} layout="compact" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
