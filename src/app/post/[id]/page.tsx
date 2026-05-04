import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PostBody } from '@/components/post/PostBody';
import { PostActions } from '@/components/post/PostActions';
import { CommentSection } from '@/components/post/CommentSection';
import { PostCard } from '@/components/post/PostCard';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { prisma } from '@/lib/db';
import { postInclude } from '@/lib/post-include';
import { serializePost } from '@/lib/serializers';
import { getCurrentUser } from '@/lib/auth';
import { formatNumber, formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const postRaw = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      ...postInclude(),
      comments: {
        where: { parentId: null },
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

  return (
    <Shell>
      <div className="mb-4 flex items-center gap-1.5 text-xs text-leaf-700/70">
        <Link href="/" className="hover:text-leaf-700">
          首页
        </Link>
        <Icon name="arrow-right" size={12} />
        <Link href={`/board/${post.board.slug}`} className="hover:text-leaf-700">
          {post.board.name}
        </Link>
        <Icon name="arrow-right" size={12} />
        <span className="truncate text-ink-700">{post.title}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        <div className="space-y-4 min-w-0">
          <article className="card p-6 md:p-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <PostTypeBadge type={post.type} />
              <Link href={`/board/${post.board.slug}`} className="chip hover:bg-leaf-100">
                {post.board.icon} {post.board.name}
              </Link>
              {post.tags.map((t) => (
                <span key={t} className="text-xs text-leaf-700/70">
                  #{t}
                </span>
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
                  {formatNumber(post.views)} 阅读
                </div>
              </div>
            </div>

            <PostBody
              post={post}
              initialVoted={myVoteOptions}
              initialAttending={attending}
            />
          </article>

          <PostActions post={post} initialLiked={liked} initialCollected={collected} />

          <CommentSection post={post} />
        </div>

        <div className="space-y-5">
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
                <div className="text-leaf-700/70">帖子</div>
              </div>
              <div>
                <div className="font-semibold text-ink-800">{formatNumber(post.author.followers)}</div>
                <div className="text-leaf-700/70">粉丝</div>
              </div>
              <div>
                <div className="font-semibold text-ink-800">{formatNumber(post.author.following)}</div>
                <div className="text-leaf-700/70">关注</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link href={`/user/${post.author.id}`} className="btn-outline flex-1 justify-center !text-xs">
                主页
              </Link>
              <Link href={`/messages?to=${post.author.id}`} className="btn-primary flex-1 justify-center !text-xs">
                私信
              </Link>
            </div>
          </div>

          <div className="card p-4">
            <div className="mb-3 text-sm font-semibold text-ink-800">📖 本版相关</div>
            <div className="space-y-3">
              {related.map((p) => (
                <PostCard key={p.id} post={p} layout="compact" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
