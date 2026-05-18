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
  location: 'header' | 'sidebar_left' | 'sidebar_right';
  cardKey: string | null;
  type: 'button' | 'card';
  enabled: boolean;
  orderIdx: number;
}

interface FeatureFlags {
  'feature.shaitu.enabled': boolean;
  'feature.market.enabled': boolean;
  'feature.contests.enabled': boolean;
  systemMenus: SystemMenu[];
  _loaded: boolean;
}

const STORAGE_KEY = 'system-menus-cache';

function loadFromCache(): SystemMenu[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {}
  return [];
}

function saveToCache(menus: SystemMenu[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menus));
  } catch {}
}

function isCacheDifferent(cache: SystemMenu[], fresh: SystemMenu[]): boolean {
  if (cache.length !== fresh.length) return true;
  return fresh.some((f, i) => f.id !== cache[i]?.id || f.orderIdx !== cache[i]?.orderIdx || f.enabled !== cache[i]?.enabled);
}

const defaultFlags: FeatureFlags = {
  'feature.shaitu.enabled': true,
  'feature.market.enabled': true,
  'feature.contests.enabled': false,
  systemMenus: [],
  _loaded: false,
};

const FeatureFlagsContext = createContext<FeatureFlags>(defaultFlags);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(() => {
    const cached = loadFromCache();
    return {
      ...defaultFlags,
      systemMenus: cached,
      _loaded: cached.length > 0, // 有缓存就标记为已加载
    };
  });

  useEffect(() => {
    Promise.all([
      api.get<Record<string, boolean>>('/api/features'),
      api.get<SystemMenu[]>('/api/system-menus').catch(() => [] as SystemMenu[]),
    ]).then(([featureFlags, systemMenus]) => {
      const cached = loadFromCache();
      // 有缓存且数据不同则更新本地缓存
      if (cached.length > 0 && isCacheDifferent(cached, systemMenus)) {
        saveToCache(systemMenus);
      }
      // 无缓存则保存
      if (cached.length === 0) {
        saveToCache(systemMenus);
      }

      setFlags({
        ...defaultFlags,
        ...featureFlags,
        systemMenus: systemMenus,
        _loaded: true,
      });
    }).catch((err) => {
      console.error('加载功能配置失败:', err);
      setFlags((prev) => ({ ...prev, _loaded: true }));
    });
  }, []);

  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}