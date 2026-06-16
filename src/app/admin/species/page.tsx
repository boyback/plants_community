import Link from 'next/link';
import { prisma } from '@/lib/db';
import { AdminSpeciesTable } from './AdminSpeciesTable';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



export const dynamic = "force-dynamic";

export default async function AdminSpeciesPage({
  searchParams


}: {searchParams: {q?: string;genusId?: string;page?: string;};}) {
  const q = searchParams.q ?? '';
  const genusId = searchParams.genusId ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 30;

  const where: Record<string, unknown> = {};
  if (genusId) where.genusId = genusId;
  if (q) {
    where.OR = [
    { name: { contains: q } },
    { latinName: { contains: q } },
    { slug: { contains: q } }];

  }

  const [items, total, genera] = await Promise.all([
  prisma.species.findMany({
    where,
    orderBy: { name: 'asc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      genus: {
        select: {
          id: true,
          name: true,
          slug: true,
          board: { select: { slug: true, name: true } }
        }
      },
      _count: { select: { posts: true } }
    }
  }),
  prisma.species.count({ where }),
  prisma.genus.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      board: { select: { name: true } }
    }
  })]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={styles.r_3e7ce58d}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <div>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>品种数据</h1>
          <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>
            共 {total} 个品种 · 第 {page}/{totalPages} 页
          </p>
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <Link href="/admin/species/bulk-fill" className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_67d2289d, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_e83a7042, styles.r_5c6230d2, styles.r_fab25b39)}>
            批量补数据
          </Link>
          <Link href="/admin/species/contributions" className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_e83a7042, styles.r_e7eab4cb, styles.r_2efc423a)}>
            图鉴贡献审核
          </Link>
        </div>
      </div>

      <form className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_eb6e8b88, styles.r_359090c2)}>
        <Input
          name="q"
          defaultValue={q}
          placeholder="中文 / 拉丁名 / slug"
          className={cx(styles.r_d16aae84, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_ec0091ee)} />

        <select
          name="genusId"
          defaultValue={genusId}
          className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee)}>

          <option value="">全部属</option>
          {genera.map((g) =>
          <option key={g.id} value={g.id}>
              {g.name}
            </option>
          )}
        </select>
        <button className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_72a4c7cd)}>筛选</button>
      </form>

      <AdminSpeciesTable
        items={items}
        genera={genera.map((g) => ({
          id: g.id,
          label: `${g.board?.name ?? '未分类'} / ${g.name} (${g.slug})`
        }))} />


      <div className={cx(styles.r_60fbb771, styles.r_86843cf1, styles.r_44ee8ba0, styles.r_359090c2)}>
        {page > 1 &&
        <Link href={{ query: { ...searchParams, page: String(page - 1) } }} className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5399e21f)}>
            ← 上一页
          </Link>
        }
        <span className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_7b89cd85)}>{page} / {totalPages}</span>
        {page < totalPages &&
        <Link href={{ query: { ...searchParams, page: String(page + 1) } }} className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5399e21f)}>
            下一页 →
          </Link>
        }
      </div>
    </div>);

}
