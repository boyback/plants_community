import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SpeciesDetailActions } from '@/components/species/SpeciesDetailActions';
import { SpeciesContributionButton } from '@/components/species/SpeciesContributionButton';
import { SpeciesCareVotePanel } from '@/components/species/SpeciesCareVotePanel';
import { SpeciesRatingPanel } from '@/components/species/SpeciesRatingPanel';
import { SpeciesGalleryWall } from '@/components/species/SpeciesGalleryWall';
import { RichTextView } from '@/components/richtext/RichTextView';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { prisma } from '@/lib/db';
import { REVIEW_FILTER_ENABLED } from "@/lib/feature-flags";
import { jsonLdScript, speciesJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { parseJsonArray } from '@/lib/api';
import { postInclude } from "@/lib/post-include";
import { serializePost, serializeSpeciesFull } from '@/lib/serializers';
import { sortPostsForPins } from "@/lib/post-pins";
import { getCurrentUser } from '@/lib/auth';
import { cn, formatNumber } from '@/lib/utils';
import { incrementSpeciesDailyStat } from "@/lib/species-daily-stats";
import { removeCoverFromGallery } from "@/lib/species-gallery";
import { plainFromHtml } from "@/lib/richtext";
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://plantcommunity.cn";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params


}: {params: {categorySlug: string;genusSlug: string;speciesSlug: string;};}): Promise<Metadata> {
  const species = await prisma.species.
  findFirst({
    where: {
      slug: params.speciesSlug,
      genus: {
        slug: params.genusSlug,
        board: { slug: params.categorySlug }
      }
    },
    include: { genus: { include: { board: true } } }
  }).
  catch(() => null);

  if (!species) return {};

  const aliases = parseJsonArray(species.alias);
  const tips = parseJsonArray(species.tips);
  const title = `${species.name}${species.latinName ? `(${species.latinName})` : ''} 养护图鉴`;
  const descriptionText = species.descriptionText || plainFromHtml(species.description, 500);
  const description = [
  `${species.name}${species.latinName ? `(${species.latinName})` : ''}`,
  aliases.length ? `别名:${aliases.join('、')}` : '',
  descriptionText.slice(0, 80),
  tips[0]].

  filter(Boolean).
  join(' · ');

  return {
    title,
    description,
    keywords: [
    species.name,
    species.latinName,
    ...aliases,
    `${species.name} 养护`,
    `${species.name} 浇水`,
    `${species.name} 图片`,
    species.genus?.name,
    species.genus?.board?.name,
    '多肉图鉴',
    '多肉植物'].
    filter(Boolean) as string[],
    openGraph: {
      type: 'article',
      title,
      description,
      images: species.cover ? [{ url: species.cover, alt: species.name }] : undefined
    }
  };
}

