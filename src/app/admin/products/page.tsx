import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { ProductRowActions } from './ProductRowActions';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams


}: {searchParams: {q?: string;source?: string;status?: string;page?: string;};}) {
  const q = searchParams.q ?? '';
  const source = searchParams.source ?? '';
  const status = searchParams.status ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (source) where.source = source;
  if (status) where.status = status;
  if (q) {
    where.OR = [
    { title: { contains: q } },
    { seller: { name: { contains: q } } }];

  }

  const [items, total] = await Promise.all([
  prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      seller: { select: { id: true, name: true } },
      _count: { select: { orders: true } }
    }
  }),
  prisma.product.count({ where })]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={styles.r_3e7ce58d}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>🛒 商品管理</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>
          共 {total} 件 · 第 {page}/{totalPages} 页
        </p>
      </div>

      <form className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_eb6e8b88, styles.r_359090c2)}>
        <Input
          name="q"
          defaultValue={q}
          placeholder="标题 / 卖家"
          className={cx(styles.r_74b2435a, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_ec0091ee)} />

        <select name="source" defaultValue={source} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee)}>
          <option value="">全部来源</option>
          <option value="official">官方</option>
          <option value="c2c">肉友</option>
        </select>
        <select name="status" defaultValue={status} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee)}>
          <option value="">全部状态</option>
          <option value="on_sale">销售中</option>
          <option value="sold_out">售罄</option>
          <option value="off_shelf">下架</option>
        </select>
        <button className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_72a4c7cd)}>筛选</button>
      </form>

      <div className={cx(styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
        <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
          <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
            <tr>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>商品</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>来源</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>价格</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>库存/销量</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>卖家</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>状态</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) =>
            <tr key={p.id} className={cx(styles.r_b950dda2, styles.r_358505cf, styles.r_d9a085ef)}>
                <td className={cx(styles.r_d3e6c6c3, styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                    <div className={cx(styles.r_d89972fe, styles.r_426b8b75, styles.r_d854e569, styles.r_012fbd12, styles.r_2cd02d11, styles.r_07389a77, styles.r_ce27a834)}>
                      <Image src={p.cover} alt="" fill className={styles.r_7d85d0c2} unoptimized />
                    </div>
                    <Link href={`/market/${p.id}`} target="_blank" className={cx(styles.r_f283ea9b, styles.r_f673f4a7)}>
                      {p.title}
                    </Link>
                  </div>
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  <span className={p.source === 'official' ? cx(styles.r_07389a77, styles.r_f2b23104, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_5f6a59f1) : cx(styles.r_07389a77, styles.r_735dd972, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_85d79ebf)}>
                    {p.source === 'official' ? '官方' : '肉友'}
                  </span>
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0, styles.r_595fceba, styles.r_e83a7042)}>
                  {formatPrice(p.price)}
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0, styles.r_02eb621e)}>
                  {p.stock} / {p._count.orders}
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  {p.seller ?
                <Link href={`/user/${p.seller.id}`} target="_blank" className={styles.r_f673f4a7}>
                      {p.seller.name}
                    </Link> :

                <span className={styles.r_7b89cd85}>官方</span>
                }
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  <StatusBadge s={p.status} />
                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>
                  <ProductRowActions productId={p.id} status={p.status} />
                </td>
              </tr>
            )}
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

function StatusBadge({ s }: {s: string;}) {
  const map: Record<string, {label: string;cls: string;}> = {
    on_sale: { label: '销售中', cls: cx(styles.r_f2b23104, styles.r_5f6a59f1) },
    trading: { label: '交易中', cls: cx(styles.r_67d2289d, styles.r_85d79ebf) },
    sold_out: { label: '售罄', cls: cx(styles.r_febec8f2, styles.r_02eb621e) },
    off_shelf: { label: '已下架', cls: cx(styles.r_e0467cf5, styles.r_b54428d1) },
    pending_review: { label: '待审核', cls: cx(styles.r_735dd972, styles.r_85d79ebf) }
  };
  const it = map[s] ?? { label: s, cls: cx(styles.r_febec8f2, styles.r_02eb621e) };
  return <span className={cx(styles.r_ac204c10, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, `${it.cls}`)}>{it.label}</span>;
}
