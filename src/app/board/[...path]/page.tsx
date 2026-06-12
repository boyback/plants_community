import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import {
  serializeCategory,
  serializeGenus,
  serializeSpeciesFull,
  serializePost } from
'@/lib/serializers';

import { postInclude } from "@/lib/post-include";
import { REVIEW_FILTER_ENABLED } from "@/lib/feature-flags";
import { PostMasonry } from '@/components/post/PostMasonry';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { SpeciesRatingPanel } from '@/components/species/SpeciesRatingPanel';

import { I18nText } from '@/components/ui/I18nText';
import { FollowBoardButton } from '@/components/board/FollowBoardButton';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { formatNumber } from '@/lib/utils';
import type { Metadata } from 'next';
import { parseJsonArray } from '@/lib/api';
import { jsonLdScript, speciesJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { getCurrentUser } from '@/lib/auth';
import { sortPostsForPins } from "@/lib/post-pins";
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://plantcommunity.cn";

export const dynamic = "force-dynamic";

/**
 * SEO:三级板块的动态 metadata
 *  - 品种页:title「银冠玉(Lophophora williamsii) 养护、图片、繁殖 · 肉友社」
 *  - 属页:  title「乌羽玉属 Lophophora · 共 X 个品种 · 肉友社」
 *  - 科页:  title「仙人掌科 · 共 X 个品种 X 个属 · 肉友社」
 */
export async function generateMetadata({
  params


}: {params: {path: string[];};}): Promise<Metadata> {
  const [categorySlug, genusSlug, speciesSlug] = params.path ?? [];
  if (!categorySlug) return {};

  // 三级:品种
  if (speciesSlug) {
    const s = await prisma.species.
    findFirst({
      where: {
        slug: speciesSlug,
        genus: {
          slug: genusSlug,
          board: { slug: categorySlug }
        }
      },
      include: {
        genus: { include: { board: true } }
      }
    }).
    catch(() => null);
    if (!s) return {};
    const aliases = parseJsonArray(s.alias);
    const tips = parseJsonArray(s.tips);
    const title = `${s.name}${s.latinName ? `(${s.latinName})` : ''} 养护图鉴`;
    const description = [
    `${s.name}(${s.latinName})${aliases.length ? "别名:" + aliases.join('、') : ''}`,
    s.description?.slice(0, 80),
    tips[0]].

    filter(Boolean).
    join(' · ');
    const keywords = [
    s.name,
    s.latinName,
    ...aliases,
    `${s.name} 养护`,
    `${s.name} 浇水`,
    `${s.name} 度夏`,
    `${s.name} 图片`,
    s.genus?.name,
    s.genus?.board?.name,
    '多肉',
    '多肉植物'].
    filter(Boolean) as string[];
    return {
      title,
      description,
      keywords,
      openGraph: {
        type: 'article',
        title,
        description,
        images: s.cover ? [{ url: s.cover, alt: s.name }] : undefined
      }
    };
  }

  // 二级:属
  if (genusSlug) {
    const g = await prisma.genus.
    findFirst({
      where: { slug: genusSlug, board: { slug: categorySlug } },
      include: {
        board: true,
        _count: { select: { species: true, posts: true } }
      }
    }).
    catch(() => null);
    if (!g) return {};
    const title = `${g.name}${g.latinName ? `属 ${g.latinName}` : '属'} · 旗下品种`;
    const description = `${g.board?.name}下的${g.name}属,共 ${g._count?.species ?? 0} 个品种,${g._count?.posts ?? 0} 篇相关讨论。${g.description?.slice(0, 60) ?? ''}`;
    return {
      title,
      description,
      keywords: [
      g.name,
      g.latinName,
      `${g.name}属`,
      `${g.name} 品种`,
      g.board?.name,
      '多肉植物'].
      filter(Boolean) as string[]
    };
  }

  // 一级:科
  const c = await prisma.board.
  findUnique({
    where: { slug: categorySlug },
    include: {
      _count: { select: { genera: true, posts: true } }
    }
  }).
  catch(() => null);
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
    '多肉植物'].
    filter(Boolean) as string[]
  };
}

