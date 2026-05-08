/**
 * Admin 后台的顶层 Layout。
 *
 * 所有 /admin/* 路由都必须:
 *   1. 已登录(否则 307 → /login?redirect=...)
 *   2. 当前用户 role === 'admin'(否则 307 → /)
 *
 * 所以 Guard 放在 server component 最上面。
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AdminNav } from './AdminNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();
  if (!me) {
    redirect('/login?redirect=/admin');
  }
  const role = (me as { role?: string }).role;
  if (role !== 'admin' && role !== 'moderator') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-ink-50/30 text-ink-800">
      <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-6">
          <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-ink-800 to-ink-600 text-white">
              ⚙
            </span>
            <span>RouYou Admin</span>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-xs text-ink-600">
            <span>{me.name}</span>
            <span className="rounded-full bg-ink-100 px-2 py-0.5 font-mono">
              {role}
            </span>
            <Link href="/" className="hover:text-ink-900">回前台 →</Link>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1400px] grid-cols-[200px_1fr] gap-6 px-6 py-6">
        <AdminNav role={role ?? 'user'} />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
