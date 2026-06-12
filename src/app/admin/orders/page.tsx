import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { OrderRowActions } from './OrderRowActions';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, {label: string;cls: string;}> = {
  pending_payment: { label: '待付款', cls: cx(styles.r_735dd972, styles.r_85d79ebf) },
  pending_ship: { label: '待发货', cls: cx(styles.r_2eb3df8f, styles.r_65b7dd19) },
  pending_receipt: { label: '待收货', cls: cx(styles.r_5f48f96e, styles.r_06fd2bc1) },
  pending_review: { label: '待评价', cls: cx(styles.r_febec8f2, styles.r_eb6abb1f) },
  completed: { label: '已完成', cls: cx(styles.r_f2b23104, styles.r_5f6a59f1) },
  cancelled: { label: '已取消', cls: cx(styles.r_febec8f2, styles.r_7b89cd85) },
  refunded: { label: '已退款', cls: cx(styles.r_e0467cf5, styles.r_b54428d1) }
};

export default async function AdminOrdersPage({
  searchParams


}: {searchParams: {q?: string;status?: string;source?: string;page?: string;};}) {
  const q = searchParams.q ?? '';
  const status = searchParams.status ?? '';
  const source = searchParams.source ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (source) where.source = source;
  if (q) {
    where.OR = [
    { orderNo: { contains: q } },
    { buyer: { name: { contains: q } } }];

  }

  const [items, total] = await Promise.all([
  prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      product: { select: { id: true, title: true, cover: true } }
    }
  }),
  prisma.order.count({ where })]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={styles.r_3e7ce58d}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>📦 订单管理</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>
          共 {total} 单 · 第 {page}/{totalPages} 页
        </p>
      </div>

      <form className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_eb6e8b88, styles.r_359090c2)}>
        <input
          name="q"
          defaultValue={q}
          placeholder="订单号 / 买家"
          className={cx(styles.r_74b2435a, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_ec0091ee)} />

        <select name="status" defaultValue={status} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee)}>
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) =>
          <option key={k} value={k}>{v.label}</option>
          )}
        </select>
        <select name="source" defaultValue={source} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee)}>
          <option value="">全部来源</option>
          <option value="product">商品</option>
          <option value="auction">拍卖</option>
        </select>
        <button className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_72a4c7cd)}>筛选</button>
      </form>

      <div className={cx(styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
        <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
          <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
            <tr>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>订单号</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>商品</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>买家</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>金额</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>状态</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>创建</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => {
              const st = STATUS_LABEL[o.status] ?? { label: o.status, cls: cx(styles.r_febec8f2, styles.r_02eb621e) };
              return (
                <tr key={o.id} className={cx(styles.r_b950dda2, styles.r_358505cf, styles.r_d9a085ef)}>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b, styles.r_d058ca6d)}>{o.orderNo}</td>
                  <td className={cx(styles.r_2661bcf3, styles.r_f283ea9b, styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                    {o.product ? o.product.title : <span className={styles.r_7b89cd85}>拍卖订单</span>}
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                    <Link href={`/user/${o.buyer.id}`} target="_blank" className={styles.r_f673f4a7}>
                      {o.buyer.name}
                    </Link>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_e83a7042, styles.r_595fceba)}>
                    {formatPrice(o.totalPrice)}
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                    <span className={cx(styles.r_ac204c10, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, `${st.cls}`)}>
                      {st.label}
                    </span>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_d058ca6d, styles.r_7b89cd85)}>
                    {new Date(o.createdAt).toLocaleString("zh-CN", {
                      month: 'numeric',
                      day: 'numeric',
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>
                    <OrderRowActions orderId={o.id} status={o.status} />
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