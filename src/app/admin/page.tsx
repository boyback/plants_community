/**
 * Admin Dashboard - 总览
 *
 * 5 张数字卡(总量)+ 2 个列表(最新举报 / 最新待审核)。
 * 数据都是 server-side 拉,不放缓存,每次打开都是最新。
 */

import Link from 'next/link';
import { prisma } from '@/lib/db';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const [
  userTotal,
  postTotal,
  orderTotal,
  reportPending,
  bannedCount,
  newUsersToday,
  newPostsToday,
  paidTodayAgg,
  recentReports] =
  await Promise.all([
  prisma.user.count(),
  prisma.post.count({ where: { deleted: false } }),
  prisma.order.count(),
  prisma.report.count({ where: { status: 'pending' } }),
  prisma.user.count({ where: { bannedUntil: { gt: new Date() } } }),
  prisma.user.count({ where: { joinedAt: { gte: today } } }),
  prisma.post.count({ where: { createdAt: { gte: today }, deleted: false } }),
  prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: 'paid', paidAt: { gte: today } }
  }),
  prisma.report.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { reporter: { select: { id: true, name: true, avatar: true } } }
  })]
  );

  const paidTodayYuan = ((paidTodayAgg._sum.amount ?? 0) / 100).toFixed(2);

  return (
    <div className={styles.r_b3542e05}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>Dashboard</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>站点总览 · {new Date().toLocaleString("zh-CN")}</p>
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_74713240)}>
        <StatCard label="用户总数" value={userTotal} delta={newUsersToday} deltaLabel="今日新增" />
        <StatCard label="帖子总数" value={postTotal} delta={newPostsToday} deltaLabel="今日新增" />
        <StatCard label="订单总数" value={orderTotal} />
        <StatCard label="今日营收" value={`¥${paidTodayYuan}`} />
        <StatCard label="封禁用户" value={bannedCount} emphasis={bannedCount > 0 ? 'warn' : undefined} />
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_0c3bc985, styles.r_2f27a80e)}>
        <section className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_c07e54fd)}>
          <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
            <h2 className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>🚨 待处理举报</h2>
            <Link href="/admin/reports" className={cx(styles.r_359090c2, styles.r_7b89cd85, styles.r_ecb1dae8)}>
              查看全部({reportPending}) →
            </Link>
          </div>
          {recentReports.length === 0 ?
          <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_359090c2, styles.r_7b89cd85)}>没有待处理举报 🎉</div> :

          <ul className={styles.r_6f7e013d}>
              {recentReports.map((r) =>
            <li
              key={r.id}
              className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_eb6e8b88, styles.r_359090c2)}>

                  <div className={cx(styles.r_36e579c0, styles.r_7e0b7cdf)}>
                    <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                      <span className={cx(styles.r_07389a77, styles.r_0759a0f1, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_b54428d1)}>
                        {r.targetType}
                      </span>
                      <span className={styles.r_399e11a5}>{r.reason}</span>
                    </div>
                    <div className={cx(styles.r_b6b02c0e, styles.r_1dc571a3, styles.r_7b89cd85)}>
                      举报人 {r.reporter?.name ?? '匿名'} · {timeAgo(r.createdAt)}
                    </div>
                  </div>
                  <Link
                href={`/admin/reports?id=${r.id}`}
                className={cx(styles.r_07389a77, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_1dc571a3, styles.r_72a4c7cd, styles.r_218d0c3a)}>

                    处理
                  </Link>
                </li>
            )}
            </ul>
          }
        </section>

        <section className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_c07e54fd)}>
          <h2 className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}>快速入口</h2>
          <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_77a2a20e, styles.r_359090c2)}>
            <QuickLink href="/admin/posts" emoji="📝" label="审核帖子" />
            <QuickLink href="/admin/users" emoji="👥" label="用户管理" />
            <QuickLink href="/admin/orders" emoji="📦" label="订单处理" />
            <QuickLink href="/admin/announcements" emoji="📣" label="发公告" />
            <QuickLink href="/admin/pendants" emoji="👑" label="头像挂饰" />
            <QuickLink href="/admin/skins/bubble" emoji="💬" label="评论气泡" />
            <QuickLink href="/admin/skins/reaction" emoji="👍" label="点赞按钮" />
            <QuickLink href="/admin/skins/sticker" emoji="🌱" label="表情包" />
            <QuickLink href="/admin/badges" emoji="🏅" label="发放徽章" />
            <QuickLink href="/admin/logs" emoji="📜" label="操作日志" />
          </div>
        </section>
      </div>
    </div>);

}

function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  emphasis






}: {label: string;value: number | string;delta?: number;deltaLabel?: string;emphasis?: 'warn';}) {
  return (
    <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_8e63407b)}>
      <div className={cx(styles.r_d058ca6d, styles.r_7b89cd85)}>{label}</div>
      <div
        className={
        emphasis === 'warn' ? cx(styles.r_b6b02c0e, styles.r_3febee09, styles.r_69450ef1, styles.r_595fceba) : cx(styles.r_b6b02c0e, styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)


        }>

        {value}
      </div>
      {typeof delta === 'number' &&
      <div className={cx(styles.r_b6b02c0e, styles.r_1dc571a3, styles.r_5f6a59f1)}>
          {delta >= 0 ? '+' : ''}{delta} {deltaLabel}
        </div>
      }
    </div>);

}

function QuickLink({ href, emoji, label }: {href: string;emoji: string;label: string;}) {
  return (
    <Link
      href={href}
      className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_00eba3fb, styles.r_5399e21f)}>

      <span>{emoji}</span>
      <span>{label}</span>
    </Link>);

}

function timeAgo(d: Date): string {
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}
