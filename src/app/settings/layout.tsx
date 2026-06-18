'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import styles from './layout.module.scss';

const SETTINGS_MENU: { href: string; icon: IconName; label: string }[] = [
  { href: '/settings/profile', icon: 'user', label: '个人资料' },
  { href: '/settings/appearance', icon: 'palette', label: '外观' },
  { href: '/settings/language', icon: 'globe', label: '语言' },
  { href: '/settings/notifications', icon: 'bell', label: '通知' },
  { href: '/settings/privacy', icon: 'lock', label: '隐私设置' },
  { href: '/settings/addresses', icon: 'mail', label: '收件地址' }
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Shell withSidebar={false}>
      <div className={styles.settingsShell}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h2 className={styles.sidebarTitle}>设置</h2>
            <nav className={styles.sidebarNav}>
              {SETTINGS_MENU.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(styles.sidebarLink, active && styles.sidebarLinkActive)}
                  >
                    <Icon name={item.icon} size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className={styles.content}>{children}</main>
      </div>
    </Shell>
  );
}
