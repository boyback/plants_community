'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/client-api';

interface SystemMenu {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  path: string;
  location: 'header' | 'sidebar';
}

interface FeatureFlags {
  'feature.shaitu.enabled': boolean;
  'feature.market.enabled': boolean;
  'feature.contests.enabled': boolean;
  systemMenus: SystemMenu[];
}

const defaultFlags: FeatureFlags = {
  'feature.shaitu.enabled': true,
  'feature.market.enabled': true,
  'feature.contests.enabled': false,
  systemMenus: [],
};

const FeatureFlagsContext = createContext<FeatureFlags>(defaultFlags);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);

  useEffect(() => {
    Promise.all([
      api.get<Record<string, boolean>>('/api/features'),
      api.get<SystemMenu[]>('/api/system-menus').catch(() => [] as SystemMenu[]),
    ]).then(([featureFlags, systemMenus]) => {
      setFlags({
        ...defaultFlags,
        ...featureFlags,
        systemMenus,
      });
    }).catch((err) => console.error('加载功能配置失败:', err));
  }, []);

  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
