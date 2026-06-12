import Link from 'next/link';
import { prisma } from '@/lib/db';
import { BulkFillButton } from './BulkFillButton';
import { StatsBackfillButton } from './StatsBackfillButton';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

const fields = [
"growthSpeed",
'summerDormancy',
'lightRequirement',
'idealTemperature',
'minTemperature',
'maxTemperature',
'humidity',
'soil',
'riskTips'] as
const;

export default async function SpeciesBulkFillPage() {
  const [total, rows, boards, genera] = await Promise.all([
  prisma.species.count(),
  prisma.species.findMany({
    where: {
      OR: fields.map((field) => ({ [field]: null }))
    },
    take: 20,
    orderBy: { updatedAt: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      growthSpeed: true,
      summerDormancy: true,
      lightRequirement: true,
      idealTemperature: true,
      minTemperature: true,
      maxTemperature: true,
      humidity: true,
      soil: true,
      riskTips: true,
      genus: { select: { name: true, board: { select: { name: true } } } }
    }
  }),
  prisma.board.findMany({
    where: { kind: 'family', enabled: true },
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true }
  }),
  prisma.genus.findMany({
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, boardId: true }
  })]
  );

  return (
    <div className={styles.r_3e7ce58d}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
        <div>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_4ddaa618)}>品种字段批量补数据</h1>
          <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>共 {total} 个品种，下方展示最早需要补齐的 20 个。</p>
        </div>
        <Link href="/admin/species" className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_5399e21f)}>
          返回品种数据
        </Link>
      </div>

      <BulkFillButton boards={boards} genera={genera.filter((genus) => genus.boardId).map((genus) => ({ id: genus.id, name: genus.name, boardId: genus.boardId! }))} />
      <StatsBackfillButton />

      <div className={cx(styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
        <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
          <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
            <tr>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>品种</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>科属</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>缺失字段</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const missing = fields.filter((field) => !row[field]);
              return (
                <tr key={row.id} className={cx(styles.r_b950dda2, styles.r_358505cf)}>
                  <td className={cx(styles.r_0e17f2bd, styles.r_1b2d54a3)}>
                    <div className={cx(styles.r_2689f395, styles.r_399e11a5)}>{row.name}</div>
                    <div className={cx(styles.r_0e65706b, styles.r_1dc571a3, styles.r_66a36c90)}>{row.slug}</div>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_1b2d54a3, styles.r_02eb621e)}>{row.genus.board?.name ?? "-"} / {row.genus.name}</td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_1b2d54a3)}>
                    <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_44ee8ba0)}>
                      {missing.map((field) =>
                      <span key={field} className={cx(styles.r_ac204c10, styles.r_67d2289d, styles.r_d5eab218, styles.r_660d2eff, styles.r_1dc571a3, styles.r_5c6230d2)}>
                          {field}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>);

            })}
            {rows.length === 0 &&
            <tr>
                <td colSpan={3} className={cx(styles.r_0e17f2bd, styles.r_1100bef6, styles.r_ca6bf630, styles.r_7b89cd85)}>
                  当前没有缺失默认养护字段的品种
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>);

}