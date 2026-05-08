/**
 * Admin Dashboard - 总览
 *
 * 5 张数字卡(总量)+ 2 个列表(最新举报 / 最新待审核)。
 * 数据都是 server-side 拉,不放缓存,每次打开都是最新。
 */

import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    recentReports,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.post.count({ where: { deleted: false } }),
    prisma.order.count(),
    prisma.report.count({ where: { status: 'pending' } }),
    prisma.user.count({ where: { bannedUntil: { gt: new Date() } } }),
    prisma.user.count({ where: { joinedAt: { gte: today } } }),
    prisma.post.count({ where: { createdAt: { gte: today }, deleted: false } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'paid', paidAt: { gte: today } },
    }),
    prisma.report.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { reporter: { select: { id: true, name: true, avatar: true } } },
    }),
  ]);

  const paidTodayYuan = ((paidTodayAgg._sum.amount ?? 0) / 100).toFixed(2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-xs text-ink-600">站点总览 · {new Date().toLocaleString('zh-CN')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="用户总数" value={userTotal} delta={newUsersToday} deltaLabel="今日新增" />
        <StatCard label="帖子总数" value={postTotal} delta={newPostsToday} deltaLabel="今日新增" />
        <StatCard label="订单总数" value={orderTotal} />
        <StatCard label="今日营收" value={`¥${paidTodayYuan}`} />
        <StatCard label="封禁用户" value={bannedCount} emphasis={bannedCount > 0 ? 'warn' : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-ink-100 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">🚨 待处理举报</h2>
            <Link href="/admin/reports" className="text-xs text-ink-500 hover:text-ink-900">
              查看全部({reportPending}) →
            </Link>
          </div>
          {recentReports.length === 0 ? (
            <div className="py-10 text-center text-xs text-ink-500">没有待处理举报 🎉</div>
          ) : (
            <ul className="space-y-2">
              {recentReports.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-lg border border-ink-100 p-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-700">
                        {r.targetType}
                      </span>
                      <span className="text-ink-800">{r.reason}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-ink-500">
                      举报人 {r.reporter?.name ?? '匿名'} · {timeAgo(r.createdAt)}
                    </div>
                  </div>
                  <Link
                    href={`/admin/reports?id=${r.id}`}
                    className="rounded bg-ink-800 px-3 py-1 text-[10px] text-white hover:bg-ink-700"
                  >
                    处理
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-ink-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold">快速入口</h2>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <QuickLink href="/admin/posts" emoji="📝" label="审核帖子" />
            <QuickLink href="/admin/users" emoji="👥" label="用户管理" />
            <QuickLink href="/admin/orders" emoji="📦" label="订单处理" />
            <QuickLink href="/admin/announcements" emoji="📣" label="发公告" />
            <QuickLink href="/admin/badges" emoji="🏅" label="发放徽章" />
            <QuickLink href="/admin/logs" emoji="📜" label="操作日志" />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  deltaLabel,
  emphasis,
}: {
  label: string;
  value: number | string;
  delta?: number;
  deltaLabel?: string;
  emphasis?: 'warn';
}) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <div className="text-[11px] text-ink-500">{label}</div>
      <div
        className={
          emphasis === 'warn'
            ? 'mt-1 text-2xl font-bold text-rose-600'
            : 'mt-1 text-2xl font-bold text-ink-800'
        }
      >
        {value}
      </div>
      {typeof delta === 'number' && (
        <div className="mt-1 text-[10px] text-leaf-700">
          {delta >= 0 ? '+' : ''}{delta} {deltaLabel}
        </div>
      )}
    </div>
  );
}

function QuickLink({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 hover:border-ink-300 hover:bg-ink-50"
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </Link>
  );
}

function timeAgo(d: Date): string {
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}
