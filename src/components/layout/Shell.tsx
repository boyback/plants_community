'use client';

import { ReactNode, useState } from 'react';
import { Header } from './Header';
import { WelcomeBanner } from './WelcomeBanner';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { MobileTabBar } from './MobileTabBar';
import { SiteFooter } from './SiteFooter';
import { FestivalBanner } from '@/theme/FestivalBanner';
import { FestivalParticles } from '@/theme/FestivalParticles';
import { SwipeBack } from '@/components/ui/SwipeBack';

/** 应用主壳:Header + 左侧 Sidebar + 主体 + 移动端抽屉 + 移动端底部 Tab + 节日氛围层 */
export function Shell({
  children,
  withSidebar = true,
  recommendUsers = [],
}: {
  children: ReactNode;
  withSidebar?: boolean;
  recommendUsers?: any[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <SwipeBack />
      <FestivalParticles />
      <FestivalBanner />
      <WelcomeBanner />
      <Header onToggleMobileNav={() => setMobileOpen(true)} />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="mx-auto flex max-w-[1280px] gap-6 px-4 py-4 lg:px-6">
        {withSidebar && <Sidebar recommendUsers={recommendUsers} />}
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <SiteFooter />

      {/* m 端底部 Tab Bar 遮挡 footer 末尾,留白 */}
      <div className="h-16 md:hidden" aria-hidden />
      <MobileTabBar />
    </div>
  );
}
