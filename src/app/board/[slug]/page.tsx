import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PostCard } from '@/components/post/PostCard';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { formatNumber } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { prisma } from '@/lib/db';
import { serializeBoard, serializePost, serializeUser } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';

export const dynamic = 'force-dynamic';

export default async function BoardPage({ params }: { params: { slug: string } }) {
  const boardRaw = await prisma.board.findUnique({
    where: { slug: params.slug },
    include: { _count: { select: { posts: true } } },
  });
  if (!boardRaw) notFound();

  const board = serializeBoard(boardRaw);

  const postsRaw = await prisma.post.findMany({
    where: { boardId: board.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: postInclude(),
  });
  const boardPosts = postsRaw.map(serializePost);

  // 兜底:其它板块最新的 4 篇作为推荐
  let fallback = boardPosts;
  if (boardPosts.length === 0) {
    const fRaw = await prisma.post.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: postInclude(),
    });
    fallback = fRaw.map(serializePost);
  }

  // 活跃用户
  const authorIds = Array.from(new Set(postsRaw.map((p) => p.authorId))).slice(0, 5);
  const activeUsersRaw = authorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: authorIds } },
        include: {
          _count: { select: { posts: true, followers: true, following: true } },
          badges: { include: { badge: true } },
        },
      })
    : [];
  const activeUsers = activeUsersRaw.map(serializeUser);

  // 其它板块
  const otherBoardsRaw = await prisma.board.findMany({
    where: { id: { not: board.id } },
    take: 5,
    orderBy: { orderIdx: 'asc' },
    include: { _count: { select: { posts: true } } },
  });
  const otherBoards = otherBoardsRaw.map(serializeBoard);

  return (
    <Shell>
      {/* Banner */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-leaf-100">
        <div className="relative aspect-[21/7] w-full">
          <Image src={board.cover} alt={board.name} fill className="object-cover" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-900/70 via-ink-900/40 to-transparent" />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{board.icon}</span>
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">{board.name}</h1>
              <p className="mt-1 max-w-xl text-xs opacity-90 md:text-sm">{board.description}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <span>👥 {formatNumber(board.members)} 成员</span>
            <span>📝 {formatNumber(board.posts)} 贴</span>
            <Link
              href={`/editor?board=${board.slug}`}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-leaf-700 hover:bg-leaf-50"
            >
              <Icon name="plus" size={13} />
              发新帖
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_260px]">
        <div>
          <div className="mb-4 flex items-center gap-2 border-b border-leaf-100 pb-2">
            <FilterChip active>最新</FilterChip>
            <FilterChip>热门</FilterChip>
            <FilterChip>精华</FilterChip>
            <div className="ml-auto text-xs text-leaf-700/70">
              共 {boardPosts.length || fallback.length} 帖
            </div>
          </div>

          {boardPosts.length === 0 ? (
            <>
              <Empty
                icon="🌱"
                title="这个板块还没有人发过帖子"
                desc="成为第一个分享的人吧"
              />
              <div className="mt-6">
                <div className="mb-3 text-xs font-medium text-leaf-700/70">你可能也感兴趣</div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {fallback.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {boardPosts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>

        {/* 右侧边栏 */}
        <div className="space-y-5">
          <div className="card p-4">
            <div className="mb-3 text-sm font-semibold text-ink-800">📌 置顶与公告</div>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 rounded bg-rose-500/10 px-1 text-[10px] text-rose-600">置顶</span>
                <span className="text-ink-700">新人请先看:板块规则与发帖规范</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 rounded bg-amber-500/10 px-1 text-[10px] text-amber-700">公告</span>
                <span className="text-ink-700">{board.name}夏季度夏指南已更新</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 rounded bg-leaf-500/10 px-1 text-[10px] text-leaf-700">精华</span>
                <span className="text-ink-700">年度精选:最美状态图集锦</span>
              </li>
            </ul>
          </div>

          <div className="card p-4">
            <div className="mb-3 text-sm font-semibold text-ink-800">👑 活跃肉友</div>
            {activeUsers.length === 0 ? (
              <div className="text-xs text-leaf-700/60">暂无数据</div>
            ) : (
              <ul className="space-y-2">
                {activeUsers.map((u) => (
                  <li key={u.id} className="flex items-center gap-2.5">
                    <Link href={`/user/${u.id}`}>
                      <Avatar src={u.avatar} alt={u.name} size={32} />
                    </Link>
                    <Link href={`/user/${u.id}`} className="min-w-0 flex-1 text-sm hover:text-leaf-700">
                      <div className="truncate font-medium">{u.name}</div>
                      <div className="text-[11px] text-leaf-700/70">Lv.{u.level}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-4">
            <div className="mb-2 text-sm font-semibold text-ink-800">🔗 相关板块</div>
            <ul className="space-y-1.5 text-xs">
              {otherBoards.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/board/${b.slug}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-leaf-50"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{b.icon}</span>
                      {b.name}
                    </span>
                    <span className="text-leaf-600/70">{formatNumber(b.posts)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function FilterChip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={
        'rounded-full px-3 py-1 text-xs ' +
        (active ? 'bg-leaf-100 text-leaf-800 font-medium' : 'text-ink-700/70 hover:bg-leaf-50')
      }
    >
      {children}
    </button>
  );
}
