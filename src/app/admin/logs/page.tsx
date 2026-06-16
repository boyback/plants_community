import Link from 'next/link';
import { prisma } from '@/lib/db';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



export const dynamic = "force-dynamic";

const ACTION_COLOR: Record<string, string> = {
  'post.delete': cx(styles.r_e0467cf5, styles.r_b54428d1),
  'post.restore': cx(styles.r_f2b23104, styles.r_5f6a59f1),
  'user.ban': cx(styles.r_e0467cf5, styles.r_b54428d1),
  'user.unban': cx(styles.r_f2b23104, styles.r_5f6a59f1),
  'user.setRole': cx(styles.r_735dd972, styles.r_85d79ebf),
  'user.pointsAdjust': cx(styles.r_5f48f96e, styles.r_06fd2bc1),
  'product.offshelf': cx(styles.r_e0467cf5, styles.r_b54428d1),
  'product.onsale': cx(styles.r_f2b23104, styles.r_5f6a59f1),
  "order.ship": cx(styles.r_2eb3df8f, styles.r_65b7dd19),
  "order.refund": cx(styles.r_e0467cf5, styles.r_b54428d1),
  "order.complete": cx(styles.r_f2b23104, styles.r_5f6a59f1),
  "order.cancel": cx(styles.r_febec8f2, styles.r_eb6abb1f),
  'auction.cancel': cx(styles.r_febec8f2, styles.r_eb6abb1f),
  'auction.forceFinish': cx(styles.r_735dd972, styles.r_85d79ebf),
  'report.resolved': cx(styles.r_f2b23104, styles.r_5f6a59f1),
  'report.rejected': cx(styles.r_febec8f2, styles.r_02eb621e),
  'announcement.create': cx(styles.r_f2b23104, styles.r_5f6a59f1),
  'announcement.update': cx(styles.r_735dd972, styles.r_85d79ebf),
  'announcement.delete': cx(styles.r_e0467cf5, styles.r_b54428d1),
  'badge.grant': cx(styles.r_5f48f96e, styles.r_06fd2bc1),
  'theme.toggle': cx(styles.r_735dd972, styles.r_85d79ebf),
  'board.board.update': cx(styles.r_2eb3df8f, styles.r_65b7dd19)
};

export default async function AdminLogsPage({
  searchParams


}: {searchParams: {q?: string;action?: string;actor?: string;targetType?: string;page?: string;};}) {
  const q = searchParams.q ?? '';
  const action = searchParams.action ?? '';
  const actor = searchParams.actor ?? '';
  const targetType = searchParams.targetType ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 50;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (actor) where.actorId = actor;
  if (targetType) where.targetType = targetType;
  if (q) {
    where.OR = [
    { targetId: q },
    { reason: { contains: q } },
    { action: { contains: q } }];

  }

  const [items, total] = await Promise.all([
  prisma.adminLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize
  }),
  prisma.adminLog.count({ where })]
  );

  // 批量查 actor name
  const actorIds = Array.from(new Set(items.map((l) => l.actorId)));
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true }
  });
  const actorMap = new Map(actors.map((u) => [u.id, u.name]));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 统计 action 种类,供筛选下拉
  const actionTypes = await prisma.adminLog.groupBy({
    by: ['action'],
    _count: { action: true },
    orderBy: { _count: { action: 'desc' } },
    take: 30
  });

  return (
    <div className={styles.r_3e7ce58d}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>📜 操作日志</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>
          所有管理员操作审计 · 共 {total} 条 · 第 {page}/{totalPages} 页
        </p>
      </div>

      <form className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_eb6e8b88, styles.r_359090c2)}>
        <Input
          name="q"
          defaultValue={q}
          placeholder="目标 ID / 原因"
          className={cx(styles.r_74b2435a, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_ec0091ee)} />

        <select name="action" defaultValue={action} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee)}>
          <option value="">全部 action</option>
          {actionTypes.map((a) =>
          <option key={a.action} value={a.action}>
              {a.action} ({a._count.action})
            </option>
          )}
        </select>
        <select name="targetType" defaultValue={targetType} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee)}>
          <option value="">全部目标类型</option>
          <option value="post">post</option>
          <option value="user">user</option>
          <option value="product">product</option>
          <option value="order">order</option>
          <option value="auction">auction</option>
          <option value="report">report</option>
          <option value="category">category</option>
          <option value="announcement">announcement</option>
          <option value="badge">badge</option>
          <option value="theme">theme</option>
        </select>
        <Input
          name="actor"
          defaultValue={actor}
          placeholder="操作人 ID"
          className={cx(styles.r_516b03df, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_ec0091ee)} />

        <button className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_72a4c7cd)}>筛选</button>
      </form>

      <div className={cx(styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
        <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
          <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
            <tr>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>时间</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>操作</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>操作人</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>目标</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>原因 / Meta</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => {
              const cls = ACTION_COLOR[l.action] ?? cx(styles.r_febec8f2, styles.r_02eb621e);
              return (
                <tr key={l.id} className={cx(styles.r_b950dda2, styles.r_358505cf)}>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_1dc571a3, styles.r_7b89cd85, styles.r_e82ae8be)}>
                    {new Date(l.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                    <span className={cx(styles.r_07389a77, styles.r_45d82811, styles.r_465609a2, styles.r_0e65706b, styles.r_1dc571a3, `${cls}`)}>
                      {l.action}
                    </span>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                    <Link href={`/user/${l.actorId}`} target="_blank" className={styles.r_f673f4a7}>
                      {actorMap.get(l.actorId) ?? l.actorId.slice(0, 10) + '…'}
                    </Link>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b, styles.r_1dc571a3)}>
                    {l.targetType}
                    {l.targetId ? ` : ${l.targetId.slice(0, 12)}…` : ''}
                  </td>
                  <td className={cx(styles.r_b787b6a1, styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                    {l.reason &&
                    <div className={cx(styles.r_f283ea9b, styles.r_d058ca6d, styles.r_eb6abb1f)}>{l.reason}</div>
                    }
                    {l.meta ?
                    <div className={cx(styles.r_15e1b1f4, styles.r_f283ea9b, styles.r_1dc571a3, styles.r_7b89cd85, styles.r_0e65706b)}>
                        {JSON.stringify(l.meta)}
                      </div> :
                    null}
                  </td>
                </tr>);

            })}
            {items.length === 0 &&
            <tr>
                <td colSpan={5} className={cx(styles.r_0e17f2bd, styles.r_1100bef6, styles.r_ca6bf630, styles.r_7b89cd85)}>
                  没有日志
                </td>
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
