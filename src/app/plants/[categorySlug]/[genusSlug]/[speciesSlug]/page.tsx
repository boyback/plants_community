import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SpeciesDetailActions } from '@/components/species/SpeciesDetailActions';
import { SpeciesContributionButton } from '@/components/species/SpeciesContributionButton';
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
      orderBy: [{ collects: { _count: 'desc' } }, { posts: { _count: 'desc' } }, { ratingCount: 'desc' }, { name: 'asc' }],
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

  return (
    <AppShell showFloatingAi={false} className="!max-w-[1280px]">
      {jsonLdScript([...speciesLd, breadcrumbLd])}
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-24 pt-[18px]">
        <TaxonomyPanel taxonomy={taxonomy} current={params} />

        <div className="grid gap-5 xl:grid-cols-[clamp(280px,22vw,340px)_minmax(0,1fr)]">
          <RightActionRail
            params={params}
            full={full}
            boardName={species.genus.board?.name ?? ''}
            genusName={species.genus.name}
            metrics={metrics}
            relatedSpecies={relatedSpecies}
            contributors={contributors}
            contributorTotal={contributorTotal}
            collectTotal={collectTotal}
            initiallyCollected={initiallyCollected}
            initiallyCompared={initiallyCompared}
          />

          <main className="min-w-0 space-y-3">
            <DetailHero
              full={full}
              galleryItems={galleryItems}
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
  const currentSpecies = currentGenus?.species.find((item) => item.slug === current.speciesSlug);
  const total = taxonomy.reduce((sum, board) => sum + board.genera.reduce((n, genus) => n + genus.species.length, 0), 0);

  return (
    <section className="rounded-[6px] border border-leaf-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink-900">植物分类体系</h2>
          <p className="mt-1 text-xs text-leaf-700/60">
            {[currentBoard?.name, currentGenus?.name, currentSpecies?.name].filter(Boolean).join(' / ')}
          </p>
        </div>
        <span className="rounded-full bg-leaf-50 px-3 py-1 text-xs text-ink-500">
          已收录 <b className="text-ink-900">{formatNumber(total)}</b> 种
        </span>
      </div>

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
  galleryItems,
}: {
  full: FullSpecies;
  galleryItems: NonNullable<FullSpecies['galleryItems']>;
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
    <span className="inline-flex items-center gap-1 rounded-full bg-leaf-50 px-3 py-1 text-xs font-medium text-leaf-800">
      <Icon name={icon} size={12} />
      {text}
    </span>
  );
}

function SidebarStat({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <div className="rounded-[6px] bg-ink-50 p-3">
      <div className="flex items-center justify-between gap-2 text-[11px] text-ink-500">
        <span>{label}</span>
        <Icon name={icon} size={13} />
      </div>
      <div className="mt-2 text-xl font-bold text-ink-900">{value}</div>
    </div>
  );
}

