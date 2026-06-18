import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { cn } from '@/lib/utils';
import { UserRowActions } from './UserRowActions';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



export const dynamic = "force-dynamic";

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
  tone: cx(styles.r_358505cf, styles.r_5e10cdb8, styles.r_eb6abb1f)
},
{
  key: 'user',
  title: '普通用户',
  desc: '默认社区成员',
  tone: cx(styles.r_358505cf, styles.r_ce27a834, styles.r_eb6abb1f)
},
{
  key: 'moderator',
  title: '版主',
  desc: '内容协助管理',
  tone: cx(styles.r_d85e2a6f, styles.r_67d2289d, styles.r_85d79ebf)
},
{
  key: 'admin',
  title: '管理员',
  desc: '后台功能管理',
  tone: cx(styles.r_3d496065, styles.r_0759a0f1, styles.r_b54428d1)
},
{
  key: 'super_admin',
  title: '超级管理员',
  desc: '最高管理权限',
  tone: cx(styles.r_5650c76d, styles.r_3b5cf6c0, styles.r_06fd2bc1)
}];


const ROLE_LABEL: Record<string, string> = {
  user: '普通用户',
  moderator: '版主',
  admin: '管理员',
  super_admin: '超级管理员'
};

function normalizeRole(value: string | undefined): RoleFilter {
  return ROLE_FILTERS.some((item) => item.key === value) ? value as RoleFilter : 'all';
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
  banned




}: {q: string;role: RoleFilter;banned: 'yes' | 'no' | 'all';}): Prisma.UserWhereInput {
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
      { id: q }]

    });
  }

  return AND.length > 0 ? { AND } : {};
}

function roleBadgeClass(role: string, isSuperAdmin: boolean) {
  if (isSuperAdmin) return cx(styles.r_07389a77, styles.r_5f48f96e, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_06fd2bc1);
  if (role === 'admin') return cx(styles.r_07389a77, styles.r_e0467cf5, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_b54428d1);
  if (role === 'moderator') return cx(styles.r_07389a77, styles.r_735dd972, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_85d79ebf);
  return cx(styles.r_07389a77, styles.r_febec8f2, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_02eb621e);
}

