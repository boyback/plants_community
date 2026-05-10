/**
 * 话题详情页 /topic/[name]
 *
 * 展示与「关键词」相关的帖子(标题或正文 LIKE),按热度+时间倒序。
 *
 * 用途:
 *   - 首页「热门品种」chip 点击进来(name = 品种名,如「胧月」)
 *   - 未来扩展:养护话题词、活动话题词,都走这个统一页
 *
 * 路由约定:
 *   - name 为 URL-encoded 中文,decode 后用于 LIKE 搜索
 *   - 同时尝试匹配品种(name 精确等)→ 顶部展示品种简介卡 + 跳转链接
 */
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';
import { Avatar } from '@/components/ui/Avatar';
import { Highlight } from '@/components/ui/Highlight';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export async function generateMetadata({
  params,
}: {
  params: { name: string };
}): Promise<Metadata> {
  const name = decodeURIComponent(params.name || '').trim();
  if (!name) return { title: '话题 · 肉友社' };
  return {
    title: `#${name} · 话题 · 肉友社`,
    description: `查看「${name}」相关的多肉帖子、养护经验与精彩瞬间`,
  };
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: { name: string };
  searchParams: { page?: string };
}) {
  const name = decodeURIComponent(params.name || '').trim();
  if (!name) notFound();

  const page = Math.max(1, Number(searchParams.page || 1));
  const skip = (page - 1) * PAGE_SIZE;

  /**
   * 匹配策略(三选一,优先级高→低):
   *   1. tags 字段(JSON 数组字符串)精准包含 — LIKE %"name"%
   *   2. 标题包含
   *   3. 正文包含
   *
   * 其中 tags 是「该话题精准命中」的最强信号,所以排在最前。
   */
  const where = {
    deleted: false,
    ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' as const } : {}),
    OR: [
      // tags 列存的是 JSON.stringify 的数组,精准匹配 "<tag>"
      { tags: { contains: `"${name}"` } },
      { title: { contains: name } },
      { content: { contains: name } },
    ],
  };

  const [posts, total, matchedSpecies] = await Promise.all([
    prisma.post.findMany({
      where,
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
      skip,
      take: PAGE_SIZE,
    }),
    prisma.post.count({ where }),
    // 顺便看是否匹配到一个同名品种,匹配上就在顶部加跳转
    prisma.species.findFirst({
      where: { name },
      include: { genus: { include: { category: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Shell>
      {/* 话题头 */}
      <div className="mb-5">
        <div className="text-[11px] text-leaf-700/60">
          <Link href="/" className="hover:text-leaf-700">首页</Link>
          <span className="mx-1.5">/</span>
          <span>话题</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-ink-800">
          <span className="text-leaf-700">#</span>
          {name}
        </h1>
        <p className="mt-1 text-sm text-leaf-700/70">
          共 {total} 条与「{name}」相关的帖子
        </p>
      </div>

      {/* 如果该话题恰好是一个品种 → 给一个跳到图鉴的入口卡 */}
      {matchedSpecies && (
        <Link
          href={`/board/${matchedSpecies.genus.category.slug}/${matchedSpecies.genus.slug}/${matchedSpecies.slug}`}
          className="card-hoverable mb-5 flex items-center gap-3 p-3"
        >
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-leaf-50">
            <Image
              src={matchedSpecies.cover}
              alt={matchedSpecies.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink-800">
              🌱 {matchedSpecies.name}
            </div>
            {matchedSpecies.latinName && (
              <div className="truncate text-[11px] italic text-leaf-700/60">
                {matchedSpecies.latinName}
              </div>
            )}
            <div className="mt-0.5 text-[11px] text-leaf-700/60">
              点击查看品种图鉴 →
            </div>
          </div>
        </Link>
      )}

      {/* 帖子列表 */}
      {posts.length === 0 ? (
        <div className="card p-12 text-center text-sm text-leaf-700/60">
          还没有「{name}」相关的帖子,快来发第一篇 🌱
        </div>
      ) : (
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
                  <Highlight text={p.title} q={name} />
                </h3>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink-700/70">
                  <Highlight
                    text={(p.content || '').replace(/<[^>]+>/g, '').slice(0, 120)}
                    q={name}
                  />
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-leaf-700/60">
                  <Avatar src={p.author.avatar} alt={p.author.name} size={16} />
                  <span>{p.author.name}</span>
                  <span>·</span>
                  <span>♥ {p._count.likes}</span>
                  <span>·</span>
                  <span>💬 {p._count.comments}</span>
                  <span>·</span>
                  <span>{fmtDate(p.createdAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link
              href={`/topic/${encodeURIComponent(name)}?page=${page - 1}`}
              className="rounded-md border border-leaf-200 px-3 py-1.5 text-leaf-700 hover:bg-leaf-50"
            >
              ← 上一页
            </Link>
          )}
          <span className="text-leaf-700/70">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/topic/${encodeURIComponent(name)}?page=${page + 1}`}
              className="rounded-md border border-leaf-200 px-3 py-1.5 text-leaf-700 hover:bg-leaf-50"
            >
              下一页 →
            </Link>
          )}
        </nav>
      )}
    </Shell>
  );
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