/**
 * 统一的三级板块页:
 *   /board/[categorySlug]                        → Category 列表式
 *   /board/[categorySlug]/[genusSlug]            → Genus 列表式(展示旗下品种)
 *   /board/[categorySlug]/[genusSlug]/[speciesSlug] → Species 详情(图鉴 + 帖子)
 */
export default async function BoardPage({
  params


}: {params: {path: string[];};}) {
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
  //   - 如果该板块设置了 linkPath(主要用于 kind=system 的板块复用现有页面如 /contests),先 redirect 过去
  //   - 如果 kind=system 且无 linkPath,渲染本板块详情页(避免 404)
  //   - family/discussion/market 等其他类型保持原行为:统一回总入口 /board
  const board = await prisma.board.
  findUnique({
    where: { slug: categorySlug },
    select: { linkPath: true, kind: true }
  }).
  catch(() => null);

  if (board?.linkPath) redirect(board.linkPath);
  if (board?.kind === 'system') return <CategoryView categorySlug={categorySlug} />;

  redirect('/board');
}

/* ============== 一级:科 ============== */

async function CategoryView({ categorySlug }: {categorySlug: string;}) {
  const c = await prisma.board.findUnique({
    where: { slug: categorySlug },
    include: {
      _count: { select: { posts: true, genera: true } },
      genera: {
        orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { posts: true, species: true } }
        }
      }
    }
  });
  if (!c) notFound();

  const PAGE = 24;
  const postsRaw = await prisma.post.findMany({
    where: {
      boardId: c.id,
      deleted: false,
      ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE + 1,
    include: postInclude()
  });
  let nextCursor: string | null = null;
  if (postsRaw.length > PAGE) {
    nextCursor = postsRaw.pop()!.id;
  }
  const me = await getCurrentUser().catch(() => null);
  const posts = sortPostsForPins(
    postsRaw.map((p: any) => serializePost(p, undefined, undefined, me)),
    [{ scope: 'board', targetId: c.id }]
  );
  const board = serializeCategory(c);

  return (
    <Shell>
      <BoardBreadcrumb path={board.path} />

      <CategoryHeader board={board} latinName={c.latinName} kind={c.kind} />

      {c.genera.length > 0 &&
      <section className={styles.r_b6777c6d}>
          <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_6f27f4f7, styles.r_8ef2268e)}>
            <h2 className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>
              🌿 <I18nText k="board.generaCount" vars={{ n: c.genera.length }} fallback={`${c.genera.length} 个属`} />
            </h2>
            <span className={cx(styles.r_359090c2, styles.r_6c4cc49e)}>
              <I18nText k="board.generaListHint" fallback="点击进入查看该属的所有品种" />
            </span>
          </div>
          <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_ab1b20c2, styles.r_4558bce6, styles.r_a4ecef1e)}>
            {c.genera.map((g) =>
          <Link
            key={g.id}
            href={`/board/${categorySlug}/${g.slug}`}
            className={cx(styles.r_64292b1c, styles.r_eb6e8b88, styles.r_b8627687, styles.r_9e85ac05)}>

                <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5, styles.r_0eb80431)}>
                  {g.name}
                </div>
                {g.latinName &&
            <div className={cx(styles.r_15e1b1f4, styles.r_f283ea9b, styles.r_d058ca6d, styles.r_90665ca6, styles.r_69335b95)}>
                    {g.latinName}
                  </div>
            }
                <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                  <span>🌱 <I18nText k="board.stats.species" vars={{ n: g._count?.species ?? 0 }} /></span>
                  <span>📝 <I18nText k="board.stats.posts" vars={{ n: g._count?.posts ?? 0 }} /></span>
                </div>
              </Link>
          )}
          </div>
        </section>
      }

      <section>
        <h2 className={cx(styles.r_1bb88326, styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>
          🔥 <I18nText k="board.hotInCategory" vars={{ name: board.name }} fallback={`${board.name}最新讨论`} />
        </h2>
        <PostMasonry
          initial={posts}
          initialCursor={nextCursor}
          loadMoreUrl={`/api/posts?board=${encodeURIComponent(categorySlug)}&sort=latest&limit=24`}
          source="board_category"
          empty={
          <Empty
            icon="🌱"
            title={<I18nText k="board.emptyPostsCategory" fallback="还没有人发过帖子" />}
            desc={<I18nText k="board.emptyPostsCategoryHint" fallback="成为第一个分享的人吧" />} />

          } />

      </section>
    </Shell>);

}

