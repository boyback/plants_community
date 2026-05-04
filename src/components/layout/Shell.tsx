'use client';

import { ReactNode, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { MobileTabBar } from './MobileTabBar';

/** 应用主壳:Header + 左侧 Sidebar + 主体 + 移动端抽屉 + 移动端底部 Tab */
export function Shell({
  children,
  withSidebar = true,
}: {
  children: ReactNode;
  withSidebar?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Header onToggleMobileNav={() => setMobileOpen(true)} />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="mx-auto flex max-w-[1280px] gap-6 px-4 py-4 lg:px-6">
        {withSidebar && <Sidebar />}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <MobileTabBar />
    </div>
  );
}
