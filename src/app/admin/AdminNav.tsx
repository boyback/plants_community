'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Role = 'user' | 'moderator' | 'admin';

const NAV: { section: string; items: { href: string; label: string; minRole: Role }[] }[] = [
  {
    section: '总览',
    items: [
      { href: '/admin', label: '📊 Dashboard', minRole: 'moderator' },
    ],
  },
  {
    section: '内容审核',
    items: [
      { href: '/admin/posts', label: '📝 帖子管理', minRole: 'moderator' },
      { href: '/admin/reports', label: '🚨 举报处理', minRole: 'moderator' },
      { href: '/admin/comments', label: '💬 评论管理', minRole: 'moderator' },
    ],
  },
  {
    section: '用户 / 社区',
    items: [
      { href: '/admin/users', label: '👥 用户管理', minRole: 'admin' },
      { href: '/admin/badges', label: '🏅 徽章发放', minRole: 'admin' },
      { href: '/admin/points', label: '💎 积分调整', minRole: 'admin' },
    ],
  },
  {
    section: '商业',
    items: [
      { href: '/admin/products', label: '🛒 商品管理', minRole: 'admin' },
      { href: '/admin/orders', label: '📦 订单处理', minRole: 'admin' },
      { href: '/admin/auctions', label: '🔨 拍卖管理', minRole: 'admin' },
    ],
  },
  {
    section: '图鉴 / 板块',
    items: [
      { href: '/admin/boards', label: '🌿 板块 CRUD', minRole: 'admin' },
      { href: '/admin/species', label: '📚 品种数据', minRole: 'admin' },
    ],
  },
  {
    section: '系统',
    items: [
      { href: '/admin/announcements', label: '📣 站内公告', minRole: 'admin' },
      { href: '/admin/banners', label: '🖼️ 首页 Banner', minRole: 'admin' },
      { href: '/admin/themes', label: '🎨 主题调度', minRole: 'admin' },
      { href: '/admin/tasks', label: '🎯 任务配置', minRole: 'admin' },
      { href: '/admin/site-config', label: '⚙️ 站点配置', minRole: 'admin' },
      { href: '/admin/logs', label: '📜 操作日志', minRole: 'admin' },
    ],
  },
];

const RANK: Record<Role, number> = { user: 0, moderator: 1, admin: 2 };

export function AdminNav({ role }: { role: string }) {
  const pathname = usePathname();
  const myRank = RANK[(role as Role) ?? 'user'] ?? 0;

  return (
    <aside className="sticky top-20 h-fit">
      <nav className="space-y-4 text-sm">
        {NAV.map((sec) => {
          const items = sec.items.filter((it) => myRank >= RANK[it.minRole]);
          if (items.length === 0) return null;
          return (
            <div key={sec.section}>
              <div className="mb-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-ink-500">
                {sec.section}
              </div>
              <ul className="space-y-0.5">
                {items.map((it) => {
                  const active =
                    it.href === '/admin'
                      ? pathname === '/admin'
                      : pathname.startsWith(it.href);
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={cn(
                          'block rounded-lg px-3 py-2 text-[13px] transition-colors',
                          active
                            ? 'bg-ink-800 text-white font-medium'
                            : 'text-ink-700 hover:bg-ink-100'
                        )}
                      >
                        {it.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
