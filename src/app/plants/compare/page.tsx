import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { CompareRemoveButton } from '@/components/species/CompareRemoveButton';
import { Icon } from '@/components/ui/Icon';
import { getCurrentUser } from '@/lib/auth';
import { parseJsonArray } from '@/lib/api';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type CompareSpeciesRow = {
  id: string;
  slug: string;
  name: string;
  latinName: string;
  cover: string;
  alias: string | null;
  difficulty: number;
  light: string;
  watering: string;
  hardiness: string;
  blooming: string | null;
  originRegion: string | null;
  growthType: string | null;
  growthSpeed: string | null;
  summerDormancy: string | null;
  lightRequirement: string | null;
  idealTemperature: string | null;
  minTemperature: string | null;
  maxTemperature: string | null;
  humidity: string | null;
  soil: string | null;
  riskTips: string | null;
  genusSlug: string;
  genusName: string;
  boardSlug: string | null;
  boardName: string | null;
};

export default async function PlantsComparePage() {
  const me = await getCurrentUser();
  if (!me) redirect('/login?redirect=/plants/compare');

  const items = await prisma.$queryRaw<CompareSpeciesRow[]>`
    SELECT
      s.id,
      s.slug,
      s.name,
      s.latinName,
      s.cover,
      s.alias,
      s.difficulty,
      s.light,
      s.watering,
      s.hardiness,
      s.blooming,
      s.originRegion,
      s.growthType,
      s.growthSpeed,
      s.summerDormancy,
      s.lightRequirement,
      s.idealTemperature,
      s.minTemperature,
      s.maxTemperature,
      s.humidity,
      s.soil,
      s.riskTips,
      g.slug AS genusSlug,
      g.name AS genusName,
      b.slug AS boardSlug,
      b.name AS boardName
    FROM species_compares sc
    INNER JOIN species s ON s.id = sc.speciesId
    INNER JOIN genera g ON g.id = s.genusId
    LEFT JOIN boards b ON b.id = g.boardId
    WHERE sc.userId = ${me.id}
    ORDER BY sc.createdAt DESC
    LIMIT 4
  `;

  return (
    <AppShell>
      <div className="space-y-5 pb-20">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">品种对比</h1>
            <p className="mt-1 text-sm text-ink-500">最多同时对比 4 个品种。当前 {items.length}/4。</p>
          </div>
          <Link href="/plants" className="inline-flex items-center gap-1 rounded-xl border border-leaf-100 bg-white px-4 py-2 text-sm font-semibold text-leaf-800 hover:bg-leaf-50">
            继续浏览图鉴
            <Icon name="arrow-right" size={14} />
          </Link>
        </header>

        {items.length === 0 ? (
          <section className="rounded-2xl border border-leaf-100 bg-white p-12 text-center shadow-sm">
            <div className="text-lg font-bold text-ink-900">还没有加入对比的品种</div>
            <p className="mt-2 text-sm text-ink-500">进入品种详情页，点击右侧“对比”即可加入。</p>
            <Link href="/plants" className="mt-5 inline-flex rounded-xl bg-leaf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-leaf-700">
              去图鉴选择
            </Link>
          </section>
        ) : (
          <section className="overflow-x-auto rounded-2xl border border-leaf-100 bg-white shadow-sm">
            <div className="min-w-[920px]">
              <div className="grid border-b border-leaf-100" style={{ gridTemplateColumns: `180px repeat(${items.length}, minmax(180px, 1fr))` }}>
                <div className="bg-leaf-50/60 p-4 text-sm font-bold text-ink-700">品种</div>
                {items.map((item) => (
                  <div key={item.id} className="border-l border-leaf-100 p-4">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-leaf-50">
                      <Image src={item.cover} alt={item.name} fill unoptimized className="object-cover" />
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <Link href={speciesHref(item)} className="text-base font-bold text-ink-900 hover:text-leaf-700">{item.name}</Link>
                        <div className="mt-1 text-xs italic text-ink-500">{item.latinName}</div>
                      </div>
                      <CompareRemoveButton speciesId={item.id} />
                    </div>
                  </div>
                ))}
              </div>

              <CompareSection title="基础信息" items={items} rows={[
                ['科属', (item) => `${item.boardName ?? '-'} / ${item.genusName}`],
                ['原产地', (item) => item.originRegion ?? '资料待补充'],
                ['花期', (item) => item.blooming ?? '资料待补充'],
                ['别名', (item) => parseJsonArray(item.alias).slice(0, 3).join('、') || '暂无'],
              ]} />

              <CompareSection title="养护参数" items={items} rows={[
                ['光照', (item) => item.light],
                ['温度', (item) => `${item.idealTemperature ?? '15-28°C'} / 耐寒 ${item.minTemperature ?? item.hardiness}`],
                ['浇水', (item) => item.watering],
                ['难度', (item) => `${item.difficulty}/5`],
                ['生长速度', (item) => item.growthSpeed ?? inferGrowthSpeed(item)],
                ['夏眠', (item) => item.summerDormancy ?? inferSummerDormancy(item)],
              ]} />

              <CompareSection title="环境需求" items={items} rows={[
                ['光照需求', (item) => item.lightRequirement ?? item.light],
                ['适宜温度', (item) => item.idealTemperature ?? '15-28°C'],
                ['最低温度', (item) => item.minTemperature ?? item.hardiness],
                ['最高温度', (item) => item.maxTemperature ?? '35°C'],
                ['适宜湿度', (item) => item.humidity ?? '20%-60%'],
                ['配土建议', (item) => item.soil ?? (item.difficulty >= 4 ? '颗粒土 80%+' : '颗粒土 70%+')],
              ]} />

              <CompareSection title="风险提示" items={items} rows={[
                ['提示', (item) => parseJsonArray(item.riskTips).slice(0, 3).join('；') || '暂无官方风险提示'],
              ]} last />
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function CompareSection({
  title,
  items,
  rows,
  last,
}: {
  title: string;
  items: CompareSpeciesRow[];
  rows: Array<[string, (item: CompareSpeciesRow) => string]>;
  last?: boolean;
}) {
  return (
    <div className={last ? '' : 'border-b border-leaf-100'}>
      <div className="bg-leaf-50/40 px-4 py-3 text-sm font-bold text-leaf-900">{title}</div>
      {rows.map(([label, render]) => (
        <div key={label} className="grid border-t border-leaf-50" style={{ gridTemplateColumns: `180px repeat(${items.length}, minmax(180px, 1fr))` }}>
          <div className="bg-white px-4 py-3 text-sm font-medium text-ink-500">{label}</div>
          {items.map((item) => (
            <div key={`${item.id}-${label}`} className="border-l border-leaf-50 px-4 py-3 text-sm text-ink-800">
              {render(item)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function speciesHref(item: CompareSpeciesRow) {
  if (!item.boardSlug) return '/plants';
  return `/plants/${item.boardSlug}/${item.genusSlug}/${item.slug}`;
}

function inferGrowthSpeed(item: CompareSpeciesRow) {
  return /夏型|中间型|快/.test(item.growthType ?? '') ? '较快' : '中等';
}

function inferSummerDormancy(item: CompareSpeciesRow) {
  return /冬型|夏眠|休眠/.test(item.growthType ?? '') ? '明显' : '不明显';
}
