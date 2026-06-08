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
import { Icon, type IconName } from '@/components/ui/Icon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { prisma } from '@/lib/db';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';
import { jsonLdScript, speciesJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { parseJsonArray } from '@/lib/api';
import { postInclude } from '@/lib/post-include';
import { serializePost, serializeSpeciesFull } from '@/lib/serializers';
import { sortPostsForPins } from '@/lib/post-pins';
import { getCurrentUser } from '@/lib/auth';
import { cn, formatNumber } from '@/lib/utils';
import { incrementSpeciesDailyStat } from '@/lib/species-daily-stats';
import { removeCoverFromGallery } from '@/lib/species-gallery';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://plantcommunity.cn';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { categorySlug: string; genusSlug: string; speciesSlug: string };
}): Promise<Metadata> {
  const species = await prisma.species
    .findFirst({
      where: {
        slug: params.speciesSlug,
        genus: {
          slug: params.genusSlug,
          board: { slug: params.categorySlug },
        },
      },
      include: { genus: { include: { board: true } } },
    })
    .catch(() => null);

  if (!species) return {};

  const aliases = parseJsonArray(species.alias);
  const tips = parseJsonArray(species.tips);
  const title = `${species.name}${species.latinName ? `(${species.latinName})` : ''} 养护图鉴`;
  const description = [
    `${species.name}${species.latinName ? `(${species.latinName})` : ''}`,
    aliases.length ? `别名:${aliases.join('、')}` : '',
    species.description?.slice(0, 80),
    tips[0],
  ]
    .filter(Boolean)
    .join(' · ');

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
      '多肉植物',
    ].filter(Boolean) as string[],
    openGraph: {
      type: 'article',
      title,
      description,
      images: species.cover ? [{ url: species.cover, alt: species.name }] : undefined,
    },
  };
}

