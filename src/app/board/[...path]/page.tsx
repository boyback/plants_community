import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import {
  serializeCategory,
  serializeGenus,
  serializeSpeciesFull,
  serializePost,
} from '@/lib/serializers';

import { postInclude } from '@/lib/post-include';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';
import { PostMasonry } from '@/components/post/PostMasonry';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { SpeciesRatingPanel } from '@/components/species/SpeciesRatingPanel';

import { I18nText } from '@/components/ui/I18nText';
import { FollowBoardButton } from '@/components/board/FollowBoardButton';
import { formatNumber } from '@/lib/utils';
import type { Metadata } from 'next';
import { parseJsonArray } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * SEO:三级板块的动态 metadata
 *  - 品种页:title「银冠玉(Lophophora williamsii) 养护、图片、繁殖 · 肉友社」
 *  - 属页:  title「乌羽玉属 Lophophora · 共 X 个品种 · 肉友社」
 *  - 科页:  title「仙人掌科 · 共 X 个品种 X 个属 · 肉友社」
 */
export async function generateMetadata({
  params,
}: {
  params: { path: string[] };
}): Promise<Metadata> {
  const [categorySlug, genusSlug, speciesSlug] = params.path ?? [];
  if (!categorySlug) return {};

  // 三级:品种
  if (speciesSlug) {
    const s = await prisma.species
      .findFirst({
        where: {
          slug: speciesSlug,
          genus: {
            slug: genusSlug,
            category: { slug: categorySlug },
          },
        },
        include: {
          genus: { include: { category: true } },
        },
      })
      .catch(() => null);
    if (!s) return {};
    const aliases = parseJsonArray(s.alias);
    const tips = parseJsonArray(s.tips);
    const title = `${s.name}${s.latinName ? `(${s.latinName})` : ''} 养护图鉴`;
    const description = [
      `${s.name}(${s.latinName})${aliases.length ? '别名:' + aliases.join('、') : ''}`,
      s.description?.slice(0, 80),
      tips[0],
    ]
      .filter(Boolean)
      .join(' · ');
    const keywords = [
      s.name,
      s.latinName,
      ...aliases,
      `${s.name} 养护`,
      `${s.name} 浇水`,
      `${s.name} 度夏`,
      `${s.name} 图片`,
      s.genus?.name,
      s.genus?.category?.name,
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
        images: s.cover ? [{ url: s.cover, alt: s.name }] : undefined,
      },
    };
  }

  // 二级:属
  if (genusSlug) {
    const g = await prisma.genus
      .findFirst({
        where: { slug: genusSlug, category: { slug: categorySlug } },
        include: {
          category: true,
          _count: { select: { species: true, posts: true } },
        },
      })
      .catch(() => null);
    if (!g) return {};
    const title = `${g.name}${g.latinName ? `属 ${g.latinName}` : '属'} · 旗下品种`;
    const description = `${g.category?.name}下的${g.name}属,共 ${g._count?.species ?? 0} 个品种,${g._count?.posts ?? 0} 篇相关讨论。${g.description?.slice(0, 60) ?? ''}`;
    return {
      title,
      description,
      keywords: [
        g.name,
        g.latinName,
        `${g.name}属`,
        `${g.name} 品种`,
        g.category?.name,
        '多肉植物',
      ].filter(Boolean) as string[],
    };
  }

  // 一级:科
  const c = await prisma.category
    .findUnique({
      where: { slug: categorySlug },
      include: {
        _count: { select: { genera: true, posts: true } },
      },
    })
    .catch(() => null);
  if (!c) return {};
  const title = `${c.name} · 多肉品种图鉴`;
  const description = `${c.name}${c.latinName ? `(${c.latinName})` : ''} 大家族,共 ${c._count?.genera ?? 0} 个属,${c._count?.posts ?? 0} 篇社区讨论。${c.description?.slice(0, 60) ?? ''}`;
  return {
    title,
    description,
    keywords: [
      c.name,
      c.latinName,
      `${c.name} 品种`,
      `${c.name} 图鉴`,
      '多肉',
      '多肉植物',
    ].filter(Boolean) as string[],
  };
}

