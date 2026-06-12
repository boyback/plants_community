'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import styles from './layout.module.scss';
import { cx } from '@/lib/style-utils';



export default function SettingsLayout({ children }: {children: React.ReactNode;}) {
  const pathname = usePathname();
  const { user } = useAuth();

  const SETTINGS_MENU: {href: string;icon: IconName;label: string;}[] = [
  { href: '/settings/profile', icon: 'user', label: '个人资料' },
  { href: '/settings/appearance', icon: 'palette', label: '外观' },
  { href: '/settings/language', icon: 'globe', label: '语言' },
  { href: '/settings/notifications', icon: 'bell', label: '通知' },
  { href: '/settings/privacy', icon: 'lock', label: '隐私设置' },
  { href: '/settings/addresses', icon: 'mail', label: '收件地址' }];


  return (
    <Shell withSidebar={false}>
      <div className={cx(styles.r_60fbb771, styles.r_0d304f90)}>
        {/* 设置页左侧菜单 */}
        <aside className={cx(styles.r_74b2435a, styles.r_012fbd12, styles.r_99d72c7f, styles.r_9d60be3a)}>
          <div className={cx(styles.r_3e0fd166, styles.r_90a8e3af)}>
            <h2 className={cx(styles.r_42536e69, styles.r_e83a7042, styles.r_399e11a5, styles.r_da019856)}>设置</h2>
            <nav className={styles.r_e2eedc57}>
              {SETTINGS_MENU.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_7e9a2a25, styles.r_5f22e64f, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_ceb69a6b),

                    active ? cx(styles.r_f2b23104, styles.r_e7eab4cb, styles.r_2689f395) : cx(styles.r_02eb621e, styles.r_5756b7b4, styles.r_9825203a)


                    )}>

                    <Icon name={item.icon} size={16} />
                    <span>{item.label}</span>
                  </Link>);

              })}
            </nav>
          </div>
        </aside>

        {/* 右侧配置面板 */}
        <main className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
          {children}
        </main>
      </div>
    </Shell>);

}