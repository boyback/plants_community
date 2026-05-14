'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const SETTINGS_MENU: { href: string; icon: IconName; label: string }[] = [
    { href: '/settings/profile', icon: 'user', label: '个人资料' },
    { href: '/settings/appearance', icon: 'palette', label: '外观' },
    { href: '/settings/language', icon: 'globe', label: '语言' },
    { href: '/settings/notifications', icon: 'bell', label: '通知' },
    { href: '/settings/privacy', icon: 'lock', label: '隐私设置' },
    { href: '/settings/addresses', icon: 'mail', label: '收件地址' },
  ];

  return (
    <Shell withSidebar={false}>
      <div className="flex gap-6">
        {/* 设置页左侧菜单 */}
        <aside className="w-48 shrink-0 hidden md:block">
          <div className="sticky top-[80px]">
            <h2 className="text-lg font-semibold text-ink-800 mb-4">设置</h2>
            <nav className="space-y-0.5">
              {SETTINGS_MENU.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                      active
                        ? 'bg-leaf-100 text-leaf-800 font-medium'
                        : 'text-ink-600 hover:bg-leaf-50 hover:text-leaf-700'
                    )}
                  >
                    <Icon name={item.icon} size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* 右侧配置面板 */}
        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </Shell>
  );
}