export default async function AdminUsersPage({
  searchParams


}: {searchParams: {q?: string;role?: string;banned?: string;page?: string;};}) {
  const q = searchParams.q?.trim() ?? '';
  const selectedRole = normalizeRole(searchParams.role);
  const banned = searchParams.banned === 'yes' || searchParams.banned === 'no' ?
  searchParams.banned :
  'all';
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
  superAdminCount] =
  await Promise.all([
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
        select: { id: true, type: true, targetId: true, targetName: true, targetPath: true }
      },
      _count: { select: { posts: true, comments: true } }
    }
  }),
  prisma.user.count({ where }),
  prisma.user.count(),
  prisma.user.count({ where: { role: 'user' } }),
  prisma.user.count({ where: { role: 'moderator' } }),
  prisma.user.count({ where: { role: 'admin', isSuperAdmin: false } }),
  prisma.user.count({ where: { isSuperAdmin: true } })]
  );

  const countByRole: Record<RoleFilter, number> = {
    all: allCount,
    user: userCount,
    moderator: moderatorCount,
    admin: adminCount,
    super_admin: superAdminCount
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
      if (value) query[key] = value;else
      delete query[key];
    });
    return query;
  };

  return (
    <div className={styles.r_3e7ce58d}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>用户与角色管理</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>
          这里只维护用户所属角色；功能权限请到权限管理按角色类型统一分配。
        </p>
      </div>

      <section className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_e00ad816, styles.r_a4ecef1e)}>
        {ROLE_FILTERS.map((item) => {
          const active = selectedRole === item.key;
          return (
            <Link
              key={item.key}
              href={{
                pathname: '/admin/users',
                query: queryFor({
                  role: item.key === 'all' ? '' : item.key,
                  page: '1'
                })
              }}
              className={cn(cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_8e63407b, styles.r_ceb69a6b, styles.r_00eba3fb, styles.r_29687528),

              item.tone,
              active && cx(styles.r_30cfe115, styles.r_16b1efa5, styles.r_a283ee7a)
              )}>

              <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
                <div className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>{item.title}</div>
                <div className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_3032cae0)}>{countByRole[item.key]}</div>
              </div>
              <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_0c67ca47)}>{item.desc}</div>
            </Link>);

        })}
      </section>

      <form className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_eb6e8b88, styles.r_359090c2)}>
        {selectedRole !== 'all' && <input type="hidden" name="role" value={selectedRole} />}
        <Input
          name="q"
          defaultValue={q}
          placeholder="按用户名、账号、邮箱或 ID 搜索"
          className={cx(styles.r_6ca62528, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_1bd19725, styles.r_55d048eb)} />

        <select name="banned" defaultValue={banned} className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee)}>
          <option value="all">全部状态</option>
          <option value="no">未封禁</option>
          <option value="yes">已封禁</option>
        </select>
        <button className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_72a4c7cd)}>筛选</button>
        {(q || banned !== 'all') &&
        <Link
          href={{
            pathname: '/admin/users',
            query: selectedRole === 'all' ? {} : { role: selectedRole }
          }}
          className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_02eb621e, styles.r_5399e21f)}>

            清除条件
          </Link>
        }
      </form>

      <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e, styles.r_359090c2, styles.r_02eb621e)}>
        <div>
          当前分类: <span className={cx(styles.r_e83a7042, styles.r_399e11a5)}>{selectedTitle}</span>
          <span className={styles.r_0da48290}>·</span>
          共 {total} 人
        </div>
        <div>第 {page}/{totalPages} 页</div>
      </div>

      <div className={cx(styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
        <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
          <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
            <tr>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>用户信息</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>角色类型</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>Lv / 钻石</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>帖 / 评</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>注册时间</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>状态</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => {
              const bannedNow = u.bannedUntil && new Date(u.bannedUntil).getTime() > now;
              const roleKey = u.isSuperAdmin ? 'super_admin' : u.role;
              return (
                <tr key={u.id} className={cx(styles.r_b950dda2, styles.r_358505cf, styles.r_d9a085ef)}>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                    <Link href={`/user/${u.id}`} target="_blank" className={cx(styles.r_2689f395, styles.r_399e11a5, styles.r_f673f4a7)}>
                      {u.name}
                    </Link>
                    <div className={cx(styles.r_15e1b1f4, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_0f8a144a, styles.r_458ec85f, styles.r_1dc571a3, styles.r_7b89cd85)}>
                      {u.handle && <span>@{u.handle}</span>}
                      {u.email && <span>{u.email}</span>}
                      <span className={styles.r_0e65706b}>{u.id.slice(0, 12)}...</span>
                    </div>
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                    <span className={roleBadgeClass(u.role, u.isSuperAdmin)}>
                      {ROLE_LABEL[roleKey] ?? u.role}
                    </span>
                    {u.role === 'moderator' &&
                    <div className={cx(styles.r_b6b02c0e, styles.r_c6684fae, styles.r_e2eedc57, styles.r_1dc571a3, styles.r_7b89cd85)}>
                        {u.moderatorScopes.length > 0 ?
                      <>
                            {u.moderatorScopes.slice(0, 2).map((scope) =>
                        <div key={scope.id} className={styles.r_f283ea9b} title={scope.targetPath}>
                                {scope.targetPath}
                              </div>
                        )}
                            {u.moderatorScopes.length > 2 &&
                        <div>另 {u.moderatorScopes.length - 2} 项</div>
                        }
                          </> :

                      <div className={styles.r_595fceba}>未分配辖区</div>
                      }
                      </div>
                    }
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0)}>
                    Lv.{u.level} / {u.pointsBalance}
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069, styles.r_3032cae0, styles.r_02eb621e)}>
                    {u._count.posts} / {u._count.comments}
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_d058ca6d, styles.r_7b89cd85)}>
                    {new Date(u.joinedAt).toLocaleDateString("zh-CN")}
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                    {bannedNow ?
                    <div>
                        <span className={cx(styles.r_ac204c10, styles.r_e0467cf5, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_b54428d1)}>
                          已封禁
                        </span>
                        <div className={cx(styles.r_15e1b1f4, styles.r_1dc571a3, styles.r_7b89cd85)}>
                          至 {new Date(u.bannedUntil!).toLocaleDateString("zh-CN")}
                        </div>
                      </div> :

                    <span className={cx(styles.r_ac204c10, styles.r_f2b23104, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_5f6a59f1)}>
                        正常
                      </span>
                    }
                  </td>
                  <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>
                    <UserRowActions
                      userId={u.id}
                      userName={u.name}
                      role={u.role}
                      banned={!!bannedNow}
                      moderatorScopes={u.moderatorScopes} />

                  </td>
                </tr>);

            })}
            {items.length === 0 &&
            <tr>
                <td colSpan={7} className={cx(styles.r_0e17f2bd, styles.r_1100bef6, styles.r_ca6bf630, styles.r_7b89cd85)}>
                  这个角色类型下没有匹配的用户
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div className={cx(styles.r_60fbb771, styles.r_86843cf1, styles.r_44ee8ba0, styles.r_359090c2)}>
        {page > 1 &&
        <Link
          href={{
            pathname: '/admin/users',
            query: queryFor({ page: String(page - 1) })
          }}
          className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5399e21f)}>

            上一页
          </Link>
        }
        <span className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_7b89cd85)}>
          {page} / {totalPages}
        </span>
        {page < totalPages &&
        <Link
          href={{
            pathname: '/admin/users',
            query: queryFor({ page: String(page + 1) })
          }}
          className={cx(styles.r_07389a77, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_5399e21f)}>

            下一页
          </Link>
        }
      </div>
    </div>);

}