export default async function PlantSpeciesPage({
  params


}: {params: {categorySlug: string;genusSlug: string;speciesSlug: string;};}) {
  const species = await prisma.species.findFirst({
    where: {
      slug: params.speciesSlug,
      genus: {
        slug: params.genusSlug,
        board: { slug: params.categorySlug }
      }
    },
    include: {
      genus: { include: { board: true } },
      _count: { select: { posts: true, journals: true, ratings: true, marketListings: true } }
    }
  });
  if (!species) notFound();

  const full = serializeSpeciesFull(species);
  await incrementSpeciesDailyStat(species.id, 'views');
  const mePromise = getCurrentUser().catch(() => null);
  const speciesPostWhere = {
    speciesId: species.id,
    deleted: false,
    ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' as const } : {})
  };
  const [postsRaw, postTotal, relatedSpecies, taxonomy, contributionUsersRaw, contributionStatsRaw, collectTotalRows, me] = await Promise.all([
  prisma.post.findMany({
    where: speciesPostWhere,
    orderBy: { createdAt: 'desc' },
    take: 12,
    include: postInclude()
  }),
  prisma.post.count({
    where: speciesPostWhere
  }),
  prisma.species.findMany({
    where: { genusId: species.genusId, id: { not: species.id } },
    include: { _count: { select: { posts: true, ratings: true, collects: true } } },
    orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
    take: 6
  }),
  getTaxonomy(),
  prisma.$queryRaw<Array<{id: string;name: string;avatar: string;}>>`
      SELECT u.id, u.name, u.avatar
      FROM users u
      INNER JOIN (
        SELECT userId, MAX(createdAt) AS lastAt
        FROM species_contributions
        WHERE speciesId = ${species.id} AND status = 'approved'
        GROUP BY userId
      ) c ON c.userId = u.id
      ORDER BY c.lastAt DESC
      LIMIT 12
    `,
  prisma.$queryRaw<Array<{total: bigint;}>>`
      SELECT COUNT(DISTINCT userId) AS total
      FROM species_contributions
      WHERE speciesId = ${species.id} AND status = 'approved'
    `,
  prisma.$queryRaw<Array<{total: bigint;}>>`
      SELECT COUNT(*) AS total
      FROM species_collects
      WHERE speciesId = ${species.id}
    `,
  mePromise]
  );

  const posts = sortPostsForPins(
    postsRaw.map((p: any) => serializePost(p, undefined, undefined, me)),
    [{ scope: 'species', targetId: species.id }]
  );

  const galleryItems = removeCoverFromGallery(full.galleryItems ?? [], full.cover).slice(0, 8);
  const contributors = contributionUsersRaw;
  const contributorTotal = Number(contributionStatsRaw[0]?.total ?? 0);
  const collectTotal = Number(collectTotalRows[0]?.total ?? 0);
  const [collectedRows, comparedRows] = me ?
  await Promise.all([
  prisma.$queryRaw<Array<{userId: string;}>>`
          SELECT userId FROM species_collects
          WHERE userId = ${me.id} AND speciesId = ${species.id}
          LIMIT 1
        `,
  prisma.$queryRaw<Array<{userId: string;}>>`
          SELECT userId FROM species_compares
          WHERE userId = ${me.id} AND speciesId = ${species.id}
          LIMIT 1
        `]
  ) :
  [[], []];
  const initiallyCollected = collectedRows.length > 0;
  const initiallyCompared = comparedRows.length > 0;
  const speciesUrl = `${SITE_URL}/plants/${params.categorySlug}/${params.genusSlug}/${params.speciesSlug}`;
  const speciesLd = speciesJsonLd({
    name: full.name,
    latinName: full.latinName,
    family: `${species.genus.board?.name ?? ''} · ${species.genus.name}`,
    description: full.descriptionText || plainFromHtml(full.description, 500),
    cover: full.cover.startsWith('http') ? full.cover : `${SITE_URL}${full.cover}`,
    url: speciesUrl,
    difficulty: full.difficulty
  });
  const breadcrumbLd = breadcrumbJsonLd([
  { name: '首页', url: SITE_URL },
  { name: '植物图鉴', url: `${SITE_URL}/plants` },
  { name: species.genus.board?.name ?? '', url: `${SITE_URL}/plants/${params.categorySlug}` },
  { name: species.genus.name, url: `${SITE_URL}/plants/${params.categorySlug}/${params.genusSlug}` },
  { name: full.name, url: speciesUrl }]
  );
  const care = getCareProfile(full);

  return (
    <AppShell showFloatingAi={false} className={styles.r_d14dc4ed}>
      {jsonLdScript([...speciesLd, breadcrumbLd])}
      <SpeciesDetailActions
        species={{
          id: params.speciesSlug,
          speciesId: full.id,
          name: full.name,
          url: `/plants/${params.categorySlug}/${params.genusSlug}/${params.speciesSlug}`,
          collected: initiallyCollected,
          collectTotal,
          postTotal,
          editorUrl: `/editor?category=${encodeURIComponent(params.categorySlug)}&genus=${encodeURIComponent(params.genusSlug)}&species=${encodeURIComponent(params.speciesSlug)}`,
          compared: initiallyCompared
        }} />

      <div className={cx(styles.speciesPage, styles.r_0e12dc7d, styles.r_6da6a3c3, styles.r_726bb2cc, styles.r_3e7ce58d, styles.r_9438a4a9, styles.r_834439ca)}>
        <PlantBreadcrumb path={full.path} />
        <TaxonomyPanel taxonomy={taxonomy} current={params} />

        <div className={cx(styles.speciesLayout, styles.r_f3c543ad, styles.r_b39e60c3, styles.r_2824946b)}>
          <main data-species-detail-content className={cx(styles.speciesMain, styles.r_7e0b7cdf, styles.r_6ed543e2)}>
            <DetailHero
              full={full}
              boardName={species.genus.board?.name ?? ''}
              genusName={species.genus.name}
              galleryItems={galleryItems} />


            <InfoCards
              full={full}
              boardName={species.genus.board?.name ?? ''}
              genusName={species.genus.name} />


            <SpeciesCareVotePanel
              speciesId={full.id}
              defaults={{
                light: full.light || care.light,
                idealTemperature: full.idealTemperature || care.idealTemperature,
                watering: full.watering || care.watering,
                hardiness: full.hardiness || care.minTemperature,
                growthSpeed: full.growthSpeed || care.growthSpeed,
                humidity: full.humidity || care.humidity
              }}
              profile={{
                light: care.light,
                temperature: care.idealTemperature,
                watering: care.watering,
                hardiness: care.minTemperature,
                humidity: care.humidity,
                ventilation: '良好通风',
                soil: care.soil,
                repotCycle: "1-2年",
                growthSeason: full.growthType || care.growthSpeed,
                fertilizer: full.difficulty >= 4 ? '少量薄肥' : '生长期薄肥',
                location: '阳台/露台',
                blooming: full.blooming || "春末-夏初",
                dormancy: care.summerDormancy === '不明显' ? '轻微休眠' : `${care.summerDormancy}休眠`,
                fruiting: '秋季',
                propagation: '播种、扦插'
              }} />


            <LowerModules
              full={full}
              posts={posts}
              params={params} />

          </main>

          <RightActionRail
            params={params}
            full={full}
            relatedSpecies={relatedSpecies}
            contributors={contributors}
            contributorTotal={contributorTotal} />

        </div>
      </div>
    </AppShell>);

}

