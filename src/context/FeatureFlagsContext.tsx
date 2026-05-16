'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface FeatureFlags {
  'feature.shaitu.enabled': boolean;
  'feature.market.enabled': boolean;
  'feature.contests.enabled': boolean;
}

const defaultFlags: FeatureFlags = {
  'feature.shaitu.enabled': true,
  'feature.market.enabled': true,
  'feature.contests.enabled': false,
};

const FeatureFlagsContext = createContext<FeatureFlags>(defaultFlags);

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);

  useEffect(() => {
    fetch('/api/features')
      .then((res) => res.json())
      .then((data) => setFlags({ ...defaultFlags, ...data }))
      .catch((err) => console.error('加载功能开关失败:', err));
  }, []);

  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}