/* ============== 二级:属 ============== */

async function GenusView({
  categorySlug,
  genusSlug



}: {categorySlug: string;genusSlug: string;}) {
  const g = await prisma.genus.findFirst({
    where: { slug: genusSlug, board: { slug: categorySlug } },
    include: {
      board: { include: { _count: { select: { posts: true, genera: true } } } },
      _count: { select: { posts: true, species: true } },
      species: {
        orderBy: { name: 'asc' },
        include: { _count: { select: { posts: true } } }
      }
    }
  });
  if (!g) notFound();

  const PAGE = 24;
  const postsRaw = await prisma.post.findMany({
    where: {
      genusId: g.id,
      deleted: false,
      ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE + 1,
    include: postInclude()
  });
  let nextCursor: string | null = null;
  if (postsRaw.length > PAGE) {
    nextCursor = postsRaw.pop()!.id;
  }
  const me = await getCurrentUser().catch(() => null);
  const posts = sortPostsForPins(
    postsRaw.map((p: any) => serializePost(p, undefined, undefined, me)),
    [{ scope: 'genus', targetId: g.id }]
  );

  const genus = serializeGenus(g);

  return (
    <Shell>
      <BoardBreadcrumb path={genus.path} />

      {/* Header — 单图大背景 banner(属封面优先,否则用父科封面) */}
      <div className={cx(styles.r_b6777c6d, styles.r_2cd02d11)}>
        <div className={cx(styles.r_d89972fe, styles.r_188a6e22, styles.r_39b2e003, styles.r_f53e30fc, styles.r_0a6f1c29, styles.r_e1b9a6f2)}>
          <Image
            src={g.cover ?? g.board?.cover ?? ''}
            alt={g.name}
            fill
            className={styles.r_7d85d0c2}
            unoptimized
            priority />

          <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_79257b8c, styles.r_0bb032b9, styles.r_cee3171a, styles.r_4472aea0)} />

          <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_60fbb771, styles.r_8dddea07, styles.r_77c08e01, styles.r_c07e54fd, styles.r_72a4c7cd, styles.r_97effa3f)}>
            <div className={cx(styles.r_65281709, styles.r_359090c2, styles.r_714816ef)}>{genus.path[0]?.name ?? ''}</div>
            <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_c58992ca)}>
              {g.name}
              {g.latinName &&
              <span className={cx(styles.r_fd9bb0dd, styles.r_fc7473ca, styles.r_8ecebc9f, styles.r_90665ca6, styles.r_714816ef)}>
                  {g.latinName}
                </span>
              }
            </h1>
            {g.description &&
            <p className={cx(styles.r_b6b02c0e, styles.r_054cb4e3, styles.r_9ef2b581, styles.r_359090c2, styles.r_4f5874c5, styles.r_a084a8a7)}>
                {g.description}
              </p>
            }
            <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2)}>
              <span>
                🌱 <I18nText k="board.speciesCount" vars={{ n: g._count?.species ?? 0 }} />
              </span>
              <span>
                📝 <I18nText k="board.stats.posts" vars={{ n: g._count?.posts ?? 0 }} />
              </span>
              <div className={cx(styles.r_fb56d9cf, styles.r_60fbb771, styles.r_77a2a20e)}>
                <Link
                  href={`/editor?genus=${encodeURIComponent(g.slug)}`}
                  className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_5f6a59f1, styles.r_5756b7b4)}>

                  <Icon name="plus" size={13} />
                  <I18nText k="board.postInGenus" fallback="在本属发帖" />
                </Link>
                <FollowBoardButton
                  type="genus"
                  slug={g.slug}
                  categorySlug={genus.path[0]?.slug ?? ''} />

              </div>
            </div>
          </div>
        </div>
      </div>

      {g.species.length > 0 &&
      <section className={styles.r_b6777c6d}>
          <h2 className={cx(styles.r_1bb88326, styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>
            🌱 <I18nText k="board.speciesCount" vars={{ n: g._count?.species ?? g.species.length }} />
          </h2>
          <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_ab1b20c2, styles.r_d59f314f, styles.r_a4ecef1e)}>
            {g.species.map((s) =>
          <Link
            key={s.id}
            href={`/board/${categorySlug}/${genusSlug}/${s.slug}`}
            className={cx(styles.r_64292b1c, styles.r_2cd02d11, styles.r_b8627687, styles.r_9e85ac05)}>

                <div className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_2cd02d11, styles.r_7ebecbb6)}>
                  <Image
                src={s.cover}
                alt={s.name}
                fill
                sizes="(max-width:768px) 50vw, 240px"
                className={cx(styles.r_7d85d0c2, styles.r_eadef238, styles.r_1a9195e1)}
                unoptimized />

                  <div className={cx(styles.r_da4dbfbc, styles.r_d83be576, styles.r_9a2db8f9, styles.r_ac204c10, styles.r_6c21de57, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_5f6a59f1)}>
                    {'★'.repeat(s.difficulty)}
                  </div>
                </div>
                <div className={styles.r_9fe52d5d}>
                  <div className={cx(styles.r_f283ea9b, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5, styles.r_0eb80431)}>
                    {s.name}
                  </div>
                  <div className={cx(styles.r_15e1b1f4, styles.r_f283ea9b, styles.r_1dc571a3, styles.r_90665ca6, styles.r_69335b95)}>
                    {s.latinName}
                  </div>
                  <div className={cx(styles.r_aac62f0e, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1dc571a3, styles.r_6c4cc49e)}>
                    <span>📝 <I18nText k="board.stats.posts" vars={{ n: s._count?.posts ?? 0 }} /></span>
                  </div>
                </div>
              </Link>
          )}
          </div>
        </section>
      }

      <section>
        <h2 className={cx(styles.r_1bb88326, styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>💬 <I18nText k="board.hotInGenus" fallback="本属最新讨论" /></h2>
        <PostMasonry
          initial={posts}
          initialCursor={nextCursor}
          loadMoreUrl={`/api/posts?genus=${encodeURIComponent(genusSlug)}&sort=latest&limit=24`}
          source="board_genus"
          empty={<Empty icon="🌱" title={<I18nText k="board.emptyPostsGenus" fallback="还没有人在本属发过帖子" />} />} />

      </section>
    </Shell>);

}

