import Link from 'next/link';
import Image from 'next/image';
import { Shell } from '@/components/layout/Shell';
import { I18nText } from '@/components/ui/I18nText';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { prisma } from '@/lib/db';
import { serializeCategory } from '@/lib/serializers';
import { formatNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function BoardIndexPage() {
  const raw = await prisma.category.findMany({
    where: { enabled: true },
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { posts: true, genera: true } },
      genera: {
        orderBy: { orderIdx: 'asc' },
        take: 4,
        select: { slug: true, name: true },
      },
    },
  });

  const families = raw.filter((c) => c.kind === 'family');
  const discussions = raw.filter((c) => c.kind === 'discussion');
  const markets = raw.filter((c) => c.kind === 'market');

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-800">
          <I18nText k="board.title" fallback="全部板块" />
        </h1>
        <p className="mt-1 text-sm text-leaf-700/70">
          <I18nText k="board.subtitle" fallback="按科 / 属 / 品种三级分类,也有综合讨论区" />
        </p>
      </div>

      {families.length > 0 && (
        <Section
          title={<><span>🌿 </span><I18nText k="board.groups.family" fallback="植物学分类(按科 · 属 · 品种)" /></>}
          subtitle={<I18nText k="board.groups.familyHint" fallback="点击进入科,再按属逐级浏览" />}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {families.map((c) => (
              <CategoryCard
                key={c.id}
                category={{
                  ...c,
                  generaPreview: c.genera.map((g) => g.name),
                  generaTotal: c._count?.genera ?? 0,
                  postsCount: c._count?.posts ?? 0,
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {discussions.length > 0 && (
        <Section
          title={<><span>💬 </span><I18nText k="board.groups.discussion" fallback="社区讨论区" /></>}
          subtitle={<I18nText k="board.groups.discussionHint" fallback="不按植物分类的通用话题" />}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discussions.map((c) => (
              <CategoryCard
                key={c.id}
                category={{
                  ...c,
                  generaPreview: [],
                  generaTotal: 0,
                  postsCount: c._count?.posts ?? 0,
                }}
                simple
              />
            ))}
          </div>
        </Section>
      )}

      {markets.length > 0 && (
        <Section
          title={<><span>🛒 </span><I18nText k="board.groups.market" fallback="市场 · 活动" /></>}
          subtitle={<I18nText k="board.groups.marketHint" fallback="交易、活动、线下聚会" />}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {markets.map((c) => (
              <CategoryCard
                key={c.id}
                category={{
                  ...c,
                  generaPreview: [],
                  generaTotal: 0,
                  postsCount: c._count?.posts ?? 0,
                }}
                simple
              />
            ))}
          </div>
        </Section>
      )}
    </Shell>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-base font-semibold text-ink-800">{title}</h2>
        {subtitle && <span className="text-xs text-leaf-700/60">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

function CategoryCard({
  category,
  simple,
}: {
  category: {
    id: string;
    slug: string;
    name: string;
    latinName: string | null;
    description: string;
    cover: string;
    icon: string;
    members: number;
    generaPreview: string[];
    generaTotal: number;
    postsCount: number;
  };
  simple?: boolean;
}) {
  return (
    <Link
      href={`/board/${category.slug}`}
      className="card group overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[16/7] overflow-hidden bg-leaf-50">
        <Image
          src={category.cover}
          alt={category.name}
          fill
          sizes="(max-width:768px) 100vw, 400px"
          className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-ink-900/10 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-baseline gap-2 text-white">
          <CategoryIcon icon={category.icon} name={category.name} size="lg" />
          <span className="text-lg font-semibold">{category.name}</span>
          {category.latinName && (
            <span className="text-[11px] italic opacity-80">{category.latinName}</span>
          )}
        </div>
      </div>
      <div className="p-4">
        <p className="line-clamp-2 text-xs text-leaf-700/80">{category.description}</p>
        {!simple && category.generaPreview.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {category.generaPreview.map((n) => (
              <span key={n} className="chip text-[10px]">{n}</span>
            ))}
            {category.generaTotal > category.generaPreview.length && (
              <span className="chip text-[10px]">+{category.generaTotal - category.generaPreview.length}</span>
            )}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-[11px] text-leaf-700/70">
          <span>👥 <I18nText k="board.stats.members" vars={{ n: formatNumber(category.members) }} /></span>
          <span>📝 <I18nText k="board.stats.posts" vars={{ n: formatNumber(category.postsCount) }} /></span>
          {!simple && <span>🌿 <I18nText k="board.stats.genera" vars={{ n: category.generaTotal }} /></span>}
        </div>
      </div>
    </Link>
  );
}
