import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { cn } from '@/lib/utils';
import { UserRowActions } from './UserRowActions';

export const dynamic = 'force-dynamic';

type RoleFilter = 'all' | 'user' | 'moderator' | 'admin' | 'super_admin';

const ROLE_FILTERS: {
  key: RoleFilter;
  title: string;
  desc: string;
  tone: string;
}[] = [
  {
    key: 'all',
    title: '全部用户',
    desc: '所有注册账号',
    tone: 'border-ink-100 bg-white text-ink-700',
  },
  {
    key: 'user',
    title: '普通用户',
    desc: '默认社区成员',
    tone: 'border-ink-100 bg-ink-50 text-ink-700',
  },
  {
    key: 'moderator',
    title: '版主',
    desc: '内容协助管理',
    tone: 'border-amber-100 bg-amber-50 text-amber-700',
  },
  {
    key: 'admin',
    title: '管理员',
    desc: '后台功能管理',
    tone: 'border-rose-100 bg-rose-50 text-rose-700',
  },
  {
    key: 'super_admin',
    title: '超级管理员',
    desc: '最高管理权限',
    tone: 'border-violet-100 bg-violet-50 text-violet-700',
  },
];

const ROLE_LABEL: Record<string, string> = {
  user: '普通用户',
  moderator: '版主',
  admin: '管理员',
  super_admin: '超级管理员',
};

function normalizeRole(value: string | undefined): RoleFilter {
  return ROLE_FILTERS.some((item) => item.key === value) ? (value as RoleFilter) : 'all';
}

function roleWhere(role: RoleFilter): Prisma.UserWhereInput | null {
  if (role === 'all') return null;
  if (role === 'super_admin') return { isSuperAdmin: true };
  if (role === 'admin') return { role: 'admin', isSuperAdmin: false };
  return { role };
}

function buildUserWhere({
  q,
  role,
  banned,
}: {
  q: string;
  role: RoleFilter;
  banned: 'yes' | 'no' | 'all';
}): Prisma.UserWhereInput {
  const AND: Prisma.UserWhereInput[] = [];
  const roleCondition = roleWhere(role);
  if (roleCondition) AND.push(roleCondition);

  if (banned === 'yes') {
    AND.push({ bannedUntil: { gt: new Date() } });
  } else if (banned === 'no') {
    AND.push({ OR: [{ bannedUntil: null }, { bannedUntil: { lte: new Date() } }] });
  }

  if (q) {
    AND.push({
      OR: [
        { name: { contains: q } },
        { handle: { contains: q } },
        { email: { contains: q } },
        { id: q },
      ],
    });
  }

  return AND.length > 0 ? { AND } : {};
}

