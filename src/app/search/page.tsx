/**
 * 搜索结果页 /search?q=xxx
 *
 * 服务端渲染,SEO 友好。
 * 4 维结果:帖子 / 品种 / 板块 / 用户
 */
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';
import { Avatar } from '@/components/ui/Avatar';

export const dynamic = 'force-dynamic';

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
  searchParams: { q?: string };
}) {
  const q = (searchParams.q || '').trim();

  if (!q) {
    return (
      <Shell>
        <EmptyHint />
      </Shell>
    );
  }

  const PER = 8;

  const [posts, species, boards, users] = await Promise.all([
    prisma.post.findMany({
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
    }),
    prisma.species.findMany({
      where: {
        OR: [{ name: { contains: q } }, { latinName: { contains: q } }],
      },
      include: { genus: { include: { category: true } } },
      orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
      take: PER,
    }),
    prisma.category.findMany({
      where: {
        OR: [{ name: { contains: q } }, { description: { contains: q } }],
      },
      orderBy: { name: 'asc' },
      take: PER,
    }),
    prisma.user.findMany({
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
    }),
  ]);

  const totalCount = posts.length + species.length + boards.length + users.length;

  return (
    <Shell>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink-800">
          搜索:<span className="text-leaf-700">{q}</span>
        </h1>
        <p className="mt-1 text-xs text-leaf-700/70">
          找到 {totalCount} 条结果
        </p>
      </div>

      {totalCount === 0 ? (
        <div className="card p-12 text-center text-sm text-leaf-700/60">
          没有找到相关内容,试试其他关键词
        </div>
      ) : (
        <div className="space-y-6">
          {/* 品种 */}
          {species.length > 0 && (
            <Section title={`🌱 多肉品种 · ${species.length}`}>
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
                        {s.name}
                      </div>
                      {s.latinName && (
                        <div className="truncate text-[11px] italic text-leaf-700/60">
                          {s.latinName}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* 板块 */}
          {boards.length > 0 && (
            <Section title={`🏷️ 板块 · ${boards.length}`}>
              <div className="flex flex-wrap gap-2">
                {boards.map((b) => (
                  <Link
                    key={b.id}
                    href={`/board/${b.slug}`}
                    className="card-hoverable rounded-lg px-3 py-2 text-sm"
                  >
                    <div className="font-medium text-ink-800">{b.name}</div>
                    <div className="mt-0.5 line-clamp-1 text-[11px] text-leaf-700/60">
                      {b.description}
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* 用户 */}
          {users.length > 0 && (
            <Section title={`👥 肉友 · ${users.length}`}>
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
                        <span className="truncate font-medium text-ink-800">{u.name}</span>
                        <span className="rounded bg-leaf-100 px-1 text-[10px] text-leaf-700">
                          Lv.{u.level}
                        </span>
                      </div>
                      <div className="truncate text-[11px] text-leaf-700/60">
                        {u.handle ? `@${u.handle}` : u.bio || '这家伙很懒…'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* 帖子 */}
          {posts.length > 0 && (
            <Section title={`📝 帖子 · ${posts.length}`}>
              <div className="space-y-3">
                {posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/post/${p.id}`}
                    className="card-hoverable flex gap-3 p-3"
                  >
                    {p.cover && (
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-leaf-50">
                        <Image src={p.cover} alt={p.title} fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 text-sm font-semibold text-ink-800 group-hover:text-leaf-700">
                        {p.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-700/70">
                        {(p.content || '').replace(/<[^>]+>/g, '').slice(0, 100)}
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
        </div>
      )}
    </Shell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 text-sm font-semibold text-ink-800">{title}</h2>
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
