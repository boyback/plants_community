import Link from 'next/link';
import { prisma } from '@/lib/db';
import { UserRowActions } from './UserRowActions';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string; banned?: string; page?: string };
}) {
  const q = searchParams.q ?? '';
  const role = searchParams.role ?? '';
  const banned = (searchParams.banned as 'yes' | 'no' | 'all') ?? 'all';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (banned === 'yes') where.bannedUntil = { gt: new Date() };
  else if (banned === 'no')
    where.OR = [{ bannedUntil: null }, { bannedUntil: { lte: new Date() } }];
  if (q) {
    where.OR = [
      ...((where.OR as unknown[]) ?? []),
      { name: { contains: q } },
      { id: q },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { joinedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, avatar: true, level: true, exp: true,
        role: true, bannedUntil: true, banReason: true,
        pointsBalance: true, joinedAt: true,
        permissionOverrides: { select: { permission: true, effect: true } },
        _count: { select: { posts: true, comments: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const now = Date.now();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">用户与权限管理</h1>
        <p className="mt-1 text-xs text-ink-600">
          共 {total} 人 · 第 {page}/{totalPages} 页
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs">
        <input
          name="q"
          defaultValue={q}
          placeholder="按用户名或 ID 搜索"
          className="w-48 rounded-lg border border-ink-200 px-3 py-1.5 focus:border-ink-400 focus:outline-none"
        />
        <select name="role" defaultValue={role} className="rounded-lg border border-ink-200 px-2 py-1.5">
          <option value="">全部角色</option>
          <option value="user">普通</option>
          <option value="moderator">版主</option>
          <option value="admin">管理员</option>
        </select>
        <select name="banned" defaultValue={banned} className="rounded-lg border border-ink-200 px-2 py-1.5">
          <option value="all">全部</option>
          <option value="no">未封禁</option>
          <option value="yes">已封禁</option>
        </select>
        <button className="rounded-lg bg-ink-800 px-3 py-1.5 text-white">筛选</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="px-3 py-2 text-left">用户</th>
              <th className="px-3 py-2 text-left">角色</th>
              <th className="px-3 py-2 text-left">功能权限</th>
              <th className="px-3 py-2 text-right">Lv / 积分</th>
              <th className="px-3 py-2 text-right">帖/评</th>
              <th className="px-3 py-2 text-left">注册</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => {
              const bannedNow = u.bannedUntil && new Date(u.bannedUntil).getTime() > now;
              return (
                <tr key={u.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                  <td className="px-3 py-2">
                    <Link href={`/user/${u.id}`} target="_blank" className="hover:underline">
                      {u.name}
                    </Link>
                    <div className="text-[10px] text-ink-500 font-mono">{u.id.slice(0, 12)}…</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={
                      u.role === 'admin' ? 'rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700' :
                      u.role === 'moderator' ? 'rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700' :
                      'rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-600'
                    }>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-ink-500">
                    {u.permissionOverrides.length > 0 ? (
                      <span className="rounded-full bg-leaf-50 px-2 py-0.5 text-leaf-700">
                        覆盖 {u.permissionOverrides.length} 项
                      </span>
                    ) : (
                      <span>按等级默认</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    Lv.{u.level} / 💎{u.pointsBalance}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-600">
                    {u._count.posts} / {u._count.comments}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-ink-500">
                    {new Date(u.joinedAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-3 py-2">
                    {bannedNow ? (
                      <div>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700">
                          已封禁
                        </span>
                        <div className="mt-0.5 text-[10px] text-ink-500">
                          至 {new Date(u.bannedUntil!).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    ) : (
                      <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-[10px] text-leaf-700">
                        正常
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <UserRowActions
                      userId={u.id}
                      userName={u.name}
                      role={u.role}
                      banned={!!bannedNow}
                      level={u.level}
                      permissionOverrides={u.permissionOverrides}
                    />
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-ink-500">
                  没有数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-1 text-xs">
        {page > 1 && (
          <Link
            href={{ query: { ...searchParams, page: String(page - 1) } }}
            className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50"
          >
            ← 上一页
          </Link>
        )}
        <span className="px-3 py-1 text-ink-500">
          {page} / {totalPages}
        </span>
        {page < totalPages && (
          <Link
            href={{ query: { ...searchParams, page: String(page + 1) } }}
            className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50"
          >
            下一页 →
          </Link>
        )}
      </div>
    </div>
  );
}
