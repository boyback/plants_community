import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { CompareRemoveButton } from '@/components/species/CompareRemoveButton';
import { Icon } from '@/components/ui/Icon';
import { getCurrentUser } from '@/lib/auth';
import { parseJsonArray } from '@/lib/api';
import { prisma } from '@/lib/db';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

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
      <div className={cx(styles.r_b43b4c08, styles.r_8d7541cb)}>
        <header className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_60541e1e, styles.r_8ef2268e, styles.r_0c3bc985)}>
          <div>
            <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_4ddaa618)}>品种对比</h1>
            <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_7b89cd85)}>最多同时对比 4 个品种。当前 {items.length}/4。</p>
          </div>
          <Link href="/plants" className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_e83a7042, styles.r_e7eab4cb, styles.r_5756b7b4)}>
            继续浏览图鉴
            <Icon name="arrow-right" size={14} />
          </Link>
        </header>

        {items.length === 0 ?
        <section className={cx(styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_16a5872e, styles.r_ca6bf630, styles.r_438b2237)}>
            <div className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_4ddaa618)}>还没有加入对比的品种</div>
            <p className={cx(styles.r_50d0d216, styles.r_fc7473ca, styles.r_7b89cd85)}>进入品种详情页，点击右侧“对比”即可加入。</p>
            <Link href="/plants" className={cx(styles.r_fb77735e, styles.r_52083e7d, styles.r_a217b4ea, styles.r_6bceb016, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_e269e58c)}>
              去图鉴选择
            </Link>
          </section> :

        <section className={cx(styles.r_1384f66f, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
            <div className={styles.r_0eda30b8}>
              <div className={cx(styles.r_f3c543ad, styles.r_65fdbade, styles.r_88b684d2)} style={{ gridTemplateColumns: `180px repeat(${items.length}, minmax(180px, 1fr))` }}>
                <div className={cx(styles.r_a8a62ca4, styles.r_8e63407b, styles.r_fc7473ca, styles.r_69450ef1, styles.r_eb6abb1f)}>品种</div>
                {items.map((item) =>
              <div key={item.id} className={cx(styles.r_d4f78465, styles.r_88b684d2, styles.r_8e63407b)}>
                    <div className={cx(styles.r_d89972fe, styles.r_357868ab, styles.r_2cd02d11, styles.r_a217b4ea, styles.r_7ebecbb6)}>
                      <Image src={item.cover} alt={item.name} fill unoptimized className={styles.r_7d85d0c2} />
                    </div>
                    <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_60541e1e, styles.r_8ef2268e, styles.r_1004c0c3)}>
                      <div>
                        <Link href={speciesHref(item)} className={cx(styles.r_4ee73492, styles.r_69450ef1, styles.r_4ddaa618, styles.r_9825203a)}>{item.name}</Link>
                        <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_90665ca6, styles.r_7b89cd85)}>{item.latinName}</div>
                      </div>
                      <CompareRemoveButton speciesId={item.id} />
                    </div>
                  </div>
              )}
              </div>

              <CompareSection title="基础信息" items={items} rows={[
            ['科属', (item) => `${item.boardName ?? "-"} / ${item.genusName}`],
            ['原产地', (item) => item.originRegion ?? '资料待补充'],
            ['花期', (item) => item.blooming ?? '资料待补充'],
            ['别名', (item) => parseJsonArray(item.alias).slice(0, 3).join('、') || '暂无']]
            } />

              <CompareSection title="养护参数" items={items} rows={[
            ['光照', (item) => item.light],
            ['温度', (item) => `${item.idealTemperature ?? "15-28°C"} / 耐寒 ${item.minTemperature ?? item.hardiness}`],
            ['浇水', (item) => item.watering],
            ['难度', (item) => `${item.difficulty}/5`],
            ['生长速度', (item) => item.growthSpeed ?? inferGrowthSpeed(item)],
            ['夏眠', (item) => item.summerDormancy ?? inferSummerDormancy(item)]]
            } />

              <CompareSection title="环境需求" items={items} rows={[
            ['光照需求', (item) => item.lightRequirement ?? item.light],
            ['适宜温度', (item) => item.idealTemperature ?? "15-28°C"],
            ['最低温度', (item) => item.minTemperature ?? item.hardiness],
            ['最高温度', (item) => item.maxTemperature ?? '35°C'],
            ['适宜湿度', (item) => item.humidity ?? "20%-60%"],
            ['配土建议', (item) => item.soil ?? (item.difficulty >= 4 ? '颗粒土 80%+' : '颗粒土 70%+')]]
            } />

              <CompareSection title="风险提示" items={items} rows={[
            ['提示', (item) => parseJsonArray(item.riskTips).slice(0, 3).join('；') || '暂无官方风险提示']]
            } last />
            </div>
          </section>
        }
      </div>
    </AppShell>);

}

function CompareSection({
  title,
  items,
  rows,
  last





}: {title: string;items: CompareSpeciesRow[];rows: Array<[string, (item: CompareSpeciesRow) => string]>;last?: boolean;}) {
  return (
    <div className={last ? '' : cx(styles.r_65fdbade, styles.r_88b684d2)}>
      <div className={cx(styles.r_efb55408, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_69450ef1, styles.r_fa5fa43b)}>{title}</div>
      {rows.map(([label, render]) =>
      <div key={label} className={cx(styles.r_f3c543ad, styles.r_b950dda2, styles.r_5ff6a729)} style={{ gridTemplateColumns: `180px repeat(${items.length}, minmax(180px, 1fr))` }}>
          <div className={cx(styles.r_5e10cdb8, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_2689f395, styles.r_7b89cd85)}>{label}</div>
          {items.map((item) =>
        <div key={`${item.id}-${label}`} className={cx(styles.r_d4f78465, styles.r_5ff6a729, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_399e11a5)}>
              {render(item)}
            </div>
        )}
        </div>
      )}
    </div>);

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