async function getTaxonomy() {
  return prisma.board.findMany({
    where: { kind: 'family', enabled: true },
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { genera: true } },
      genera: {
        orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { species: true } },
          species: {
            orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
            select: { id: true, slug: true, name: true, latinName: true, cover: true }
          }
        }
      }
    }
  });
}

type Taxonomy = Awaited<ReturnType<typeof getTaxonomy>>;
type FullSpecies = ReturnType<typeof serializeSpeciesFull>;

function TaxonomyPanel({
  taxonomy,
  current



}: {taxonomy: Taxonomy;current: {categorySlug: string;genusSlug: string;speciesSlug: string;};}) {
  const currentBoard = taxonomy.find((board) => board.slug === current.categorySlug);
  const currentGenus = currentBoard?.genera.find((genus) => genus.slug === current.genusSlug);

  return (
    <section className={cx(styles.taxonomyPanel, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_438b2237)}>
      <div className={cx(styles.taxonomyRows, styles.r_6ed543e2)}>
        <TaxonomyFilterRow label="科">
          {taxonomy.map((board) =>
          <TaxonomyChip
            key={board.id}
            href={firstHref(board)}
            active={board.slug === current.categorySlug}>

              {board.name}
              <span className={cx(styles.r_f58b0257, styles.r_1dc571a3, styles.r_f2868c22)}>
                {board.genera.reduce((sum, genus) => sum + genus.species.length, 0)}
              </span>
            </TaxonomyChip>
          )}
        </TaxonomyFilterRow>

        {currentBoard && currentBoard.genera.length > 0 &&
        <TaxonomyFilterRow label="属">
            <TaxonomyChip href={`/plants/${current.categorySlug}`} active={false}>
              全部
            </TaxonomyChip>
            {currentBoard.genera.map((genus) =>
          <TaxonomyChip
            key={genus.id}
            href={genus.species[0] ? `/plants/${current.categorySlug}/${genus.slug}/${genus.species[0].slug}` : '#'}
            active={genus.slug === current.genusSlug}>

                {genus.name}
                <span className={cx(styles.r_f58b0257, styles.r_1dc571a3, styles.r_f2868c22)}>{genus.species.length}</span>
              </TaxonomyChip>
          )}
          </TaxonomyFilterRow>
        }

        {currentGenus && currentGenus.species.length > 0 &&
        <TaxonomyFilterRow label="品种">
            {currentGenus.species.map((item) =>
          <TaxonomyChip
            key={item.id}
            href={`/plants/${current.categorySlug}/${current.genusSlug}/${item.slug}`}
            active={item.slug === current.speciesSlug}>

                <span className={cx(styles.r_d89972fe, styles.r_1be60d8a, styles.r_cd0d9c51, styles.r_72470489, styles.r_012fbd12, styles.r_2cd02d11, styles.r_c10ff8c0, styles.r_7ebecbb6)}>
                  <Image src={item.cover} alt={item.name} fill className={styles.r_7d85d0c2} unoptimized />
                </span>
                <span>{item.name}</span>
              </TaxonomyChip>
          )}
          </TaxonomyFilterRow>
        }
      </div>
    </section>);

}

