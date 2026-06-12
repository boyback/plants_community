import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ReportActions } from './ReportActions';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

const REASON_LABEL: Record<string, string> = {
  spam: '垃圾广告',
  abuse: '辱骂 / 骚扰',
  pornography: '色情低俗',
  politics: '政治敏感',
  illegal: '违法信息',
  scam: '诈骗',
  other: '其他'
};

export default async function AdminReportsPage({
  searchParams


}: {searchParams: {status?: string;page?: string;};}) {
  const status = searchParams.status as 'pending' | 'resolved' | 'rejected' | 'all' ?? 'pending';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (status !== 'all') where.status = status;

  const [items, total] = await Promise.all([
  prisma.report.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      reporter: { select: { id: true, name: true, avatar: true } }
    }
  }),
  prisma.report.count({ where })]
  );

  // 手动拉 target 内容(因为多态,不能直接 include)
  const targets = await Promise.all(
    items.map(async (r) => {
      if (r.targetType === 'post') {
        return prisma.post.findUnique({
          where: { id: r.targetId },
          select: { id: true, title: true, deleted: true }
        });
      }
      if (r.targetType === 'user') {
        return prisma.user.findUnique({
          where: { id: r.targetId },
          select: { id: true, name: true, bannedUntil: true }
        });
      }
      if (r.targetType === 'comment') {
        return prisma.comment.findUnique({
          where: { id: r.targetId },
          select: { id: true, content: true, postId: true }
        });
      }
      return null;
    })
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className={styles.r_3e7ce58d}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>🚨 举报处理</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>
          共 {total} 条 · 第 {page}/{totalPages} 页
        </p>
      </div>

      <form className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_eb6e8b88, styles.r_359090c2)}>
        <select
          name="status"
          defaultValue={status}
          className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee)}>

          <option value="pending">待处理</option>
          <option value="resolved">已处理</option>
          <option value="rejected">已驳回</option>
          <option value="all">全部</option>
        </select>
        <button className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_72a4c7cd)}>筛选</button>
      </form>

      <div className={styles.r_6ed543e2}>
        {items.map((r, i) => {
          const target = targets[i];
          return (
            <div key={r.id} className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_8e63407b)}>
              <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_1004c0c3)}>
                <div className={cx(styles.r_36e579c0, styles.r_7e0b7cdf)}>
                  <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_359090c2)}>
                    <span className={cx(styles.r_07389a77, styles.r_0759a0f1, styles.r_d5eab218, styles.r_465609a2, styles.r_0e65706b, styles.r_1dc571a3, styles.r_b54428d1)}>
                      {r.targetType}
                    </span>
                    <span className={cx(styles.r_e83a7042, styles.r_399e11a5)}>
                      {REASON_LABEL[r.reason] ?? r.reason}
                    </span>
                    <span className={styles.r_7b89cd85}>
                      · {new Date(r.createdAt).toLocaleString("zh-CN")}
                    </span>
                    <span className={styles.r_fb56d9cf}>
                      {r.status === 'pending' ?
                      <span className={cx(styles.r_ac204c10, styles.r_735dd972, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_85d79ebf)}>
                          待处理
                        </span> :
                      r.status === 'resolved' ?
                      <span className={cx(styles.r_ac204c10, styles.r_f2b23104, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_5f6a59f1)}>
                          已处理
                        </span> :

                      <span className={cx(styles.r_ac204c10, styles.r_febec8f2, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_02eb621e)}>
                          已驳回
                        </span>
                      }
                    </span>
                  </div>

                  {r.detail &&
                  <div className={cx(styles.r_50d0d216, styles.r_07389a77, styles.r_ce27a834, styles.r_7660b450, styles.r_d058ca6d, styles.r_eb6abb1f)}>
                      {r.detail}
                    </div>
                  }

                  <div className={cx(styles.r_50d0d216, styles.r_d058ca6d, styles.r_02eb621e)}>
                    举报人:
                    {r.reporter ?
                    <Link
                      href={`/user/${r.reporter.id}`}
                      target="_blank"
                      className={cx(styles.r_f58b0257, styles.r_f673f4a7)}>

                        {r.reporter.name}
                      </Link> :

                    ' 匿名'
                    }
                  </div>

                  {/* 目标摘要 */}
                  <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_2347842d, styles.r_7660b450, styles.r_d058ca6d)}>
                    {target ?
                    r.targetType === 'post' ?
                    <>
                          <span className={styles.r_7b89cd85}>帖子:</span>
                          <Link
                        href={`/post/${r.targetId}`}
                        target="_blank"
                        className={cx(styles.r_36e579c0, styles.r_f283ea9b, styles.r_f673f4a7)}>

                            {(target as {title: string;}).title}
                          </Link>
                          {(target as {deleted: boolean;}).deleted &&
                      <span className={styles.r_595fceba}>已删除</span>
                      }
                        </> :
                    r.targetType === 'user' ?
                    <>
                          <span className={styles.r_7b89cd85}>用户:</span>
                          <Link
                        href={`/user/${r.targetId}`}
                        target="_blank"
                        className={cx(styles.r_36e579c0, styles.r_f283ea9b, styles.r_f673f4a7)}>

                            {(target as {name: string;}).name}
                          </Link>
                          {(target as {bannedUntil?: Date | null;}).bannedUntil &&
                      new Date((target as {bannedUntil: Date;}).bannedUntil).getTime() > Date.now() &&
                      <span className={styles.r_595fceba}>已封禁</span>
                      }
                        </> :

                    <>
                          <span className={styles.r_7b89cd85}>评论:</span>
                          <span className={cx(styles.r_36e579c0, styles.r_f283ea9b, styles.r_eb6abb1f)}>
                            {((target as {content: string;}).content ?? '').slice(0, 60)}
                          </span>
                        </> :


                    <span className={styles.r_7b89cd85}>目标已不存在</span>
                    }
                  </div>

                  {r.status !== 'pending' && r.handleNote &&
                  <div className={cx(styles.r_50d0d216, styles.r_d058ca6d, styles.r_7b89cd85)}>
                      处理备注:{r.handleNote}
                    </div>
                  }
                </div>

                {r.status === 'pending' &&
                <ReportActions reportId={r.id} />
                }
              </div>
            </div>);

        })}

        {items.length === 0 &&
        <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_a4d0f420, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_7b89cd85)}>
            没有符合的举报
          </div>
        }
      </div>

      <div className={cx(styles.r_60fbb771, styles.r_86843cf1, styles.r_44ee8ba0, styles.r_359090c2)}>
        {page > 1 &&
        <Link
          href={{ query: { ...searchParams, page: String(page - 1) } }}
          className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5399e21f)}>

            ← 上一页
          </Link>
        }
        <span className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_7b89cd85)}>
          {page} / {totalPages}
        </span>
        {page < totalPages &&
        <Link
          href={{ query: { ...searchParams, page: String(page + 1) } }}
          className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5399e21f)}>

            下一页 →
          </Link>
        }
      </div>
    </div>);

}