/* ============== 三级:品种 ============== */

async function SpeciesView({
  categorySlug,
  genusSlug,
  speciesSlug




}: {categorySlug: string;genusSlug: string;speciesSlug: string;}) {
  const s = await prisma.species.findFirst({
    where: {
      slug: speciesSlug,
      genus: {
        slug: genusSlug,
        board: { slug: categorySlug }
      }
    },
    include: {
      genus: { include: { board: true } },
      _count: { select: { posts: true } }
    }
  });
  if (!s) notFound();

  const PAGE = 24;
  const postsRaw = await prisma.post.findMany({
    where: {
      speciesId: s.id,
      deleted: false,
      ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE + 1,
    include: postInclude()
  });
  let nextCursor: string | null = null;
  if (postsRaw.length > PAGE) {
    nextCursor = postsRaw.pop()!.id;
  }
  const me = await getCurrentUser().catch(() => null);
  const posts = sortPostsForPins(
    postsRaw.map((p: any) => serializePost(p, undefined, undefined, me)),
    [{ scope: 'species', targetId: s.id }]
  );

  const full = serializeSpeciesFull(s);

  // SEO: 构造品种页 JSON-LD(Article + Thing) + 面包屑
  const speciesUrl = `${SITE_URL}/board/${categorySlug}/${genusSlug}/${speciesSlug}`;
  const speciesLd = speciesJsonLd({
    name: full.name,
    latinName: full.latinName,
    family: `${s.genus.board?.name ?? ''} · ${s.genus.name}`,
    description: full.description,
    cover: full.cover.startsWith('http') ? full.cover : `${SITE_URL}${full.cover}`,
    url: speciesUrl,
    difficulty: full.difficulty
  });
  const breadcrumbLd = breadcrumbJsonLd([
  { name: '首页', url: SITE_URL },
  { name: s.genus.board?.name ?? '', url: `${SITE_URL}/board/${categorySlug}` },
  { name: s.genus.name, url: `${SITE_URL}/board/${categorySlug}/${genusSlug}` },
  { name: full.name, url: speciesUrl }]
  );

  // 同属下其他品种(最多 6 个),按帖子数倒序展示
  const relatedSpecies = await prisma.species.findMany({
    where: {
      genusId: s.genusId,
      id: { not: s.id }
    },
    include: {
      _count: { select: { posts: true } }
    },
    orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
    take: 6
  });

  return (
    <Shell>
      {/* SEO: 品种页 JSON-LD(Article + Thing + 面包屑) */}
      {jsonLdScript([...speciesLd, breadcrumbLd])}
      <BoardBreadcrumb path={full.path} />

      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_0d304f90, styles.r_81fc2a52)}>
        <div className={styles.r_b3542e05}>
          {/* 品种大图 */}
          <div className={styles.r_2cd02d11}>
            <div className={cx(styles.r_d89972fe, styles.r_e5d2d82a, styles.r_7ebecbb6)}>
              <Image src={full.cover} alt={full.name} fill className={styles.r_7d85d0c2} unoptimized />
            </div>
            <div className={styles.r_c07e54fd}>
              <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>
                {s.genus.board?.name ?? ''} · {s.genus.name}
              </div>
              <h1 className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_b7012bb2, styles.r_1004c0c3)}>
                <span className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5, styles.r_c58992ca)}>{full.name}</span>
                <span className={cx(styles.r_fc7473ca, styles.r_90665ca6, styles.r_69335b95)}>{full.latinName}</span>
              </h1>
              {full.alias.length > 0 &&
              <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_69335b95)}>
                  <I18nText k="board.species.alias" fallback="别名" />:{full.alias.join(' · ')}
                </div>
              }
              <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2)}>
                <span className="chip"><I18nText k="board.species.difficulty" fallback="难度" /> {'★'.repeat(full.difficulty)}</span>
                <span className="chip"><I18nText k="board.species.hardiness" fallback="耐寒" /> {full.hardiness}</span>
                {full.growthType && <span className="chip">{full.growthType}</span>}
                {full.originRegion && <span className="chip">📍 {full.originRegion}</span>}
              </div>
              <p className={cx(styles.r_0ab86672, styles.r_cff55289, styles.r_7eff2faf, styles.r_399e11a5)}>{full.description}</p>
            </div>
          </div>

          {/* 养护要点 */}
          {full.tips.length > 0 &&
          <div className={styles.r_c07e54fd}>
              <h2 className={cx(styles.r_1bb88326, styles.r_42536e69, styles.r_e83a7042, styles.r_399e11a5)}>🪴 <I18nText k="board.species.careTitle" fallback="养护要点" /></h2>
              <ul className={styles.r_14dd497e}>
                {full.tips.map((t, i) =>
              <li key={i} className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_1004c0c3, styles.r_fc7473ca)}>
                    <span className={cx(styles.r_15e1b1f4, styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_012fbd12, styles.r_67d66567, styles.r_ac204c10, styles.r_45499621, styles.r_d058ca6d, styles.r_72a4c7cd)}>
                      {i + 1}
                    </span>
                    <span className={styles.r_399e11a5}>{t}</span>
                  </li>
              )}
              </ul>
            </div>
          }

          {/* 照片墙 */}
          {full.gallery.length > 1 &&
          <div className={styles.r_c07e54fd}>
              <h2 className={cx(styles.r_1bb88326, styles.r_42536e69, styles.r_e83a7042, styles.r_399e11a5)}>📸 <I18nText k="board.species.gallery" fallback="图集" /></h2>
              <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_77a2a20e, styles.r_898c0bcb, styles.r_74713240)}>
                {full.gallery.map((g, i) =>
              <div
                key={i}
                className={cx(styles.r_b59cd297, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_7ebecbb6)}>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g} alt="" className={cx(styles.r_668b21aa, styles.r_6da6a3c3, styles.r_7d85d0c2)} loading="lazy" />
                  </div>
              )}
              </div>
            </div>
          }

          <section>
            <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e)}>
              <h2 className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>💬 <I18nText k="board.hotInSpecies" vars={{ name: full.name }} fallback={`关于「${full.name}」的讨论`} /></h2>
              <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
                <FollowBoardButton
                  type="species"
                  slug={speciesSlug}
                  genusSlug={genusSlug} />

                <Link
                  href={`/editor?species=${encodeURIComponent(speciesSlug)}`}
                  className={styles.r_dd702538}>

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
              empty={<Empty icon="🌱" title={<I18nText k="board.emptyPostsSpecies" fallback="还没有人在本品种下发过帖子" />} />} />

          </section>
        </div>

        {/* 右栏 */}
        <div className={styles.r_3e7ce58d}>
          {/* 用户打分 */}
          <div className={styles.r_c07e54fd}>
            <h3 className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}>🎯 难度评分</h3>
            <SpeciesRatingPanel
              speciesId={full.id}
              fallbackAvg={full.difficulty} />

          </div>

          <div className={styles.r_c07e54fd}>
            <h3 className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}><I18nText k="board.species.careData" fallback="养护数据" /></h3>
            <div className={cx(styles.r_14dd497e, styles.r_fc7473ca)}>
              <InfoRow icon="☀️" label={<I18nText k="board.species.light" fallback="光照" />} value={full.light} />
              <InfoRow icon="💧" label={<I18nText k="board.species.watering" fallback="浇水" />} value={full.watering} />
              <InfoRow icon="❄️" label={<I18nText k="board.species.hardiness" fallback="耐寒度" />} value={full.hardiness} />
              {full.blooming && <InfoRow icon="🌸" label={<I18nText k="board.species.bloom" fallback="花期" />} value={full.blooming} />}
            </div>
          </div>

          {/* 同属其他品种推荐(SEO + 探索性) */}
          {relatedSpecies.length > 0 &&
          <div className={styles.r_8e63407b}>
              <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
                <h3 className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>
                  🌿 同属其他品种
                </h3>
                <Link
                href={`/board/${categorySlug}/${genusSlug}`}
                className={cx(styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_f673f4a7)}>

                  查看全部 →
                </Link>
              </div>
              <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_77a2a20e)}>
                {relatedSpecies.map((rs) =>
              <Link
                key={rs.id}
                href={`/board/${categorySlug}/${genusSlug}/${rs.slug}`}
                className={cx(styles.r_64292b1c, styles.r_0214b4b3, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_b8627687, styles.r_9e85ac05)}>

                    <div className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_2cd02d11, styles.r_7ebecbb6)}>
                      <Image
                    src={rs.cover}
                    alt={rs.name}
                    fill
                    sizes="120px"
                    className={cx(styles.r_7d85d0c2, styles.r_eadef238, styles.r_1a9195e1)}
                    unoptimized />

                      <div className={cx(styles.r_da4dbfbc, styles.r_7971386c, styles.r_c55dcda2, styles.r_ac204c10, styles.r_75fe048d, styles.r_45d82811, styles.r_68ecb30d, styles.r_e0988086, styles.r_5f6a59f1)}>
                        {'★'.repeat(rs.difficulty)}
                      </div>
                    </div>
                    <div className={styles.r_7660b450}>
                      <div className={cx(styles.r_f283ea9b, styles.r_69cdf25a, styles.r_2689f395, styles.r_399e11a5, styles.r_0eb80431)}>
                        {rs.name}
                      </div>
                      <div className={cx(styles.r_15e1b1f4, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1dc571a3, styles.r_6c4cc49e)}>
                        <span className={cx(styles.r_f283ea9b, styles.r_90665ca6)}>{rs.latinName}</span>
                        <span className={cx(styles.r_f58b0257, styles.r_012fbd12)}>
                          📝 {rs._count?.posts ?? 0}
                        </span>
                      </div>
                    </div>
                  </Link>
              )}
              </div>
            </div>
          }

          <div className={cx(styles.r_8e63407b, styles.r_d058ca6d, styles.r_69335b95)}>
            <div className={cx(styles.r_65281709, styles.r_2689f395, styles.r_5f6a59f1)}>📊 <I18nText k="board.species.stats" fallback="统计" /></div>
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_465609a2)}>
              <span><I18nText k="board.species.postCount" fallback="本品种帖子" /></span>
              <span className={cx(styles.r_e83a7042, styles.r_399e11a5)}>{full.posts}</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>);

}

