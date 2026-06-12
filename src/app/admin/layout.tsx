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
import styles from './layout.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: {children: React.ReactNode;}) {
  const me = await getCurrentUser();
  if (!me) {
    redirect('/login?redirect=/admin');
  }
  const role = (me as {role?: string;}).role;
  if (role !== 'admin' && role !== 'moderator') {
    redirect('/');
  }

  return (
    <div className={cx(styles.r_793346c7, styles.r_096e7659, styles.r_399e11a5)}>
      <header className={cx(styles.r_3e0fd166, styles.r_2167406b, styles.r_145745bf, styles.r_65fdbade, styles.r_358505cf, styles.r_f5ebd4d0, styles.r_0b2e8c28)}>
        <div className={cx(styles.r_60fbb771, styles.r_73a13409, styles.r_3960ffc2, styles.r_0c3bc985, styles.r_f92d0236)}>
          <Link href="/admin" className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_fc7473ca, styles.r_e83a7042)}>
            <span className={cx(styles.r_f3c543ad, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_67d66567, styles.r_5f22e64f, styles.r_39b2e003, styles.r_f3c97abd, styles.r_da4d1df4, styles.r_72a4c7cd)}>
              ⚙
            </span>
            <span>RouYou Admin</span>
          </Link>
          <div className={cx(styles.r_fb56d9cf, styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_359090c2, styles.r_02eb621e)}>
            <span>{me.name}</span>
            <span className={cx(styles.r_ac204c10, styles.r_febec8f2, styles.r_d5eab218, styles.r_465609a2, styles.r_0e65706b)}>
              {role}
            </span>
            <Link href="/" className={styles.r_ecb1dae8}>回前台 →</Link>
          </div>
        </div>
      </header>
      <div className={cx(styles.r_0e12dc7d, styles.r_f3c543ad, styles.r_c0491287, styles.r_2c3782a0, styles.r_0d304f90, styles.r_f92d0236, styles.r_940911bf)}>
        <AdminNav role={role ?? 'user'} />
        <main className={styles.r_7e0b7cdf}>{children}</main>
      </div>
    </div>);

}