function roleBadgeClass(role: string, isSuperAdmin: boolean) {
  if (isSuperAdmin) return 'rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700';
  if (role === 'admin') return 'rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700';
  if (role === 'moderator') return 'rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700';
  return 'rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-600';
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; role?: string; banned?: string; page?: string };
}) {
  const q = searchParams.q?.trim() ?? '';
  const selectedRole = normalizeRole(searchParams.role);
  const banned = searchParams.banned === 'yes' || searchParams.banned === 'no'
    ? searchParams.banned
    : 'all';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;
  const where = buildUserWhere({ q, role: selectedRole, banned });

  const [
    items,
    total,
    allCount,
    userCount,
    moderatorCount,
    adminCount,
    superAdminCount,
  ] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { joinedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        handle: true,
        name: true,
        email: true,
        avatar: true,
        level: true,
        exp: true,
        role: true,
        isSuperAdmin: true,
        bannedUntil: true,
        banReason: true,
        pointsBalance: true,
        joinedAt: true,
        moderatorScopes: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, type: true, targetId: true, targetName: true, targetPath: true },
        },
        _count: { select: { posts: true, comments: true } },
      },
    }),
    prisma.user.count({ where }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'user' } }),
    prisma.user.count({ where: { role: 'moderator' } }),
    prisma.user.count({ where: { role: 'admin', isSuperAdmin: false } }),
    prisma.user.count({ where: { isSuperAdmin: true } }),
  ]);

  const countByRole: Record<RoleFilter, number> = {
    all: allCount,
    user: userCount,
    moderator: moderatorCount,
    admin: adminCount,
    super_admin: superAdminCount,
  };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const now = Date.now();
  const selectedTitle = ROLE_FILTERS.find((item) => item.key === selectedRole)?.title ?? '全部用户';

  const queryFor = (extra: Partial<Record<'role' | 'banned' | 'q' | 'page', string>>) => {
    const query: Record<string, string> = {};
    if (q) query.q = q;
    if (selectedRole !== 'all') query.role = selectedRole;
    if (banned !== 'all') query.banned = banned;
    Object.entries(extra).forEach(([key, value]) => {
      if (value) query[key] = value;
      else delete query[key];
    });
    return query;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">用户与角色管理</h1>
        <p className="mt-1 text-xs text-ink-600">
          这里只维护用户所属角色；功能权限请到权限管理按角色类型统一分配。
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ROLE_FILTERS.map((item) => {
          const active = selectedRole === item.key;
          return (
            <Link
              key={item.key}
              href={{
                pathname: '/admin/users',
                query: queryFor({
                  role: item.key === 'all' ? '' : item.key,
                  page: '1',
                }),
              }}
              className={cn(
                'rounded-xl border p-4 transition-colors hover:border-ink-300 hover:bg-white',
                item.tone,
                active && 'border-ink-800 ring-2 ring-ink-100'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{item.title}</div>
                <div className="text-lg font-bold tabular-nums">{countByRole[item.key]}</div>
              </div>
              <div className="mt-1 text-xs opacity-70">{item.desc}</div>
            </Link>
          );
        })}
      </section>

      <form className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs">
        {selectedRole !== 'all' && <input type="hidden" name="role" value={selectedRole} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="按用户名、账号、邮箱或 ID 搜索"
          className="w-64 rounded-lg border border-ink-200 px-3 py-1.5 focus:border-ink-400 focus:outline-none"
        />
        <select name="banned" defaultValue={banned} className="rounded-lg border border-ink-200 px-2 py-1.5">
          <option value="all">全部状态</option>
          <option value="no">未封禁</option>
          <option value="yes">已封禁</option>
        </select>
        <button className="rounded-lg bg-ink-800 px-3 py-1.5 text-white">筛选</button>
        {(q || banned !== 'all') && (
          <Link
            href={{
              pathname: '/admin/users',
              query: selectedRole === 'all' ? {} : { role: selectedRole },
            }}
            className="rounded-lg border border-ink-200 px-3 py-1.5 text-ink-600 hover:bg-ink-50"
          >
            清除条件
          </Link>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-600">
        <div>
          当前分类: <span className="font-semibold text-ink-800">{selectedTitle}</span>
          <span className="mx-1">·</span>
          共 {total} 人
        </div>
        <div>第 {page}/{totalPages} 页</div>
      </div>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="px-3 py-2 text-left">用户信息</th>
              <th className="px-3 py-2 text-left">角色类型</th>
              <th className="px-3 py-2 text-right">Lv / 积分</th>
              <th className="px-3 py-2 text-right">帖 / 评</th>
              <th className="px-3 py-2 text-left">注册时间</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => {
              const bannedNow = u.bannedUntil && new Date(u.bannedUntil).getTime() > now;
              const roleKey = u.isSuperAdmin ? 'super_admin' : u.role;
              return (
                <tr key={u.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                  <td className="px-3 py-2">
                    <Link href={`/user/${u.id}`} target="_blank" className="font-medium text-ink-800 hover:underline">
                      {u.name}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-ink-500">
                      {u.handle && <span>@{u.handle}</span>}
                      {u.email && <span>{u.email}</span>}
                      <span className="font-mono">{u.id.slice(0, 12)}...</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={roleBadgeClass(u.role, u.isSuperAdmin)}>
                      {ROLE_LABEL[roleKey] ?? u.role}
                    </span>
                    {u.role === 'moderator' && (
                      <div className="mt-1 max-w-[180px] space-y-0.5 text-[10px] text-ink-500">
                        {u.moderatorScopes.length > 0 ? (
                          <>
                            {u.moderatorScopes.slice(0, 2).map((scope) => (
                              <div key={scope.id} className="truncate" title={scope.targetPath}>
                                {scope.targetPath}
                              </div>
                            ))}
                            {u.moderatorScopes.length > 2 && (
                              <div>另 {u.moderatorScopes.length - 2} 项</div>
                            )}
                          </>
                        ) : (
                          <div className="text-rose-600">未分配辖区</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    Lv.{u.level} / {u.pointsBalance}
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
                      moderatorScopes={u.moderatorScopes}
                    />
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-ink-500">
                  这个角色类型下没有匹配的用户
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-1 text-xs">
        {page > 1 && (
          <Link
            href={{
              pathname: '/admin/users',
              query: queryFor({ page: String(page - 1) }),
            }}
            className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50"
          >
            上一页
          </Link>
        )}
        <span className="px-3 py-1 text-ink-500">
          {page} / {totalPages}
        </span>
        {page < totalPages && (
          <Link
            href={{
              pathname: '/admin/users',
              query: queryFor({ page: String(page + 1) }),
            }}
            className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50"
          >
            下一页
          </Link>
        )}
      </div>
    </div>
  );
}