/* ---------------- 通用组件 ---------------- */

function CategoryHeader({
  board: category,
  latinName,
  kind




}: {board: {cover: string;name: string;description: string;icon: string;slug: string;};latinName: string | null;kind: string;}) {
  return (
    <div className={cx(styles.r_b6777c6d, styles.r_2cd02d11)}>
      <div className={cx(styles.r_d89972fe, styles.r_a502a956)}>
        <Image src={category.cover} alt={category.name} fill className={styles.r_7d85d0c2} unoptimized />
        <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_79257b8c, styles.r_c975410d, styles.r_2e5cc067, styles.r_0fe2b3da)} />
        <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_60fbb771, styles.r_8dddea07, styles.r_77c08e01, styles.r_0478c89a, styles.r_72a4c7cd)}>
          <div className={cx(styles.r_60fbb771, styles.r_b7012bb2, styles.r_1004c0c3)}>
            <CategoryIcon icon={category.icon} name={category.name} size="lg" />
            <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_c58992ca)}>{category.name}</h1>
            {latinName &&
            <span className={cx(styles.r_fc7473ca, styles.r_8ecebc9f, styles.r_90665ca6, styles.r_714816ef)}>{latinName}</span>
            }
          </div>
          <p className={cx(styles.r_50d0d216, styles.r_9ef2b581, styles.r_359090c2, styles.r_4f5874c5, styles.r_a084a8a7)}>{category.description}</p>
          <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
            <Link
              href={`/editor?board=${encodeURIComponent(category.slug)}`}
              className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_5f6a59f1, styles.r_5756b7b4)}>

              <Icon name="plus" size={12} />
              <I18nText k="board.postInCategory" fallback="在本板块发帖" />
            </Link>
            <FollowBoardButton type="board" slug={category.slug} />
            {kind === 'family' &&
            <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_9c15994f, styles.r_793aec7a, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_40ba14f7, styles.r_0b2e8c28)}>
                <I18nText k="board.generaListHint" fallback="点击下方属名进入二级板块" />
              </span>
            }
          </div>
        </div>
      </div>
    </div>);

}

