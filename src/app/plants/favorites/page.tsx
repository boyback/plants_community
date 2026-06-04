import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { FavoriteRemoveButton } from '@/components/species/FavoriteRemoveButton';
import { Icon } from '@/components/ui/Icon';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type FavoriteSpeciesRow = {
  id: string;
  slug: string;
  name: string;
  latinName: string;
  cover: string;
  difficulty: number;
  light: string;
  watering: string;
  hardiness: string;
  growthSpeed: string | null;
  summerDormancy: string | null;
  genusSlug: string;
  genusName: string;
  boardSlug: string | null;
  boardName: string | null;
  collectedAt: Date;
};

export default async function PlantsFavoritesPage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?redirect=/plants/favorites');

  const items = await prisma.$queryRaw<FavoriteSpeciesRow[]>`
    SELECT
      s.id,
      s.slug,
      s.name,
      s.latinName,
      s.cover,
      s.difficulty,
      s.light,
      s.watering,
      s.hardiness,
      s.growthSpeed,
      s.summerDormancy,
      g.slug AS genusSlug,
      g.name AS genusName,
      b.slug AS boardSlug,
      b.name AS boardName,
      sc.createdAt AS collectedAt
    FROM species_collects sc
    INNER JOIN species s ON s.id = sc.speciesId
    INNER JOIN genera g ON g.id = s.genusId
    LEFT JOIN boards b ON b.id = g.boardId
    WHERE sc.userId = ${me.id}
    ORDER BY sc.createdAt DESC
  `;

  return (
    <AppShell>
      <div className="space-y-5 pb-20">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">我的图鉴收藏</h1>
            <p className="mt-1 text-sm text-ink-500">共收藏 {items.length} 个品种。</p>
          </div>
          <div className="flex gap-2">
            <Link href="/plants/compare" className="inline-flex items-center gap-1 rounded-xl border border-leaf-100 bg-white px-4 py-2 text-sm font-semibold text-leaf-800 hover:bg-leaf-50">
              查看对比
              <Icon name="link" size={14} />
            </Link>
            <Link href="/plants" className="inline-flex items-center gap-1 rounded-xl bg-leaf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-700">
              继续浏览
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </header>

        {items.length === 0 ? (
          <section className="rounded-2xl border border-leaf-100 bg-white p-12 text-center shadow-sm">
            <div className="text-lg font-bold text-ink-900">还没有收藏的品种</div>
            <p className="mt-2 text-sm text-ink-500">进入品种详情页，点击右侧“收藏”即可加入这里。</p>
            <Link href="/plants" className="mt-5 inline-flex rounded-xl bg-leaf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-700">
              去图鉴看看
            </Link>
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Link href={speciesHref(item)} className="block">
                  <div className="relative aspect-[4/3] bg-leaf-50">
                    <Image src={item.cover} alt={item.name} fill unoptimized className="object-cover" />
                  </div>
                </Link>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={speciesHref(item)} className="line-clamp-1 text-base font-bold text-ink-900 hover:text-leaf-700">
                        {item.name}
                      </Link>
                      <div className="mt-1 line-clamp-1 text-xs italic text-ink-500">{item.latinName}</div>
                    </div>
                    <FavoriteRemoveButton speciesId={item.id} />
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px] text-ink-600">
                    <span className="rounded-full bg-leaf-50 px-2 py-1">{item.boardName ?? '未分类'} / {item.genusName}</span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">难度 {item.difficulty}/5</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-leaf-50 pt-3 text-center text-[11px] text-ink-600">
                    <MiniCare label="光照" value={item.light} />
                    <MiniCare label="浇水" value={item.watering} />
                    <MiniCare label="耐寒" value={item.hardiness} />
                  </div>

                  <div className="text-[11px] text-ink-400">
                    收藏于 {new Date(item.collectedAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function MiniCare({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-ink-400">{label}</div>
      <div className="mt-1 truncate font-medium text-ink-800">{value}</div>
    </div>
  );
}

function speciesHref(item: FavoriteSpeciesRow) {
  if (!item.boardSlug) return '/plants';
  return `/plants/${item.boardSlug}/${item.genusSlug}/${item.slug}`;
}
