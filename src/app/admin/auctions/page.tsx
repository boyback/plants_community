import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { AuctionRowActions } from './AuctionRowActions';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, {label: string;cls: string;}> = {
  draft: { label: '草稿', cls: cx(styles.r_febec8f2, styles.r_02eb621e) },
  scheduled: { label: '未开始', cls: cx(styles.r_735dd972, styles.r_85d79ebf) },
  live: { label: '进行中', cls: cx(styles.r_e0467cf5, styles.r_b54428d1) },
  finished: { label: '已结束', cls: cx(styles.r_f2b23104, styles.r_5f6a59f1) },
  cancelled: { label: '已取消', cls: cx(styles.r_febec8f2, styles.r_7b89cd85) }
};

export default async function AdminAuctionsPage({
  searchParams


}: {searchParams: {q?: string;status?: string;page?: string;};}) {
  const q = searchParams.q ?? '';
  const status = searchParams.status ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) where.OR = [{ title: { contains: q } }, { seller: { name: { contains: q } } }];

  const [items, total] = await Promise.all([
  prisma.auction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      seller: { select: { id: true, name: true } },
      _count: { select: { bids: true } }
    }
  }),
  prisma.auction.count({ where })]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={styles.r_3e7ce58d}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>🔨 拍卖管理</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>
          共 {total} 场 · 第 {page}/{totalPages} 页
        </p>
      </div>

      <form className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_eb6e8b88, styles.r_359090c2)}>
        <input
          name="q"
          defaultValue={q}
          placeholder="拍品 / 卖家"
          className={cx(styles.r_74b2435a, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_ec0091ee)} />

        <select name="status" defaultValue={status} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee)}>
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) =>
          <option key={k} value={k}>{v.label}</option>
          )}
        </select>
        <button className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_72a4c7cd)}>筛选</button>
      </form>

      <div className={cx(styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
        <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
          <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
            <tr>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>标题</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>卖家</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>起拍 / 当前</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>出价数</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>状态</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>结束</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const st = STATUS_LABEL[a.status] ?? { label: a.status, cls: cx(styles.r_febec8f2, styles.r_02eb621e) };
              return (
                <tr key={a.id} className={cx(styles.r_b950dda2, styles.r_358505cf, styles.r_d9a085ef)}>
                  <td className={cx(styles.r_d3e6c6c3, styles.r_f283ea9b, styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                    <Link href={`/auction/${a.id}`} target="_blank" className={styles.r_f673f4a7}>
                      {a.title}
                    </Link>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                    <Link href={`/user/${a.seller.id}`} target="_blank" className={styles.r_f673f4a7}>
                      {a.seller.name}
                    </Link>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0)}>
                    {formatPrice(a.startPrice)}
                    <span className={cx(styles.r_f58b0257, styles.r_595fceba, styles.r_e83a7042)}>/{formatPrice(a.currentPrice)}</span>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0, styles.r_02eb621e)}>{a._count.bids}</td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                    <span className={cx(styles.r_ac204c10, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, `${st.cls}`)}>{st.label}</span>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_d058ca6d, styles.r_7b89cd85)}>
                    {new Date(a.endAt).toLocaleString("zh-CN", {
                      month: 'numeric',
                      day: 'numeric',
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>
                    <AuctionRowActions id={a.id} status={a.status} />
                  </td>
                </tr>);

            })}
            {items.length === 0 &&
            <tr>
                <td colSpan={7} className={cx(styles.r_0e17f2bd, styles.r_1100bef6, styles.r_ca6bf630, styles.r_7b89cd85)}>没有数据</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div className={cx(styles.r_60fbb771, styles.r_86843cf1, styles.r_44ee8ba0, styles.r_359090c2)}>
        {page > 1 &&
        <Link href={{ query: { ...searchParams, page: String(page - 1) } }} className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5399e21f)}>← 上一页</Link>
        }
        <span className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_7b89cd85)}>{page} / {totalPages}</span>
        {page < totalPages &&
        <Link href={{ query: { ...searchParams, page: String(page + 1) } }} className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5399e21f)}>下一页 →</Link>
        }
      </div>
    </div>);

}