function BoardBreadcrumb({
  path


}: {path: {level: 'category' | 'genus' | 'species';slug: string;name: string;}[];}) {
  const href = (index: number) => {
    const slugs = path.slice(0, index + 1).map((p) => p.slug);
    return '/board/' + slugs.map(encodeURIComponent).join('/');
  };
  return (
    <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e, styles.r_359090c2, styles.r_69335b95)}>
      <Link href="/board" className={styles.r_9825203a}>
        <I18nText k="board.allBoards" fallback="全部板块" />
      </Link>
      {path.map((p, i) => {
        const isLast = i === path.length - 1;
        // 科节点不可点(科页已废除)
        const isCategory = p.level === 'category';
        return (
          <span key={i} className={styles.r_4a756ca0}>
            <Icon name="arrow-right" size={12} />
            {isLast || isCategory ?
            <span className={isLast ? styles.r_eb6abb1f : styles.r_6c4cc49e}>
                {p.name}
              </span> :

            <Link href={href(i)} className={styles.r_9825203a}>
                {p.name}
              </Link>
            }
          </span>);

      })}
    </div>);

}

function InfoRow({ icon, label, value }: {icon: string;label: React.ReactNode;value: string;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
      <span className={styles.r_69335b95}>
        <span className={styles.r_82cc6c65}>{icon}</span>
        {label}
      </span>
      <span className={cx(styles.r_2689f395, styles.r_399e11a5)}>{value}</span>
    </div>);

}