/**
 * 统一的三级板块页:
 *   /board/[categorySlug]                        → Category 列表式
 *   /board/[categorySlug]/[genusSlug]            → Genus 列表式(展示旗下品种)
 *   /board/[categorySlug]/[genusSlug]/[speciesSlug] → Species 详情(图鉴 + 帖子)
 */
export default async function BoardPage({
  params,
}: {
  params: { path: string[] };
}) {
  const [categorySlug, genusSlug, speciesSlug] = params.path ?? [];
  if (!categorySlug) notFound();

  // 三级:品种页
  if (speciesSlug) {
    return <SpeciesView categorySlug={categorySlug} genusSlug={genusSlug!} speciesSlug={speciesSlug} />;
  }
  // 二级:属页
  if (genusSlug) {
    return <GenusView categorySlug={categorySlug} genusSlug={genusSlug} />;
  }
  // 一级:科页
  return <CategoryView categorySlug={categorySlug} />;
}

/* ============== 一级:科 ============== */

async function CategoryView({ categorySlug }: { categorySlug: string }) {
  const c = await prisma.category.findUnique({
    where: { slug: categorySlug },
    include: {
      _count: { select: { posts: true, genera: true } },
      genera: {
        orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { posts: true, species: true } },
        },
      },
    },
  });
  if (!c) notFound();

  const PAGE = 24;
  const postsRaw = await prisma.post.findMany({
    where: {
      categoryId: c.id,
      deleted: false,
      ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE + 1,
    include: postInclude(),
  });
  let nextCursor: string | null = null;
  if (postsRaw.length > PAGE) {
    nextCursor = postsRaw.pop()!.id;
  }
  const posts = postsRaw.map(serializePost);
  const category = serializeCategory(c);

  return (
    <Shell>
      <BoardBreadcrumb path={category.path} />

      <CategoryHeader category={category} latinName={c.latinName} kind={c.kind} />

      {c.genera.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-end justify-between">
            <h2 className="text-base font-semibold text-ink-800">
              🌿 <I18nText k="board.generaCount" vars={{ n: c.genera.length }} fallback={`${c.genera.length} 个属`} />
            </h2>
            <span className="text-xs text-leaf-700/60">
              <I18nText k="board.generaListHint" fallback="点击进入查看该属的所有品种" />
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {c.genera.map((g) => (
              <Link
                key={g.id}
                href={`/board/${categorySlug}/${g.slug}`}
                className="card group p-3 transition-shadow hover:shadow-md"
              >
                <div className="text-sm font-semibold text-ink-800 group-hover:text-leaf-700">
                  {g.name}
                </div>
                {g.latinName && (
                  <div className="mt-0.5 truncate text-[11px] italic text-leaf-700/70">
                    {g.latinName}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between text-[11px] text-leaf-700/60">
                  <span>🌱 <I18nText k="board.stats.species" vars={{ n: g._count?.species ?? 0 }} /></span>
                  <span>📝 <I18nText k="board.stats.posts" vars={{ n: g._count?.posts ?? 0 }} /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold text-ink-800">
          🔥 <I18nText k="board.hotInCategory" vars={{ name: category.name }} fallback={`${category.name}最新讨论`} />
        </h2>
        <PostMasonry
          initial={posts}
          initialCursor={nextCursor}
          loadMoreUrl={`/api/posts?category=${encodeURIComponent(categorySlug)}&sort=latest&limit=24`}
          source="board_category"
          empty={
            <Empty
              icon="🌱"
              title={<I18nText k="board.emptyPostsCategory" fallback="还没有人发过帖子" />}
              desc={<I18nText k="board.emptyPostsCategoryHint" fallback="成为第一个分享的人吧" />}
            />
          }
        />
      </section>
    </Shell>
  );
}

/* ============== 二级:属 ============== */

async function GenusView({
  categorySlug,
  genusSlug,
}: {
  categorySlug: string;
  genusSlug: string;
}) {
  const g = await prisma.genus.findFirst({
    where: { slug: genusSlug, category: { slug: categorySlug } },
    include: {
      category: { include: { _count: { select: { posts: true, genera: true } } } },
      _count: { select: { posts: true, species: true } },
      species: {
        orderBy: { name: 'asc' },
        include: { _count: { select: { posts: true } } },
      },
    },
  });
  if (!g) notFound();

  const PAGE = 24;
  const postsRaw = await prisma.post.findMany({
    where: {
      genusId: g.id,
      deleted: false,
      ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE + 1,
    include: postInclude(),
  });
  let nextCursor: string | null = null;
  if (postsRaw.length > PAGE) {
    nextCursor = postsRaw.pop()!.id;
  }
  const posts = postsRaw.map(serializePost);

  const genus = serializeGenus(g);

  return (
    <Shell>
      <BoardBreadcrumb path={genus.path} />

      {/* Header */}
      <div className="card mb-6 overflow-hidden">
        <div className="relative aspect-[21/7] bg-gradient-to-br from-leaf-300 to-leaf-600">
          <Image src={g.category.cover} alt={g.name} fill className="object-cover opacity-60" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
            <div className="mb-1 text-xs opacity-90">{g.category.name}</div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {g.name}
              {g.latinName && (
                <span className="ml-3 text-sm font-normal italic opacity-80">{g.latinName}</span>
              )}
            </h1>
            <p className="mt-1 max-w-xl text-xs opacity-90 md:text-sm">{g.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span>🌱 <I18nText k="board.speciesCount" vars={{ n: g._count?.species ?? 0 }} /></span>
              <span>📝 <I18nText k="board.stats.posts" vars={{ n: g._count?.posts ?? 0 }} /></span>
              <div className="ml-auto flex gap-2">
                <Link
                  href={`/editor?genus=${encodeURIComponent(g.slug)}`}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-leaf-700 hover:bg-leaf-50"
                >
                  <Icon name="plus" size={13} />
                  <I18nText k="board.postInGenus" fallback="在本属发帖" />
                </Link>
                <FollowBoardButton
                  type="genus"
                  slug={g.slug}
                  categorySlug={g.category.slug}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {g.species.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold text-ink-800">
            🌱 <I18nText k="board.speciesCount" vars={{ n: g._count?.species ?? g.species.length }} />
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {g.species.map((s) => (
              <Link
                key={s.id}
                href={`/board/${categorySlug}/${genusSlug}/${s.slug}`}
                className="card group overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-leaf-50">
                  <Image
                    src={s.cover}
                    alt={s.name}
                    fill
                    sizes="(max-width:768px) 50vw, 240px"
                    className="object-cover transition-transform group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] text-leaf-700">
                    {'★'.repeat(s.difficulty)}
                  </div>
                </div>
                <div className="p-2.5">
                  <div className="truncate text-sm font-medium text-ink-800 group-hover:text-leaf-700">
                    {s.name}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] italic text-leaf-700/70">
                    {s.latinName}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-leaf-700/60">
                    <span>📝 <I18nText k="board.stats.posts" vars={{ n: s._count?.posts ?? 0 }} /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold text-ink-800">💬 <I18nText k="board.hotInGenus" fallback="本属最新讨论" /></h2>
        <PostMasonry
          initial={posts}
          initialCursor={nextCursor}
          loadMoreUrl={`/api/posts?genus=${encodeURIComponent(genusSlug)}&sort=latest&limit=24`}
          source="board_genus"
          empty={<Empty icon="🌱" title={<I18nText k="board.emptyPostsGenus" fallback="还没有人在本属发过帖子" />} />}
        />
      </section>
    </Shell>
  );
}

/* ============== 三级:品种 ============== */

async function SpeciesView({
  categorySlug,
  genusSlug,
  speciesSlug,
}: {
  categorySlug: string;
  genusSlug: string;
  speciesSlug: string;
}) {
  const s = await prisma.species.findFirst({
    where: {
      slug: speciesSlug,
      genus: {
        slug: genusSlug,
        category: { slug: categorySlug },
      },
    },
    include: {
      genus: { include: { category: true } },
      _count: { select: { posts: true } },
    },
  });
  if (!s) notFound();

  const PAGE = 24;
  const postsRaw = await prisma.post.findMany({
    where: {
      speciesId: s.id,
      deleted: false,
      ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE + 1,
    include: postInclude(),
  });
  let nextCursor: string | null = null;
  if (postsRaw.length > PAGE) {
    nextCursor = postsRaw.pop()!.id;
  }
  const posts = postsRaw.map(serializePost);

  const full = serializeSpeciesFull(s);

  // 同属下其他品种(最多 6 个),按帖子数倒序展示
  const relatedSpecies = await prisma.species.findMany({
    where: {
      genusId: s.genusId,
      id: { not: s.id },
    },
    include: {
      _count: { select: { posts: true } },
    },
    orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
    take: 6,
  });

  return (
    <Shell>
      <BoardBreadcrumb path={full.path} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* 品种大图 */}
          <div className="card overflow-hidden">
            <div className="relative aspect-[16/10] bg-leaf-50">
              <Image src={full.cover} alt={full.name} fill className="object-cover" unoptimized />
            </div>
            <div className="p-5">
              <div className="text-[11px] text-leaf-700/70">
                {s.genus.category.name} · {s.genus.name}
              </div>
              <h1 className="mt-1 flex flex-wrap items-baseline gap-3">
                <span className="text-2xl font-bold text-ink-800 md:text-3xl">{full.name}</span>
                <span className="text-sm italic text-leaf-700/70">{full.latinName}</span>
              </h1>
              {full.alias.length > 0 && (
                <div className="mt-1 text-xs text-leaf-700/70">
                  <I18nText k="board.species.alias" fallback="别名" />:{full.alias.join(' · ')}
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="chip"><I18nText k="board.species.difficulty" fallback="难度" /> {'★'.repeat(full.difficulty)}</span>
                <span className="chip"><I18nText k="board.species.hardiness" fallback="耐寒" /> {full.hardiness}</span>
                {full.growthType && <span className="chip">{full.growthType}</span>}
                {full.originRegion && <span className="chip">📍 {full.originRegion}</span>}
              </div>
              <p className="mt-4 text-[15px] leading-7 text-ink-800">{full.description}</p>
            </div>
          </div>

          {/* 养护要点 */}
          {full.tips.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 text-lg font-semibold text-ink-800">🪴 <I18nText k="board.species.careTitle" fallback="养护要点" /></h2>
              <ul className="space-y-2.5">
                {full.tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-leaf-500 text-[11px] text-white">
                      {i + 1}
                    </span>
                    <span className="text-ink-800">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 图集 */}
          {full.gallery.length > 1 && (
            <div className="card p-5">
              <h2 className="mb-3 text-lg font-semibold text-ink-800">📸 <I18nText k="board.species.gallery" fallback="图集" /></h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {full.gallery.map((g, i) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-lg bg-leaf-50"
                  >
                    <Image src={g} alt="" fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
            </div>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-ink-800">💬 <I18nText k="board.hotInSpecies" vars={{ name: full.name }} fallback={`关于「${full.name}」的讨论`} /></h2>
              <div className="flex gap-2">
                <FollowBoardButton
                  type="species"
                  slug={speciesSlug}
                  genusSlug={genusSlug}
                />
                <Link
                  href={`/editor?species=${encodeURIComponent(speciesSlug)}`}
                  className="btn-primary !text-xs"
                >
                  <Icon name="plus" size={12} />
                  <I18nText k="board.postInSpecies" fallback="在此品种发帖" />
                </Link>
              </div>
            </div>
            <PostMasonry
              initial={posts}
              initialCursor={nextCursor}
              loadMoreUrl={`/api/posts?species=${encodeURIComponent(speciesSlug)}&sort=latest&limit=24`}
              source="board_species"
              empty={<Empty icon="🌱" title={<I18nText k="board.emptyPostsSpecies" fallback="还没有人在本品种下发过帖子" />} />}
            />
          </section>
        </div>

        {/* 右栏 */}
        <div className="space-y-4">
          {/* 用户打分 */}
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold">🎯 难度评分</h3>
            <SpeciesRatingPanel
              speciesId={full.id}
              fallbackAvg={full.difficulty}
            />
          </div>

          <div className="card p-5">
            <h3 className="mb-3 text-sm font-semibold"><I18nText k="board.species.careData" fallback="养护数据" /></h3>
            <div className="space-y-2.5 text-sm">
              <InfoRow icon="☀️" label={<I18nText k="board.species.light" fallback="光照" />} value={full.light} />
              <InfoRow icon="💧" label={<I18nText k="board.species.watering" fallback="浇水" />} value={full.watering} />
              <InfoRow icon="❄️" label={<I18nText k="board.species.hardiness" fallback="耐寒度" />} value={full.hardiness} />
              {full.blooming && <InfoRow icon="🌸" label={<I18nText k="board.species.bloom" fallback="花期" />} value={full.blooming} />}
            </div>
          </div>

          {/* 同属其他品种推荐(SEO + 探索性) */}
          {relatedSpecies.length > 0 && (
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink-800">
                  🌿 同属其他品种
                </h3>
                <Link
                  href={`/board/${categorySlug}/${genusSlug}`}
                  className="text-[11px] text-leaf-700 hover:underline"
                >
                  查看全部 →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {relatedSpecies.map((rs) => (
                  <Link
                    key={rs.id}
                    href={`/board/${categorySlug}/${genusSlug}/${rs.slug}`}
                    className="group block overflow-hidden rounded-lg border border-leaf-100 transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-square overflow-hidden bg-leaf-50">
                      <Image
                        src={rs.cover}
                        alt={rs.name}
                        fill
                        sizes="120px"
                        className="object-cover transition-transform group-hover:scale-105"
                        unoptimized
                      />
                      <div className="absolute left-1 top-1 rounded-full bg-white/85 px-1.5 py-0 text-[9px] text-leaf-700">
                        {'★'.repeat(rs.difficulty)}
                      </div>
                    </div>
                    <div className="p-2">
                      <div className="truncate text-[12px] font-medium text-ink-800 group-hover:text-leaf-700">
                        {rs.name}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[10px] text-leaf-700/60">
                        <span className="truncate italic">{rs.latinName}</span>
                        <span className="ml-1 shrink-0">
                          📝 {rs._count?.posts ?? 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4 text-[11px] text-leaf-700/70">
            <div className="mb-1 font-medium text-leaf-700">📊 <I18nText k="board.species.stats" fallback="统计" /></div>
            <div className="flex items-center justify-between py-0.5">
              <span><I18nText k="board.species.postCount" fallback="本品种帖子" /></span>
              <span className="font-semibold text-ink-800">{full.posts}</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ---------------- 通用组件 ---------------- */

function CategoryHeader({
  category,
  latinName,
  kind,
}: {
  category: { cover: string; name: string; description: string; icon: string; slug: string };
  latinName: string | null;
  kind: string;
}) {
  return (
    <div className="card mb-6 overflow-hidden">
      <div className="relative aspect-[21/7]">
        <Image src={category.cover} alt={category.name} fill className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl">{category.icon}</span>
            <h1 className="text-2xl font-bold md:text-3xl">{category.name}</h1>
            {latinName && (
              <span className="text-sm font-normal italic opacity-80">{latinName}</span>
            )}
          </div>
          <p className="mt-2 max-w-xl text-xs opacity-90 md:text-sm">{category.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/editor?category=${encodeURIComponent(category.slug)}`}
              className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs text-leaf-700 hover:bg-leaf-50"
            >
              <Icon name="plus" size={12} />
              <I18nText k="board.postInCategory" fallback="在本板块发帖" />
            </Link>
            <FollowBoardButton type="category" slug={category.slug} />
            {kind === 'family' && (
              <span className="inline-flex items-center rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur">
                <I18nText k="board.generaListHint" fallback="点击下方属名进入二级板块" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardBreadcrumb({
  path,
}: {
  path: { level: 'category' | 'genus' | 'species'; slug: string; name: string }[];
}) {
  const href = (index: number) => {
    const slugs = path.slice(0, index + 1).map((p) => p.slug);
    return '/board/' + slugs.map(encodeURIComponent).join('/');
  };
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-leaf-700/70">
      <Link href="/board" className="hover:text-leaf-700">
        <I18nText k="board.allBoards" fallback="全部板块" />
      </Link>
      {path.map((p, i) => (
        <span key={i} className="contents">
          <Icon name="arrow-right" size={12} />
          {i === path.length - 1 ? (
            <span className="text-ink-700">{p.name}</span>
          ) : (
            <Link href={href(i)} className="hover:text-leaf-700">
              {p.name}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-leaf-700/70">
        <span className="mr-1.5">{icon}</span>
        {label}
      </span>
      <span className="font-medium text-ink-800">{value}</span>
    </div>
  );
}
