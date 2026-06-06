'use client';

import { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { SiteFooter } from '@/components/layout/SiteFooter';

export function Shell({
  children,
  withSidebar = true,
  recommendUsers = [],
}: {
  children: ReactNode;
  withSidebar?: boolean;
  recommendUsers?: any[];
}) {
  return (
    <AppShell showFloatingAi={false} className="!max-w-[1280px] pt-4">
      <div className="flex gap-6">
        {withSidebar && <Sidebar recommendUsers={recommendUsers} />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <SiteFooter />
    </AppShell>
  );
}