export default async function PlantSpeciesPage({
  params,
}: {
  params: { categorySlug: string; genusSlug: string; speciesSlug: string };
}) {
  const species = await prisma.species.findFirst({
    where: {
      slug: params.speciesSlug,
      genus: {
        slug: params.genusSlug,
        board: { slug: params.categorySlug },
      },
    },
    include: {
      genus: { include: { board: true } },
      _count: { select: { posts: true, journals: true, ratings: true, marketListings: true } },
    },
  });
  if (!species) notFound();

  const full = serializeSpeciesFull(species);
  await incrementSpeciesDailyStat(species.id, 'views');
  const mePromise = getCurrentUser().catch(() => null);
  const [postsRaw, relatedSpecies, taxonomy, contributionUsersRaw, contributionStatsRaw, collectTotalRows, me] = await Promise.all([
    prisma.post.findMany({
      where: {
        speciesId: species.id,
        deleted: false,
        ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: postInclude(),
    }),
    prisma.species.findMany({
      where: { genusId: species.genusId, id: { not: species.id } },
      include: { _count: { select: { posts: true, ratings: true, collects: true } } },
      orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
      take: 6,
    }),
    getTaxonomy(),
    prisma.$queryRaw<Array<{ id: string; name: string; avatar: string }>>`
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
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(DISTINCT userId) AS total
      FROM species_contributions
      WHERE speciesId = ${species.id} AND status = 'approved'
    `,
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) AS total
      FROM species_collects
      WHERE speciesId = ${species.id}
    `,
    mePromise,
  ]);

  const posts = sortPostsForPins(
    postsRaw.map((p: any) => serializePost(p, undefined, undefined, me)),
    [{ scope: 'species', targetId: species.id }],
  );

  const galleryItems = removeCoverFromGallery(full.galleryItems ?? [], full.cover).slice(0, 8);
  const metrics = makeMetrics(species._count.posts, species._count.journals, species.ratingCount, full.difficulty);
  const contributors = contributionUsersRaw;
  const contributorTotal = Number(contributionStatsRaw[0]?.total ?? 0);
  const collectTotal = Number(collectTotalRows[0]?.total ?? 0);
  const [collectedRows, comparedRows] = me
    ? await Promise.all([
        prisma.$queryRaw<Array<{ userId: string }>>`
          SELECT userId FROM species_collects
          WHERE userId = ${me.id} AND speciesId = ${species.id}
          LIMIT 1
        `,
        prisma.$queryRaw<Array<{ userId: string }>>`
          SELECT userId FROM species_compares
          WHERE userId = ${me.id} AND speciesId = ${species.id}
          LIMIT 1
        `,
      ])
    : [[], []];
  const initiallyCollected = collectedRows.length > 0;
  const initiallyCompared = comparedRows.length > 0;
  const speciesUrl = `${SITE_URL}/plants/${params.categorySlug}/${params.genusSlug}/${params.speciesSlug}`;
  const speciesLd = speciesJsonLd({
    name: full.name,
    latinName: full.latinName,
    family: `${species.genus.board?.name ?? ''} · ${species.genus.name}`,
    description: full.description,
    cover: full.cover.startsWith('http') ? full.cover : `${SITE_URL}${full.cover}`,
    url: speciesUrl,
    difficulty: full.difficulty,
  });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: '首页', url: SITE_URL },
    { name: '植物图鉴', url: `${SITE_URL}/plants` },
    { name: species.genus.board?.name ?? '', url: `${SITE_URL}/plants/${params.categorySlug}` },
    { name: species.genus.name, url: `${SITE_URL}/plants/${params.categorySlug}/${params.genusSlug}` },
    { name: full.name, url: speciesUrl },
  ]);
  const care = getCareProfile(full);

  return (
    <AppShell showFloatingAi={false} className="!max-w-[1280px]">
      {jsonLdScript([...speciesLd, breadcrumbLd])}
      <SpeciesDetailActions
        species={{
          id: params.speciesSlug,
          speciesId: full.id,
          name: full.name,
          url: `/plants/${params.categorySlug}/${params.genusSlug}/${params.speciesSlug}`,
          collected: initiallyCollected,
          collectTotal,
          compared: initiallyCompared,
        }}
      />
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-24 pt-[18px]">
        <PlantBreadcrumb path={full.path} />
        <TaxonomyPanel taxonomy={taxonomy} current={params} />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
          <main className="min-w-0 space-y-3">
            <DetailHero
              full={full}
              boardName={species.genus.board?.name ?? ''}
              genusName={species.genus.name}
              galleryItems={galleryItems}
              metrics={metrics}
              collectTotal={collectTotal}
            />

            <SpeciesCareVotePanel
              speciesId={full.id}
              defaults={{
                light: full.light || care.light,
                idealTemperature: full.idealTemperature || care.idealTemperature,
                watering: full.watering || care.watering,
                hardiness: full.hardiness || care.minTemperature,
                growthSpeed: full.growthSpeed || care.growthSpeed,
                humidity: full.humidity || care.humidity,
              }}
              profile={{
                light: care.light,
                temperature: care.idealTemperature,
                watering: care.watering,
                hardiness: care.minTemperature,
                humidity: care.humidity,
                ventilation: '良好通风',
                soil: care.soil,
                repotCycle: '1-2年',
                growthSeason: full.growthType || care.growthSpeed,
                fertilizer: full.difficulty >= 4 ? '少量薄肥' : '生长期薄肥',
                location: '阳台/露台',
                blooming: full.blooming || '春末-夏初',
                dormancy: care.summerDormancy === '不明显' ? '轻微休眠' : `${care.summerDormancy}休眠`,
                fruiting: '秋季',
                propagation: '播种、扦插',
              }}
            />

            <InfoCards
              full={full}
              boardName={species.genus.board?.name ?? ''}
              genusName={species.genus.name}
            />

            <LowerModules
              full={full}
              posts={posts}
              params={params}
            />
          </main>

          <RightActionRail
            params={params}
            full={full}
            relatedSpecies={relatedSpecies}
            contributors={contributors}
            contributorTotal={contributorTotal}
          />
        </div>
      </div>
    </AppShell>
  );
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
            select: { id: true, slug: true, name: true, latinName: true, cover: true },
          },
        },
      },
    },
  });
}

type Taxonomy = Awaited<ReturnType<typeof getTaxonomy>>;
type FullSpecies = ReturnType<typeof serializeSpeciesFull>;

function TaxonomyPanel({
  taxonomy,
  current,
}: {
  taxonomy: Taxonomy;
  current: { categorySlug: string; genusSlug: string; speciesSlug: string };
}) {
  const currentBoard = taxonomy.find((board) => board.slug === current.categorySlug);
  const currentGenus = currentBoard?.genera.find((genus) => genus.slug === current.genusSlug);

  return (
    <section className="rounded-[6px] border border-leaf-100 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <TaxonomyFilterRow label="科">
          {taxonomy.map((board) => (
            <TaxonomyChip
              key={board.id}
              href={firstHref(board)}
              active={board.slug === current.categorySlug}
            >
              {board.name}
              <span className="ml-1 text-[10px] opacity-60">
                {board.genera.reduce((sum, genus) => sum + genus.species.length, 0)}
              </span>
            </TaxonomyChip>
          ))}
        </TaxonomyFilterRow>

        {currentBoard && currentBoard.genera.length > 0 && (
          <TaxonomyFilterRow label="属">
            <TaxonomyChip href={`/plants/${current.categorySlug}`} active={false}>
              全部
            </TaxonomyChip>
            {currentBoard.genera.map((genus) => (
              <TaxonomyChip
                key={genus.id}
                href={genus.species[0] ? `/plants/${current.categorySlug}/${genus.slug}/${genus.species[0].slug}` : '#'}
                active={genus.slug === current.genusSlug}
              >
                {genus.name}
                <span className="ml-1 text-[10px] opacity-60">{genus.species.length}</span>
              </TaxonomyChip>
            ))}
          </TaxonomyFilterRow>
        )}

        {currentGenus && currentGenus.species.length > 0 && (
          <TaxonomyFilterRow label="品种">
            {currentGenus.species.map((item) => (
              <TaxonomyChip
                key={item.id}
                href={`/plants/${current.categorySlug}/${current.genusSlug}/${item.slug}`}
                active={item.slug === current.speciesSlug}
              >
                <span className="relative -ml-1 h-5 w-5 shrink-0 overflow-hidden rounded-[6px] bg-leaf-50">
                  <Image src={item.cover} alt={item.name} fill className="object-cover" unoptimized />
                </span>
                <span>{item.name}</span>
              </TaxonomyChip>
            ))}
          </TaxonomyFilterRow>
        )}
      </div>
    </section>
  );
}

function PlantBreadcrumb({
  path,
}: {
  path: { level: 'category' | 'genus' | 'species'; slug: string; name: string }[];
}) {
  const href = (index: number) => {
    const slugs = path.slice(0, index + 1).map((p) => p.slug);
    return '/plants/' + slugs.map(encodeURIComponent).join('/');
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-leaf-700/70">
      <Link href="/plants" className="hover:text-leaf-700">
        植物图鉴
      </Link>
      {path.map((p, i) => {
        const isLast = i === path.length - 1;
        const isCategory = p.level === 'category';
        return (
          <span key={`${p.level}-${p.slug}`} className="contents">
            <Icon name="arrow-right" size={12} />
            {isLast || isCategory ? (
              <span className={isLast ? 'text-ink-700' : 'text-leaf-700/60'}>
                {p.name}
              </span>
            ) : (
              <Link href={href(i)} className="hover:text-leaf-700">
                {p.name}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
}

function TaxonomyFilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="mt-1 w-12 shrink-0 text-leaf-700/60">{label}</span>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function TaxonomyChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs transition-colors',
        active ? 'bg-leaf-100 font-medium text-leaf-700' : 'text-ink-700/80 hover:bg-leaf-50 hover:text-leaf-700',
      )}
    >
      {children}
    </Link>
  );
}

function DetailHero({
  full,
  boardName,
  genusName,
  galleryItems,
  metrics,
  collectTotal,
}: {
  full: FullSpecies;
  boardName: string;
  genusName: string;
  galleryItems: NonNullable<FullSpecies['galleryItems']>;
  metrics: DetailMetrics;
  collectTotal: number;
}) {
  return (
    <section className="overflow-hidden rounded-[6px] border border-leaf-100 bg-white shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden bg-leaf-50 md:aspect-[16/9]">
        <Image
          src={full.cover}
          alt={full.name}
          fill
          priority
          unoptimized
          className="object-cover"
          style={{ objectPosition: full.coverPosition ?? 'center center' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/35 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-4 text-white md:p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 self-end">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold md:text-3xl">{full.name}</h1>
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-leaf-600 text-white">
                  <Icon name="check" size={12} />
                </span>
              </div>
              {full.latinName && <p className="mt-1 text-sm italic text-white/80">{full.latinName}</p>}
              <p className="mt-1 text-xs text-white/70">{boardName} · {genusName}</p>
              {full.description && (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/90 md:line-clamp-3">
                  {full.description}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <SidebarTag icon="plants" text={full.growthType ?? '易养护'} />
                <SidebarTag icon="trophy" text="观赏性强" />
                <SidebarTag icon="star" text="经典品种" />
              </div>
            </div>

            <div className="min-w-0 self-end">
              <div className="grid grid-cols-2 gap-2">
                <SidebarStat label="收藏人数" value={compactNumber(collectTotal)} icon="bookmark" />
                <SidebarStat label="玩家记录" value={metrics.journalsText} icon="camera" />
                <SidebarStat label="热度指数" value={metrics.heatText} icon="star" />
                <SidebarStat label="最近热度" value={`↑ ${metrics.recentGrowth}%`} icon="arrow-right" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <GalleryBlock speciesName={full.name} items={galleryItems} />
    </section>
  );
}

function GalleryBlock({
  speciesName,
  items,
}: {
  speciesName: string;
  items: NonNullable<FullSpecies['galleryItems']>;
}) {
  return (
    <div className="border-t border-leaf-100 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink-900">图集</h2>
        </div>
      </div>

      <SpeciesGalleryWall speciesName={speciesName} items={items} />
    </div>
  );
}

function SidebarTag({ icon, text }: { icon: IconName; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-medium text-white">
      <Icon name={icon} size={12} />
      {text}
    </span>
  );
}

function SidebarStat({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <div className="rounded-[6px] border border-white/15 bg-white/15 p-3 text-white shadow-sm">
      <div className="flex items-center justify-between gap-2 text-[11px] text-white/70">
        <span>{label}</span>
        <Icon name={icon} size={13} />
      </div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}

function RightActionRail({
  params,
  full,
  relatedSpecies,
  contributors,
  contributorTotal,
}: {
  params: { categorySlug: string; genusSlug: string; speciesSlug: string };
  full: FullSpecies;
  relatedSpecies: Array<any>;
  contributors: Array<{ id: string; name: string; avatar: string }>;
  contributorTotal: number;
}) {
  const visibleContributors = contributors.slice(0, 11);
  const hiddenContributorCount = Math.max(0, contributorTotal - visibleContributors.length);

  return (
    <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
      <section className="rounded-[6px] border border-leaf-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/icons/plants_difficulty_medal.svg" alt="" className="h-5 w-5" />
          <h2 className="font-bold text-ink-900">难度评分</h2>
        </div>
        <div className="mt-4">
          <SpeciesRatingPanel speciesId={full.id} fallbackAvg={full.difficulty} />
        </div>
      </section>

      <section className="rounded-[6px] border border-leaf-100 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-ink-900">图鉴贡献</h2>
        {visibleContributors.length > 0 ? (
          <div className="mt-4 grid grid-cols-6 gap-y-2">
            {visibleContributors.map((user, index) => (
              <Link
                key={user.id}
                href={`/user/${user.id}`}
                title={user.name}
                className="-ml-2 first:ml-0"
                style={{ zIndex: visibleContributors.length - index }}
              >
                <UserAvatar src={user.avatar} alt={user.name} size={30} className="ring-2 ring-white" />
              </Link>
            ))}
            {hiddenContributorCount > 0 && (
              <span
                className="-ml-2 grid h-[30px] min-w-[30px] place-items-center rounded-full bg-leaf-50 px-2 text-[10px] font-semibold text-leaf-700 ring-2 ring-white"
                style={{ zIndex: 0 }}
              >
                +{hiddenContributorCount}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-[6px] bg-leaf-50 px-3 py-2 text-xs text-leaf-800">
            还没有已采纳的贡献
          </div>
        )}
        <SpeciesContributionButton speciesId={full.id} speciesName={full.name} />
        <p className="mt-3 text-xs text-ink-500">已有 {contributorTotal} 位玩家参与完善</p>
      </section>

      <section className="rounded-[6px] border border-leaf-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink-800">同属其他品种</h2>
          <Link
            href={`/plants/${params.categorySlug}/${params.genusSlug}`}
            className="text-[11px] text-leaf-700 hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {relatedSpecies.map((item) => (
            <RelatedSpeciesCard
              key={item.id}
              item={item}
              href={`/plants/${params.categorySlug}/${params.genusSlug}/${item.slug}`}
            />
          ))}
          {relatedSpecies.length === 0 && (
            <div className="col-span-2 rounded-[6px] bg-leaf-50 px-3 py-2 text-xs text-leaf-800">当前同属下暂无其他品种</div>
          )}
        </div>
      </section>
    </aside>
  );
}

function RelatedSpeciesCard({
  item,
  href,
}: {
  item: any;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-lg border border-leaf-100 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-leaf-50">
        <Image
          src={item.cover}
          alt={item.name}
          fill
          sizes="160px"
          className="object-cover transition-transform group-hover:scale-105"
          unoptimized
        />
        <div className="absolute left-1 top-1 rounded-full bg-white/85 px-1.5 py-0 text-[9px] text-leaf-700">
          {'★'.repeat(Math.max(1, Math.min(5, item.difficulty ?? 1)))}
        </div>
      </div>
      <div className="p-2">
        <div className="truncate text-[12px] font-medium text-ink-800 group-hover:text-leaf-700">
          {item.name}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px] text-leaf-700/60">
          <span className="min-w-0 truncate italic">{item.latinName}</span>
          <span className="shrink-0">📝 {item._count?.posts ?? 0}</span>
        </div>
      </div>
    </Link>
  );
}

function InfoCards({
  full,
  boardName,
  genusName,
}: {
  full: FullSpecies;
  boardName: string;
  genusName: string;
}) {
  const care = getCareProfile(full);

  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
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
    </section>
  );
}

function InfoGroup({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-[6px] border border-leaf-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-ink-900">{title}</h3>
        {badge && <span className="rounded-full bg-leaf-50 px-3 py-1 text-[11px] font-semibold text-leaf-800">{badge}</span>}
      </div>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-leaf-50 pb-2 last:border-0 last:pb-0">
      <span className="shrink-0 text-ink-500">{label}</span>
      <span className="text-right font-medium text-ink-800">{value}</span>
    </div>
  );
}

function getCareProfile(full: FullSpecies) {
  const light = full.light || '充足阳光';
  const watering = full.watering || '干透浇透';
  const hardiness = full.hardiness || '5°C';
  const growthType = full.growthType ?? '';
  const riskText = full.riskTips.join(' ');
  const hasSummerDormancy = /冬型|夏眠|休眠/.test(growthType);
  const isFastGrowth = /夏型|中间型|快/.test(growthType);
  const diseasePest = !riskText
    ? '不明显'
    : /严重|高发|易发|黑腐|介壳|根粉|蚧壳|病虫/.test(riskText)
      ? '明显'
      : '轻微';

  return {
    light,
    lightRequirement: full.lightRequirement || light,
    lightPercent: /全日照|充足|强光/.test(light) ? 86 : /散射|半日照/.test(light) ? 64 : 48,
    temperature: `${full.idealTemperature || '15-28°C'} / 耐寒 ${full.minTemperature || hardiness}`,
    temperaturePercent: 68,
    watering,
    wateringPercent: /少|控|干透/.test(watering) ? 42 : /中|见干/.test(watering) ? 58 : 72,
    growthSpeed: full.growthSpeed || (isFastGrowth ? '较快' : '中等'),
    growthSpeedPercent: isFastGrowth ? 76 : 56,
    summerDormancy: full.summerDormancy || (hasSummerDormancy ? '明显' : '不明显'),
    summerDormancyPercent: hasSummerDormancy ? 78 : 32,
    diseasePest,
    idealTemperature: full.idealTemperature || '15-28°C',
    minTemperature: full.minTemperature || hardiness,
    maxTemperature: full.maxTemperature || '35°C',
    humidity: full.humidity || '20%-60%',
    soil: full.soil || (full.difficulty >= 4 ? '颗粒土 80%+' : '颗粒土 70%+'),
  };
}

function LowerModules({
  full,
  posts,
  params,
}: {
  full: FullSpecies;
  posts: Array<any>;
  params: { categorySlug: string; genusSlug: string; speciesSlug: string };
}) {
  return (
    <section className="grid gap-4">
      {full.tips.length > 0 && (
        <section className="rounded-[6px] border border-leaf-100 bg-white p-5 shadow-sm">
          <SectionHead title="养护经验" />
          <div className="grid gap-3 md:grid-cols-2">
            {full.tips.slice(0, 6).map((tip, index) => (
              <div key={`${tip}-${index}`} className="rounded-[6px] bg-leaf-50/70 p-4 text-sm leading-6 text-ink-700">
                <div className="mb-2 inline-flex h-7 min-w-7 items-center justify-center rounded-[6px] bg-white px-2 text-xs font-semibold text-leaf-700">
                  #{index + 1}
                </div>
                <div className="whitespace-pre-wrap break-words">{tip}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-[6px] border border-leaf-100 bg-white p-5 shadow-sm">
        <SectionHead title="玩家作品精选" href={`/board/${params.categorySlug}/${params.genusSlug}/${params.speciesSlug}`} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {posts.slice(0, 4).map((post) => {
            const cover = post.cover ?? post.images?.[0] ?? full.cover;
            return (
              <Link key={post.id} href={`/post/${post.id}`} className="group overflow-hidden rounded-[6px] border border-leaf-100 bg-white">
                <div className="relative aspect-[4/3] bg-leaf-50">
                  <Image src={cover} alt={post.title} fill className="object-cover transition group-hover:scale-105" unoptimized />
                </div>
                <div className="p-3">
                  <div className="line-clamp-1 text-sm font-semibold text-ink-800">{post.title}</div>
                  <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                    <span>{post.author.name}</span>
                    <span className="inline-flex items-center gap-1"><Icon name="heart" size={12} />{formatNumber(post.likes)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function SectionHead({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-base font-bold text-ink-900">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-leaf-700">
          查看全部
          <Icon name="arrow-right" size={12} />
        </Link>
      )}
    </div>
  );
}

function firstHref(board: Taxonomy[number]) {
  const genus = board.genera[0];
  const species = genus?.species[0];
  if (!genus || !species) return '/plants';
  return `/plants/${board.slug}/${genus.slug}/${species.slug}`;
}

type DetailMetrics = ReturnType<typeof makeMetrics>;

function makeMetrics(posts: number, journals: number, ratingCount: number, difficulty: number) {
  const favorites = Math.max(1280, posts * 236 + ratingCount * 71 + difficulty * 420);
  const heat = Math.max(6800, posts * 310 + journals * 180 + ratingCount * 95 + difficulty * 900);
  const recentGrowth = Math.min(42, Math.max(8, Math.round((posts + ratingCount + difficulty * 3) % 35) + 8));
  return {
    favorites,
    favoritesText: compactNumber(favorites),
    journals,
    journalsText: compactNumber(Math.max(1200, journals * 180 + posts * 120)),
    heat,
    heatText: compactNumber(heat),
    recentGrowth,
    contributors: Math.max(12, Math.round((posts + ratingCount) / 2)),
  };
}

function compactNumber(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}k`;
  return formatNumber(n);
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}
