'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/client-api';
import { isJsonDifferent, loadLocalJson, saveLocalJson } from '@/lib/local-json-cache';

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
  return loadLocalJson<SystemMenu[]>(STORAGE_KEY) ?? [];
}

function saveToCache(menus: SystemMenu[]) {
  saveLocalJson(STORAGE_KEY, menus);
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
      const changed = isJsonDifferent(cached, systemMenus);
      // 有缓存且数据不同则更新本地缓存
      if (changed) {
        saveToCache(systemMenus);
      }
      // 无缓存则保存
      const systemMenusFromCache = changed ? systemMenus : cached;

      setFlags({
        ...defaultFlags,
        ...featureFlags,
        systemMenus: systemMenusFromCache,
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
