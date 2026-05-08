import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const ACTION_COLOR: Record<string, string> = {
  'post.delete': 'bg-rose-100 text-rose-700',
  'post.restore': 'bg-leaf-100 text-leaf-700',
  'user.ban': 'bg-rose-100 text-rose-700',
  'user.unban': 'bg-leaf-100 text-leaf-700',
  'user.setRole': 'bg-amber-100 text-amber-700',
  'user.pointsAdjust': 'bg-violet-100 text-violet-700',
  'product.offshelf': 'bg-rose-100 text-rose-700',
  'product.onsale': 'bg-leaf-100 text-leaf-700',
  'order.ship': 'bg-blue-100 text-blue-700',
  'order.refund': 'bg-rose-100 text-rose-700',
  'order.complete': 'bg-leaf-100 text-leaf-700',
  'order.cancel': 'bg-ink-100 text-ink-700',
  'auction.cancel': 'bg-ink-100 text-ink-700',
  'auction.forceFinish': 'bg-amber-100 text-amber-700',
  'report.resolved': 'bg-leaf-100 text-leaf-700',
  'report.rejected': 'bg-ink-100 text-ink-600',
  'announcement.create': 'bg-leaf-100 text-leaf-700',
  'announcement.update': 'bg-amber-100 text-amber-700',
  'announcement.delete': 'bg-rose-100 text-rose-700',
  'badge.grant': 'bg-violet-100 text-violet-700',
  'theme.toggle': 'bg-amber-100 text-amber-700',
  'board.category.update': 'bg-blue-100 text-blue-700',
};

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: { q?: string; action?: string; actor?: string; targetType?: string; page?: string };
}) {
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
      { action: { contains: q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.adminLog.count({ where }),
  ]);

  // 批量查 actor name
  const actorIds = Array.from(new Set(items.map((l) => l.actorId)));
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const actorMap = new Map(actors.map((u) => [u.id, u.name]));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 统计 action 种类,供筛选下拉
  const actionTypes = await prisma.adminLog.groupBy({
    by: ['action'],
    _count: { action: true },
    orderBy: { _count: { action: 'desc' } },
    take: 30,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">📜 操作日志</h1>
        <p className="mt-1 text-xs text-ink-600">
          所有管理员操作审计 · 共 {total} 条 · 第 {page}/{totalPages} 页
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs">
        <input
          name="q"
          defaultValue={q}
          placeholder="目标 ID / 原因"
          className="w-48 rounded-lg border border-ink-200 px-3 py-1.5"
        />
        <select name="action" defaultValue={action} className="rounded-lg border border-ink-200 px-2 py-1.5">
          <option value="">全部 action</option>
          {actionTypes.map((a) => (
            <option key={a.action} value={a.action}>
              {a.action} ({a._count.action})
            </option>
          ))}
        </select>
        <select name="targetType" defaultValue={targetType} className="rounded-lg border border-ink-200 px-2 py-1.5">
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
        <input
          name="actor"
          defaultValue={actor}
          placeholder="操作人 ID"
          className="w-32 rounded-lg border border-ink-200 px-3 py-1.5"
        />
        <button className="rounded-lg bg-ink-800 px-3 py-1.5 text-white">筛选</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="px-3 py-2 text-left">时间</th>
              <th className="px-3 py-2 text-left">操作</th>
              <th className="px-3 py-2 text-left">操作人</th>
              <th className="px-3 py-2 text-left">目标</th>
              <th className="px-3 py-2 text-left">原因 / Meta</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => {
              const cls = ACTION_COLOR[l.action] ?? 'bg-ink-100 text-ink-600';
              return (
                <tr key={l.id} className="border-t border-ink-100">
                  <td className="px-3 py-2 text-[10px] text-ink-500 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${cls}`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/user/${l.actorId}`} target="_blank" className="hover:underline">
                      {actorMap.get(l.actorId) ?? l.actorId.slice(0, 10) + '…'}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px]">
                    {l.targetType}
                    {l.targetId ? ` : ${l.targetId.slice(0, 12)}…` : ''}
                  </td>
                  <td className="max-w-[360px] px-3 py-2">
                    {l.reason && (
                      <div className="truncate text-[11px] text-ink-700">{l.reason}</div>
                    )}
                    {l.meta ? (
                      <div className="mt-0.5 truncate text-[10px] text-ink-500 font-mono">
                        {JSON.stringify(l.meta)}
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-ink-500">
                  没有日志
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-1 text-xs">
        {page > 1 && (
          <Link href={{ query: { ...searchParams, page: String(page - 1) } }} className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50">← 上一页</Link>
        )}
        <span className="px-3 py-1 text-ink-500">{page} / {totalPages}</span>
        {page < totalPages && (
          <Link href={{ query: { ...searchParams, page: String(page + 1) } }} className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50">下一页 →</Link>
        )}
      </div>
    </div>
  );
}
