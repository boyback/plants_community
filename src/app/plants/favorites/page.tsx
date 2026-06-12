import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { FavoriteRemoveButton } from '@/components/species/FavoriteRemoveButton';
import { Icon } from '@/components/ui/Icon';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

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
      <div className={cx(styles.r_b43b4c08, styles.r_8d7541cb)}>
        <header className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_60541e1e, styles.r_8ef2268e, styles.r_0c3bc985)}>
          <div>
            <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_4ddaa618)}>我的图鉴收藏</h1>
            <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_7b89cd85)}>共收藏 {items.length} 个品种。</p>
          </div>
          <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
            <Link href="/plants/compare" className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_e83a7042, styles.r_e7eab4cb, styles.r_5756b7b4)}>
              查看对比
              <Icon name="link" size={14} />
            </Link>
            <Link href="/plants" className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_a217b4ea, styles.r_6bceb016, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_e269e58c)}>
              继续浏览
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </header>

        {items.length === 0 ?
        <section className={cx(styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_16a5872e, styles.r_ca6bf630, styles.r_438b2237)}>
            <div className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_4ddaa618)}>还没有收藏的品种</div>
            <p className={cx(styles.r_50d0d216, styles.r_fc7473ca, styles.r_7b89cd85)}>进入品种详情页，点击右侧“收藏”即可加入这里。</p>
            <Link href="/plants" className={cx(styles.r_fb77735e, styles.r_52083e7d, styles.r_a217b4ea, styles.r_6bceb016, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_e269e58c)}>
              去图鉴看看
            </Link>
          </section> :

        <section className={cx(styles.r_f3c543ad, styles.r_0c3bc985, styles.r_e00ad816, styles.r_b86f7f94, styles.r_0814ebd0)}>
            {items.map((item) =>
          <article key={item.id} className={cx(styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237, styles.r_56bf8ae8, styles.r_0ca49668, styles.r_9e85ac05)}>
                <Link href={speciesHref(item)} className={styles.r_0214b4b3}>
                  <div className={cx(styles.r_d89972fe, styles.r_357868ab, styles.r_7ebecbb6)}>
                    <Image src={item.cover} alt={item.name} fill unoptimized className={styles.r_7d85d0c2} />
                  </div>
                </Link>
                <div className={cx(styles.r_6ed543e2, styles.r_8e63407b)}>
                  <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_8ef2268e, styles.r_1004c0c3)}>
                    <div className={styles.r_7e0b7cdf}>
                      <Link href={speciesHref(item)} className={cx(styles.r_f50e2015, styles.r_4ee73492, styles.r_69450ef1, styles.r_4ddaa618, styles.r_9825203a)}>
                        {item.name}
                      </Link>
                      <div className={cx(styles.r_b6b02c0e, styles.r_f50e2015, styles.r_359090c2, styles.r_90665ca6, styles.r_7b89cd85)}>{item.latinName}</div>
                    </div>
                    <FavoriteRemoveButton speciesId={item.id} />
                  </div>

                  <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e, styles.r_d058ca6d, styles.r_02eb621e)}>
                    <span className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_660d2eff)}>{item.boardName ?? '未分类'} / {item.genusName}</span>
                    <span className={cx(styles.r_ac204c10, styles.r_67d2289d, styles.r_d5eab218, styles.r_660d2eff, styles.r_85d79ebf)}>难度 {item.difficulty}/5</span>
                  </div>

                  <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_77a2a20e, styles.r_b950dda2, styles.r_5ff6a729, styles.r_ce335a8e, styles.r_ca6bf630, styles.r_d058ca6d, styles.r_02eb621e)}>
                    <MiniCare label="光照" value={item.light} />
                    <MiniCare label="浇水" value={item.watering} />
                    <MiniCare label="耐寒" value={item.hardiness} />
                  </div>

                  <div className={cx(styles.r_d058ca6d, styles.r_66a36c90)}>
                    收藏于 {new Date(item.collectedAt).toLocaleDateString("zh-CN")}
                  </div>
                </div>
              </article>
          )}
          </section>
        }
      </div>
    </AppShell>);

}

function MiniCare({ label, value }: {label: string;value: string;}) {
  return (
    <div className={styles.r_7e0b7cdf}>
      <div className={styles.r_66a36c90}>{label}</div>
      <div className={cx(styles.r_b6b02c0e, styles.r_f283ea9b, styles.r_2689f395, styles.r_399e11a5)}>{value}</div>
    </div>);

}

function speciesHref(item: FavoriteSpeciesRow) {
  if (!item.boardSlug) return '/plants';
  return `/plants/${item.boardSlug}/${item.genusSlug}/${item.slug}`;
}