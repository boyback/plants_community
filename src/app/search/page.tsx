/**
 * 搜索结果页 /search?q=xxx&tab=all|posts|species|boards|users
 *
 * SSR 渲染 + 4 维并行查询 + 关键词高亮
 *
 * tab 设计:
 *   - all:  4 类各取 8 条预览,有「查看更多」跳到对应 tab
 *   - posts/species/boards/users:单类全量(目前最多 30 条)
 */
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';
import { Avatar } from '@/components/ui/Avatar';
import { Highlight } from '@/components/ui/Highlight';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type TabKey = 'all' | 'posts' | 'species' | 'boards' | 'users';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'posts', label: '📝 帖子' },
  { key: 'species', label: '🌱 图鉴' },
  { key: 'boards', label: '🏷️ 板块' },
  { key: 'users', label: '👥 肉友' },
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { q?: string };
}): Promise<Metadata> {
  const q = (searchParams.q || '').trim();
  return {
    title: q ? `${q} · 站内搜索 · 肉友社` : '搜索 · 肉友社',
    description: q ? `搜索「${q}」相关的多肉帖子、品种、板块、肉友` : '在肉友社搜索内容',
    robots: 'noindex, follow',
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; tab?: string };
}) {
  const q = (searchParams.q || '').trim();
  const tab = ((searchParams.tab as TabKey) || 'all') as TabKey;
  const tabValid: TabKey = TABS.some((t) => t.key === tab) ? tab : 'all';

  if (!q) {
    return (
      <Shell>
        <EmptyHint />
      </Shell>
    );
  }

  // 各 tab 取数:all=每类 8 条,单类 tab=30 条
  const PER = tabValid === 'all' ? 8 : 30;
  const want = (k: TabKey) => tabValid === 'all' || tabValid === k;

  const [posts, species, boards, users, totalCounts] = await Promise.all([
    want('posts')
      ? prisma.post.findMany({
          where: {
            deleted: false,
            ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
            OR: [{ title: { contains: q } }, { content: { contains: q } }],
          },
          select: {
            id: true,
            title: true,
            content: true,
            cover: true,
            createdAt: true,
            author: { select: { id: true, name: true, handle: true, avatar: true } },
            _count: { select: { likes: true, comments: true } },
          },
          orderBy: [{ hotScore: 'desc' }, { createdAt: 'desc' }],
          take: PER,
        })
      : Promise.resolve([]),
    want('species')
      ? prisma.species.findMany({
          where: {
            OR: [{ name: { contains: q } }, { latinName: { contains: q } }],
          },
          include: { genus: { include: { category: true } } },
          orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
          take: PER,
        })
      : Promise.resolve([]),
    want('boards')
      ? prisma.category.findMany({
          where: {
            OR: [{ name: { contains: q } }, { description: { contains: q } }],
          },
          orderBy: { name: 'asc' },
          take: PER,
        })
      : Promise.resolve([]),
    want('users')
      ? prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: q } },
              { handle: { contains: q } },
              { bio: { contains: q } },
            ],
          },
          select: {
            id: true,
            name: true,
            handle: true,
            avatar: true,
            bio: true,
            level: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: PER,
        })
      : Promise.resolve([]),
    // 顶部 tab 数字徽章用 — 4 维总数,各自独立 count
    Promise.all([
      prisma.post.count({
        where: {
          deleted: false,
          ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
          OR: [{ title: { contains: q } }, { content: { contains: q } }],
        },
      }),
      prisma.species.count({
        where: { OR: [{ name: { contains: q } }, { latinName: { contains: q } }] },
      }),
      prisma.category.count({
        where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] },
      }),
      prisma.user.count({
        where: {
          OR: [
            { name: { contains: q } },
            { handle: { contains: q } },
            { bio: { contains: q } },
          ],
        },
      }),
    ]),
  ]);

  const [cntPosts, cntSpecies, cntBoards, cntUsers] = totalCounts;
  const tabCounts: Record<TabKey, number | null> = {
    all: cntPosts + cntSpecies + cntBoards + cntUsers,
    posts: cntPosts,
    species: cntSpecies,
    boards: cntBoards,
    users: cntUsers,
  };
  const totalAll = tabCounts.all;

  return (
    <Shell>
      <div className="mb-3">
        <h1 className="text-xl font-bold text-ink-800">
          搜索:<span className="text-leaf-700">{q}</span>
        </h1>
        <p className="mt-1 text-xs text-leaf-700/70">找到 {totalAll} 条结果</p>
      </div>

      {/* tab 切换 */}
      <div className="mb-5 flex flex-wrap gap-1 border-b border-leaf-100">
        {TABS.map((t) => {
          const active = t.key === tabValid;
          const count = tabCounts[t.key];
          return (
            <Link
              key={t.key}
              href={`/search?q=${encodeURIComponent(q)}&tab=${t.key}`}
              className={cn(
                'relative px-3 py-2 text-sm font-medium transition-colors',
                active ? 'text-leaf-700' : 'text-ink-700/60 hover:text-leaf-700',
              )}
            >
              {t.label}
              {count !== null && count > 0 && (
                <span
                  className={cn(
                    'ml-1 rounded-full px-1.5 py-0.5 text-[10px]',
                    active ? 'bg-leaf-100 text-leaf-700' : 'bg-leaf-50 text-leaf-700/70',
                  )}
                >
                  {count}
                </span>
              )}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-leaf-500" />
              )}
            </Link>
          );
        })}
      </div>

      {totalAll === 0 ? (
        <div className="card p-12 text-center text-sm text-leaf-700/60">
          没有找到相关内容,试试其他关键词
        </div>
      ) : (
        <div className="space-y-6">
          {/* 帖子 */}
          {(tabValid === 'all' || tabValid === 'posts') && posts.length > 0 && (
            <Section title={`📝 帖子`} count={cntPosts} viewMore={tabValid === 'all' && cntPosts > posts.length ? `/search?q=${encodeURIComponent(q)}&tab=posts` : null}>
              <div className="space-y-3">
                {posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/post/${p.id}`}
                    className="card-hoverable group flex gap-3 p-3"
                  >
                    {p.cover && (
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-leaf-50">
                        <Image src={p.cover} alt={p.title} fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 text-sm font-semibold text-ink-800 group-hover:text-leaf-700">
                        <Highlight text={p.title} q={q} />
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-700/70">
                        <Highlight
                          text={(p.content || '').replace(/<[^>]+>/g, '').slice(0, 100)}
                          q={q}
                        />
                      </p>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-leaf-700/60">
                        <span>{p.author.name}</span>
                        <span>·</span>
                        <span>♥ {p._count.likes}</span>
                        <span>·</span>
                        <span>💬 {p._count.comments}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* 图鉴(品种) */}
          {(tabValid === 'all' || tabValid === 'species') && species.length > 0 && (
            <Section title={`🌱 多肉图鉴`} count={cntSpecies} viewMore={tabValid === 'all' && cntSpecies > species.length ? `/search?q=${encodeURIComponent(q)}&tab=species` : null}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                {species.map((s) => (
                  <Link
                    key={s.id}
                    href={`/board/${s.genus.category.slug}/${s.genus.slug}/${s.slug}`}
                    className="card-hoverable group overflow-hidden"
                  >
                    <div className="relative aspect-[4/3] bg-leaf-50">
                      <Image src={s.cover} alt={s.name} fill className="object-cover" unoptimized />
                    </div>
                    <div className="p-2.5">
                      <div className="text-sm font-medium text-ink-800 group-hover:text-leaf-700">
                        <Highlight text={s.name} q={q} />
                      </div>
                      {s.latinName && (
                        <div className="truncate text-[11px] italic text-leaf-700/60">
                          <Highlight text={s.latinName} q={q} />
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* 板块 */}
          {(tabValid === 'all' || tabValid === 'boards') && boards.length > 0 && (
            <Section title={`🏷️ 板块`} count={cntBoards} viewMore={tabValid === 'all' && cntBoards > boards.length ? `/search?q=${encodeURIComponent(q)}&tab=boards` : null}>
              <div className="flex flex-wrap gap-2">
                {boards.map((b) => (
                  <Link
                    key={b.id}
                    href={`/board/${b.slug}`}
                    className="card-hoverable rounded-lg px-3 py-2 text-sm"
                  >
                    <div className="font-medium text-ink-800">
                      <Highlight text={b.name} q={q} />
                    </div>
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-leaf-700/60">
                      <Highlight text={b.description} q={q} />
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* 用户 */}
          {(tabValid === 'all' || tabValid === 'users') && users.length > 0 && (
            <Section title={`👥 肉友`} count={cntUsers} viewMore={tabValid === 'all' && cntUsers > users.length ? `/search?q=${encodeURIComponent(q)}&tab=users` : null}>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/user/${u.id}`}
                    className="card-hoverable flex items-center gap-3 p-3"
                  >
                    <Avatar src={u.avatar} alt={u.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-ink-800">
                          <Highlight text={u.name} q={q} />
                        </span>
                        <span className="rounded bg-leaf-100 px-1 text-[10px] text-leaf-700">
                          Lv.{u.level}
                        </span>
                      </div>
                      <div className="truncate text-[11px] text-leaf-700/60">
                        {u.handle ? (
                          <>@<Highlight text={u.handle} q={q} /></>
                        ) : (
                          <Highlight text={u.bio || '这家伙很懒…'} q={q} />
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </Shell>
  );
}

function Section({
  title,
  count,
  viewMore,
  children,
}: {
  title: string;
  count: number;
  viewMore: string | null;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-800">
          {title}
          <span className="ml-1.5 text-xs font-normal text-leaf-700/60">{count}</span>
        </h2>
        {viewMore && (
          <Link href={viewMore} className="text-xs text-leaf-700 hover:underline">
            查看全部 →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyHint() {
  return (
    <div className="card p-12 text-center">
      <div className="text-4xl">🔍</div>
      <div className="mt-3 text-sm font-medium text-ink-800">输入关键词开始搜索</div>
      <div className="mt-1 text-xs text-leaf-700/60">
        支持搜索:帖子标题/正文 · 品种(中文/拉丁名) · 板块 · 肉友
      </div>
    </div>
  );
}