function RightActionRail({
  params,
  full,
  boardName,
  genusName,
  metrics,
  relatedSpecies,
  contributors,
  contributorTotal,
  collectTotal,
  initiallyCollected,
  initiallyCompared,
}: {
  params: { categorySlug: string; genusSlug: string; speciesSlug: string };
  full: FullSpecies;
  boardName: string;
  genusName: string;
  metrics: DetailMetrics;
  relatedSpecies: Array<any>;
  contributors: Array<{ id: string; name: string; avatar: string }>;
  contributorTotal: number;
  collectTotal: number;
  initiallyCollected: boolean;
  initiallyCompared: boolean;
}) {
  const visibleContributors = contributors.slice(0, 11);
  const hiddenContributorCount = Math.max(0, contributorTotal - visibleContributors.length);
  const care = getCareProfile(full);

  return (
    <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
      <section className="rounded-[6px] border border-leaf-100 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[6px] bg-leaf-50">
            <Image src={full.cover} alt={full.name} fill className="object-cover" unoptimized />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold text-ink-900">{full.name}</h1>
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-leaf-600 text-white">
                <Icon name="check" size={12} />
              </span>
            </div>
            {full.latinName && <p className="mt-1 line-clamp-2 text-xs italic text-ink-500">{full.latinName}</p>}
            <p className="mt-1 text-xs text-ink-500">{boardName} · {genusName}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <SidebarTag icon="plants" text={full.growthType ?? '易养护'} />
          <SidebarTag icon="trophy" text="观赏性强" />
          <SidebarTag icon="star" text="经典品种" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <SidebarStat label="收藏人数" value={metrics.favoritesText} icon="heart" />
          <SidebarStat label="玩家记录" value={metrics.journalsText} icon="camera" />
          <SidebarStat label="热度指数" value={metrics.heatText} icon="star" />
          <SidebarStat label="最近热度" value={`↑ ${metrics.recentGrowth}%`} icon="arrow-right" />
        </div>

        <div className="mt-4 border-t border-leaf-50 pt-3">
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
        </div>
      </section>

      <section className="rounded-[6px] border border-leaf-100 bg-white p-4 shadow-sm">
        <h2 className="font-bold text-ink-900">养护参数</h2>
        <div className="mt-4 space-y-3">
          <CareMeter label="光照" value={care.light} percent={care.lightPercent} icon="star" compact />
          <CareMeter label="温度" value={care.temperature} percent={care.temperaturePercent} icon="settings" compact />
          <CareMeter label="浇水" value={care.watering} percent={care.wateringPercent} icon="plants" compact />
          <CareMeter label="难度" value={`${full.difficulty}/5`} percent={full.difficulty * 20} icon="trophy" compact />
          <CareMeter label="生长速度" value={care.growthSpeed} percent={care.growthSpeedPercent} icon="arrow-right" compact />
          <CareMeter label="夏眠" value={care.summerDormancy} percent={care.summerDormancyPercent} icon="info" compact />
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
        <SectionHead title="同属品种推荐" href={`/plants/${params.categorySlug}/${params.genusSlug}/${params.speciesSlug}`} />
        <div className="max-h-[296px] space-y-3 overflow-hidden">
          {relatedSpecies.slice(0, 4).map((item) => (
            <Link
              key={item.id}
              href={`/plants/${params.categorySlug}/${params.genusSlug}/${item.slug}`}
              className="group flex items-center gap-3 rounded-[6px] border border-leaf-100 bg-white p-2 transition hover:bg-leaf-50"
            >
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[6px] bg-leaf-50">
                <Image src={item.cover} alt={item.name} fill className="object-cover transition group-hover:scale-105" unoptimized />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink-800">{item.name}</span>
                <span className="mt-1 block text-xs text-ink-500">同属 · 热度 {formatNumber(item._count?.posts ?? 0)}</span>
              </span>
            </Link>
          ))}
          {relatedSpecies.length === 0 && (
            <div className="rounded-[6px] bg-leaf-50 px-3 py-2 text-xs text-leaf-800">当前同属下暂无其他品种</div>
          )}
        </div>
      </section>
    </aside>
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

function CareMeter({
  label,
  value,
  percent,
  icon,
  compact,
}: {
  label: string;
  value: string;
  percent: number;
  icon: IconName;
  compact?: boolean;
}) {
  return (
    <div>
      <div className={cn('mb-1 flex items-start justify-between gap-3 text-xs', compact && 'gap-2')}>
        <span className="inline-flex items-center gap-1 text-ink-600">
          <Icon name={icon} size={13} />
          {label}
        </span>
        <span className={cn('font-medium text-ink-800', compact ? 'max-w-[150px] text-right leading-5' : 'text-right')}>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-leaf-50">
        <div className="h-full rounded-full bg-leaf-600" style={{ width: `${Math.min(100, Math.max(8, percent))}%` }} />
      </div>
    </div>
  );
}

function RiskLine({ tone, text }: { tone: 'rose' | 'amber' | 'leaf'; text: string }) {
  const cls = tone === 'rose' ? 'bg-rose-50 text-rose-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-leaf-50 text-leaf-700';
  return <div className={cn('rounded-[6px] px-3 py-2 text-xs font-medium', cls)}>{text}</div>;
}

function getCareProfile(full: FullSpecies) {
  const light = full.light || '充足阳光';
  const watering = full.watering || '干透浇透';
  const hardiness = full.hardiness || '5°C';
  const growthType = full.growthType ?? '';
  const hasSummerDormancy = /冬型|夏眠|休眠/.test(growthType);
  const isFastGrowth = /夏型|中间型|快/.test(growthType);

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