function PlantBreadcrumb({
  path


}: {path: {level: 'category' | 'genus' | 'species';slug: string;name: string;}[];}) {
  const href = (index: number) => {
    const slugs = path.slice(0, index + 1).map((p) => p.slug);
    return '/plants/' + slugs.map(encodeURIComponent).join('/');
  };

  return (
    <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e, styles.r_359090c2, styles.r_69335b95)}>
      <Link href="/plants" className={styles.r_9825203a}>
        植物图鉴
      </Link>
      {path.map((p, i) => {
        const isLast = i === path.length - 1;
        const isCategory = p.level === 'category';
        return (
          <span key={`${p.level}-${p.slug}`} className={styles.r_4a756ca0}>
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

function TaxonomyFilterRow({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div className={cx(styles.taxonomyRow, styles.r_60fbb771, styles.r_60541e1e, styles.r_77a2a20e, styles.r_359090c2)}>
      <span className={cx(styles.taxonomyLabel, styles.r_b6b02c0e, styles.r_e7e37107, styles.r_012fbd12, styles.r_6c4cc49e)}>{label}</span>
      <div className={cx(styles.taxonomyChips, styles.r_60fbb771, styles.r_36e579c0, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e)}>{children}</div>
    </div>);

}

function TaxonomyChip({
  href,
  active,
  children




}: {href: string;active: boolean;children: React.ReactNode;}) {
  return (
    <Link
      href={href}
      className={cn(cx(styles.taxonomyChip, styles.r_52083e7d, styles.r_d0a52b31, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_421ac2be, styles.r_0b91436d, styles.r_359090c2, styles.r_ceb69a6b),

      active ? cx(styles.taxonomyChipActive, styles.r_f2b23104, styles.r_2689f395, styles.r_5f6a59f1) : cx(styles.r_b85c981b, styles.r_5756b7b4, styles.r_9825203a)
      )}>

      {children}
    </Link>);

}

function DetailHero({
  full,
  boardName,
  genusName,
  galleryItems







}: {full: FullSpecies;boardName: string;genusName: string;galleryItems: NonNullable<FullSpecies['galleryItems']>;}) {
  const descriptionTabs = getDescriptionTabs(full);

  return (
    <section className={styles.heroStack}>
      <div className={cx(styles.heroCard, styles.r_2cd02d11, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
        <div className={cx(styles.heroMedia, styles.r_d89972fe, styles.r_357868ab, styles.r_2cd02d11, styles.r_7ebecbb6, styles.r_7d81d989)}>
          <Image
            src={full.cover}
            alt={full.name}
            fill
            priority
            unoptimized
            className={styles.r_7d85d0c2}
            style={{ objectPosition: full.coverPosition ?? 'center center' }} />

          <div className={cx(styles.heroOverlay, styles.r_da4dbfbc, styles.r_7b7df044, styles.r_79257b8c, styles.r_0bb032b9, styles.r_3e4c86d8, styles.r_0fe2b3da)} />
        </div>

        <GalleryBlock speciesName={full.name} items={galleryItems} />
      </div>
      <DescriptionTabsCard tabs={descriptionTabs} />
    </section>);

}

function GalleryBlock({
  speciesName,
  items
}: {speciesName: string;items: NonNullable<FullSpecies['galleryItems']>;}) {
  return (
    <div className={cx(styles.galleryBlock, styles.r_b950dda2, styles.r_88b684d2, styles.r_c07e54fd)}>
      <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_6f27f4f7, styles.r_8ef2268e, styles.r_1004c0c3)}>
        <div>
          <h2 className={cx(styles.sectionTitle, styles.r_42536e69, styles.r_69450ef1, styles.r_4ddaa618)}>图集</h2>
        </div>
      </div>

      <SpeciesGalleryWall speciesName={speciesName} items={items} />
    </div>);

}

function getDescriptionTabs(full: FullSpecies) {
  const fallbackTabs = full.description ? [{
    id: 'description',
    title: '品种简介',
    contentJson: full.descriptionJson,
    contentHtml: full.descriptionJson ? full.description : undefined,
    contentText: full.descriptionJson ? undefined : full.descriptionText || full.description
  }] : [];
  return (full.descriptionTabs ?? fallbackTabs)
    .map((tab, index) => ({
      ...tab,
      id: tab.id || `description-tab-${index}`,
      title: tab.title || `栏目 ${index + 1}`
    }));
}

function DescriptionTabsCard({ tabs }: {tabs: ReturnType<typeof getDescriptionTabs>;}) {
  if (tabs.length === 0) return null;
  return (
    <Card padding="none" className={styles.descriptionTabsCard}>
      <Tabs defaultValue={tabs[0]?.id}>
        <TabsList className={styles.descriptionTabsList}>
          {tabs.map((tab) =>
          <TabsTrigger key={tab.id} value={tab.id}>
              {tab.title}
            </TabsTrigger>
          )}
        </TabsList>
        {tabs.map((tab) =>
        <TabsContent key={tab.id} value={tab.id} className={styles.descriptionTabsContent}>
            <RichTextView
            json={tab.contentJson}
            html={tab.contentJson ? tab.contentHtml : undefined}
            text={tab.contentJson ? undefined : tab.contentText || tab.contentHtml}
            size="sm"
            className={cx(styles.descriptionText, styles.r_a2edcb1a, styles.r_170cee3f)} />
          </TabsContent>
        )}
      </Tabs>
    </Card>);

}

function RightActionRail({
  params,
  full,
  relatedSpecies,
  contributors,
  contributorTotal






}: {params: {categorySlug: string;genusSlug: string;speciesSlug: string;};full: FullSpecies;relatedSpecies: Array<any>;contributors: Array<{id: string;name: string;avatar: string;}>;contributorTotal: number;}) {
  const visibleContributors = contributors.slice(0, 11);
  const hiddenContributorCount = Math.max(0, contributorTotal - visibleContributors.length);

  return (
    <aside className={cx(styles.sideRail, styles.r_3e7ce58d, styles.r_f271783c, styles.r_6a0dd79a, styles.r_bb3508ed)}>
      <section className={cx(styles.sideCard, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_438b2237)}>
        <div className={cx(styles.sideCardHeaderGap, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <img src="/icons/plants_difficulty_medal.svg" alt="" className={cx(styles.r_cd0d9c51, styles.r_72470489)} />
          <h2 className={cx(styles.sideCardHeading, styles.r_69450ef1, styles.r_4ddaa618)}>难度评分</h2>
        </div>
        <div className={cx(styles.sideCardBodyFlush, styles.r_0ab86672)}>
          <SpeciesRatingPanel speciesId={full.id} fallbackAvg={full.difficulty} />
        </div>
      </section>

      <section className={cx(styles.sideCard, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_438b2237)}>
        <h2 className={cx(styles.sideCardHeading, styles.sideCardHeadingGap, styles.r_69450ef1, styles.r_4ddaa618)}>图鉴贡献</h2>
        {visibleContributors.length > 0 ?
        <div className={cx(styles.sideCardBodyFlush, styles.r_0ab86672, styles.r_f3c543ad, styles.r_736c5589, styles.r_41c9ba83)}>
            {visibleContributors.map((user, index) =>
          <Link
            key={user.id}
            href={`/user/${user.id}`}
            title={user.name}
            className={cx(styles.r_8ffe7a29, styles.r_bbf21284)}
            style={{ zIndex: visibleContributors.length - index }}>

                <UserAvatar src={user.avatar} alt={user.name} size={30} className={cx(styles.r_16b1efa5, styles.r_0af61200)} />
              </Link>
          )}
            {hiddenContributorCount > 0 &&
          <span
            className={cx(styles.r_8ffe7a29, styles.r_f3c543ad, styles.r_aad4845a, styles.r_3aa26dd0, styles.r_67d66567, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_1dc571a3, styles.r_e83a7042, styles.r_5f6a59f1, styles.r_16b1efa5, styles.r_0af61200)}
            style={{ zIndex: 0 }}>

                +{hiddenContributorCount}
              </span>
          }
          </div> :

        <div className={cx(styles.sideCardBodyFlush, styles.r_0ab86672, styles.r_c10ff8c0, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_e7eab4cb)}>
            还没有已采纳的贡献
          </div>
        }
        <SpeciesContributionButton speciesId={full.id} speciesName={full.name} />
        <p className={cx(styles.r_eccd13ef, styles.r_359090c2, styles.r_7b89cd85)}>已有 {contributorTotal} 位玩家参与完善</p>
      </section>

      <section className={cx(styles.sideCard, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_438b2237)}>
        <div className={cx(styles.sideCardHeaderGap, styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
          <h2 className={cx(styles.sideCardHeading, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>同属其他品种</h2>
          <Link
            href={`/plants/${params.categorySlug}/${params.genusSlug}`}
            className={cx(styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_f673f4a7)}>

            查看全部 →
          </Link>
        </div>
        <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_77a2a20e)}>
          {relatedSpecies.map((item) =>
          <RelatedSpeciesCard
            key={item.id}
            item={item}
            href={`/plants/${params.categorySlug}/${params.genusSlug}/${item.slug}`} />

          )}
          {relatedSpecies.length === 0 &&
          <div className={cx(styles.r_40efc065, styles.r_c10ff8c0, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_e7eab4cb)}>当前同属下暂无其他品种</div>
          }
        </div>
      </section>
    </aside>);

}

function RelatedSpeciesCard({
  item,
  href



}: {item: any;href: string;}) {
  return (
    <Link
      href={href}
      className={cx(styles.r_64292b1c, styles.r_0214b4b3, styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_b8627687, styles.r_9e85ac05)}>

      <div className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_2cd02d11, styles.r_7ebecbb6)}>
        <Image
          src={item.cover}
          alt={item.name}
          fill
          sizes="160px"
          className={cx(styles.r_7d85d0c2, styles.r_eadef238, styles.r_1a9195e1)}
          unoptimized />

        <div className={cx(styles.r_da4dbfbc, styles.r_7971386c, styles.r_c55dcda2, styles.r_ac204c10, styles.r_75fe048d, styles.r_45d82811, styles.r_68ecb30d, styles.r_e0988086, styles.r_5f6a59f1)}>
          {'★'.repeat(Math.max(1, Math.min(5, item.difficulty ?? 1)))}
        </div>
      </div>
      <div className={styles.r_7660b450}>
        <div className={cx(styles.r_f283ea9b, styles.r_69cdf25a, styles.r_2689f395, styles.r_399e11a5, styles.r_0eb80431)}>
          {item.name}
        </div>
        <div className={cx(styles.r_15e1b1f4, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_44ee8ba0, styles.r_1dc571a3, styles.r_6c4cc49e)}>
          <span className={cx(styles.r_7e0b7cdf, styles.r_f283ea9b, styles.r_90665ca6)}>{item.latinName}</span>
          <span className={cx(styles.r_012fbd12, styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="edit" size={11} />
            {item._count?.posts ?? 0}
          </span>
        </div>
      </div>
    </Link>);

}

function InfoCards({
  full,
  boardName,
  genusName




}: {full: FullSpecies;boardName: string;genusName: string;}) {
  const care = getCareProfile(full);

  return (
    <section className={cx(styles.infoGrid, styles.r_f3c543ad, styles.r_0c3bc985, styles.r_5067ab35)}>
      <InfoGroup title="基础信息">
        <InfoRow label="中文名" value={full.name} />
        <InfoRow label="拉丁名" value={full.latinName} />
        <InfoRow label="科属" value={`${boardName} / ${genusName}`} />
        <InfoRow label="原产地" value={full.originRegion ?? '资料待补充'} />
        <InfoRow label="花期" value={full.blooming ?? '资料待补充'} />
        <InfoRow label="别名" value={full.alias.length > 0 ? full.alias.slice(0, 3).join('、') : '暂无'} />
      </InfoGroup>

      <InfoGroup title="环境需求">
        <InfoRow label="光照需求" value={care.lightRequirement} />
        <InfoRow label="适宜温度" value={care.idealTemperature} />
        <InfoRow label="最低温度" value={care.minTemperature} />
        <InfoRow label="最高温度" value={care.maxTemperature} />
        <InfoRow label="适宜湿度" value={care.humidity} />
        <InfoRow label="配土建议" value={care.soil} />
      </InfoGroup>
    </section>);

}

function InfoGroup({ title, badge, children }: {title: string;badge?: string;children: React.ReactNode;}) {
  return (
    <section className={cx(styles.infoCard, styles.r_7e0b7cdf, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_c07e54fd, styles.r_438b2237)}>
      <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
        <h3 className={cx(styles.r_4ee73492, styles.r_69450ef1, styles.r_4ddaa618)}>{title}</h3>
        {badge && <span className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_d058ca6d, styles.r_e83a7042, styles.r_e7eab4cb)}>{badge}</span>}
      </div>
      <div className={cx(styles.r_6ed543e2, styles.r_fc7473ca)}>{children}</div>
    </section>);

}

function InfoRow({ label, value }: {label: string;value: string;}) {
  return (
    <div className={cx(styles.infoRow, styles.r_60fbb771, styles.r_60541e1e, styles.r_8ef2268e, styles.r_1004c0c3, styles.r_65fdbade, styles.r_5ff6a729, styles.r_f4cc511f, styles.r_c2db4490, styles.r_dcd339c6)}>
      <span className={cx(styles.r_012fbd12, styles.r_7b89cd85)}>{label}</span>
      <span className={cx(styles.r_308fc069, styles.r_2689f395, styles.r_399e11a5)}>{value}</span>
    </div>);

}

function getCareProfile(full: FullSpecies) {
  const light = full.light || '充足阳光';
  const watering = full.watering || '干透浇透';
  const hardiness = full.hardiness || '5°C';
  const growthType = full.growthType ?? '';
  const riskText = full.riskTips.join(' ');
  const hasSummerDormancy = /冬型|夏眠|休眠/.test(growthType);
  const isFastGrowth = /夏型|中间型|快/.test(growthType);
  const diseasePest = !riskText ?
  '不明显' :
  /严重|高发|易发|黑腐|介壳|根粉|蚧壳|病虫/.test(riskText) ?
  '明显' :
  '轻微';

  return {
    light,
    lightRequirement: full.lightRequirement || light,
    lightPercent: /全日照|充足|强光/.test(light) ? 86 : /散射|半日照/.test(light) ? 64 : 48,
    temperature: `${full.idealTemperature || "15-28°C"} / 耐寒 ${full.minTemperature || hardiness}`,
    temperaturePercent: 68,
    watering,
    wateringPercent: /少|控|干透/.test(watering) ? 42 : /中|见干/.test(watering) ? 58 : 72,
    growthSpeed: full.growthSpeed || (isFastGrowth ? '较快' : '中等'),
    growthSpeedPercent: isFastGrowth ? 76 : 56,
    summerDormancy: full.summerDormancy || (hasSummerDormancy ? '明显' : '不明显'),
    summerDormancyPercent: hasSummerDormancy ? 78 : 32,
    diseasePest,
    idealTemperature: full.idealTemperature || "15-28°C",
    minTemperature: full.minTemperature || hardiness,
    maxTemperature: full.maxTemperature || '35°C',
    humidity: full.humidity || "20%-60%",
    soil: full.soil || (full.difficulty >= 4 ? '颗粒土 80%+' : '颗粒土 70%+')
  };
}

function LowerModules({
  full,
  posts,
  params




}: {full: FullSpecies;posts: Array<any>;params: {categorySlug: string;genusSlug: string;speciesSlug: string;};}) {
  return (
    <section className={cx(styles.r_f3c543ad, styles.r_0c3bc985)}>
      {full.tips.length > 0 &&
      <section className={cx(styles.contentCard, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_c07e54fd, styles.r_438b2237)}>
          <SectionHead title="养护经验" />
          <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_e4d6f343)}>
            {full.tips.slice(0, 6).map((tip, index) =>
          <div key={`${tip}-${index}`} className={cx(styles.r_c10ff8c0, styles.r_52f53b18, styles.r_8e63407b, styles.r_fc7473ca, styles.r_18550d59, styles.r_eb6abb1f)}>
                <div className={cx(styles.r_a77ed4d9, styles.r_52083e7d, styles.r_d0a52b31, styles.r_23abacb5, styles.r_3960ffc2, styles.r_86843cf1, styles.r_c10ff8c0, styles.r_5e10cdb8, styles.r_d5eab218, styles.r_359090c2, styles.r_e83a7042, styles.r_5f6a59f1)}>
                  #{index + 1}
                </div>
                <div className={cx(styles.r_a2edcb1a, styles.r_170cee3f)}>{tip}</div>
              </div>
          )}
          </div>
        </section>
      }

      <section className={cx(styles.contentCard, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_c07e54fd, styles.r_438b2237)}>
        <SectionHead title="玩家作品精选" href={`/board/${params.categorySlug}/${params.genusSlug}/${params.speciesSlug}`} />
        <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_e00ad816, styles.r_4558bce6)}>
          {posts.slice(0, 4).map((post) => {
            const cover = post.cover ?? post.images?.[0] ?? full.cover;
            return (
              <Link key={post.id} href={`/post/${post.id}`} className={cx(styles.workCard, styles.r_64292b1c, styles.r_2cd02d11, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8)}>
                <div className={cx(styles.r_d89972fe, styles.r_357868ab, styles.r_7ebecbb6)}>
                  <Image src={cover} alt={post.title} fill className={cx(styles.r_7d85d0c2, styles.r_56bf8ae8, styles.r_1a9195e1)} unoptimized />
                </div>
                <div className={styles.r_eb6e8b88}>
                  <div className={cx(styles.r_f50e2015, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{post.title}</div>
                  <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_359090c2, styles.r_7b89cd85)}>
                    <span>{post.author.name}</span>
                    <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0)}><Icon name="heart" size={12} />{formatNumber(post.likes)}</span>
                  </div>
                </div>
              </Link>);

          })}
        </div>
      </section>
    </section>);

}

function SectionHead({ title, href }: {title: string;href?: string;}) {
  return (
    <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
      <h2 className={cx(styles.r_4ee73492, styles.r_69450ef1, styles.r_4ddaa618)}>{title}</h2>
      {href &&
      <Link href={href} className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_359090c2, styles.r_e83a7042, styles.r_7b89cd85, styles.r_9825203a)}>
          查看全部
          <Icon name="arrow-right" size={12} />
        </Link>
      }
    </div>);

}

function firstHref(board: Taxonomy[number]) {
  const genus = board.genera[0];
  const species = genus?.species[0];
  if (!genus || !species) return '/plants';
  return `/plants/${board.slug}/${genus.slug}/${species.slug}`;
}

function compactNumber(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}k`;
  return formatNumber(n);
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}
