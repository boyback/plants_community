'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import styles from './AdminNav.module.scss';
import { cx } from '@/lib/style-utils';



type Role = 'user' | 'moderator' | 'admin';

const NAV: {section: string;items: {href: string;label: string;minRole: Role;}[];}[] = [
{
  section: '总览',
  items: [
  { href: '/admin', label: '📊 Dashboard', minRole: 'moderator' }]

},
{
  section: '内容审核',
  items: [
  { href: '/admin/posts', label: '📝 帖子管理', minRole: 'moderator' },
  { href: '/admin/reports', label: '🚨 举报处理', minRole: 'moderator' },
  { href: '/admin/comments', label: '💬 评论管理', minRole: 'moderator' }]

},
{
  section: '用户 / 社区',
  items: [
  { href: '/admin/users', label: '👥 用户权限', minRole: 'admin' },
  { href: '/admin/permissions', label: '🔐 权限管理', minRole: 'admin' },
  { href: '/admin/badges', label: '🏅 徽章发放', minRole: 'admin' },
  { href: '/admin/points', label: '💎 积分调整', minRole: 'admin' }]

},
{
  section: '商业',
  items: [
  { href: '/admin/products', label: '🛒 商品管理', minRole: 'admin' },
  { href: '/admin/orders', label: '📦 订单处理', minRole: 'admin' },
  { href: '/admin/auctions', label: '🔨 拍卖管理', minRole: 'admin' }]

},
{
  section: '图鉴 / 板块',
  items: [
  { href: '/admin/boards', label: '🌿 板块管理', minRole: 'admin' },
  { href: '/admin/species', label: '📚 品种数据', minRole: 'admin' }]

},
{
  section: '系统',
  items: [
  { href: '/admin/announcements', label: '📣 站内公告', minRole: 'admin' },
  { href: '/admin/banners', label: '🖼️ 首页 Banner', minRole: 'admin' },
  { href: "/admin/system-menus", label: '🔗 系统菜单', minRole: 'admin' },
  { href: "/admin/email-broadcast", label: '📧 邮件群发', minRole: 'admin' },
  { href: '/admin/themes', label: '🎨 主题调度', minRole: 'admin' },
  { href: '/admin/tasks', label: '🎯 任务配置', minRole: 'admin' },
  { href: "/admin/site-config", label: '⚙️ 站点配置', minRole: 'admin' },
  { href: '/admin/logs', label: '📜 操作日志', minRole: 'admin' }]

}];


const RANK: Record<Role, number> = { user: 0, moderator: 1, admin: 2 };

export function AdminNav({ role }: {role: string;}) {
  const pathname = usePathname();
  const myRank = RANK[role as Role ?? 'user'] ?? 0;

  return (
    <aside className={cx(styles.r_3e0fd166, styles.r_df021aaa, styles.r_e4809b51)}>
      <nav className={cx(styles.r_3e7ce58d, styles.r_fc7473ca)}>
        {NAV.map((sec) => {
          const items = sec.items.filter((it) => myRank >= RANK[it.minRole]);
          if (items.length === 0) return null;
          return (
            <div key={sec.section}>
              <div className={cx(styles.r_d7c1392c, styles.r_d5eab218, styles.r_1dc571a3, styles.r_2689f395, styles.r_117ec720, styles.r_09ace3a4, styles.r_7b89cd85)}>
                {sec.section}
              </div>
              <ul className={styles.r_e2eedc57}>
                {items.map((it) => {
                  const active =
                  it.href === '/admin' ?
                  pathname === '/admin' :
                  pathname.startsWith(it.href);
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={cn(cx(styles.r_0214b4b3, styles.r_5f22e64f, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_a14daebf, styles.r_ceb69a6b),

                        active ? cx(styles.r_01d0b06c, styles.r_72a4c7cd, styles.r_2689f395) : cx(styles.r_eb6abb1f, styles.r_9cab05a6)


                        )}>

                        {it.label}
                      </Link>
                    </li>);

                })}
              </ul>
            </div>);

        })}
      </nav>
    </aside>);

}