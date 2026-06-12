'use client';

/**
 * 节日主题 Context
 *
 * - 每次路由切换时轻量刷新(浏览器 cache 5 分钟)
 * - 支持「预览任意日期」参数,方便运营调试
 * - 用户关闭列表写入后端,刷新后持久
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode } from
'react';
import type { Theme } from '@/lib/themes';

interface Preferences {
  globalDisabled: boolean;
  disabledSlugs: string[];
}

interface ThemeContextValue {
  /** 当前活跃主题(按优先级已排序,前端取第一个做主装饰) */
  activeThemes: Theme[];
  /** 主装饰主题(常为第一个活跃主题) */
  primary: Theme | null;
  /** 是否已从后端加载过一次 */
  ready: boolean;
  /** 预览指定日期(debug 用) */
  previewAt: (at: Date | null) => Promise<void>;
  previewDate: Date | null;
  /** 用户偏好 */
  prefs: Preferences;
  updatePrefs: (patch: Partial<Preferences>) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function fetchActive(at?: Date | null): Promise<{themes: Theme[];globalDisabled: boolean;}> {
  const qs = at ? `?at=${encodeURIComponent(at.toISOString())}` : '';
  const res = await fetch(`/api/themes/active${qs}`);
  if (!res.ok) return { themes: [], globalDisabled: false };
  const body = await res.json();
  if (!body.ok) return { themes: [], globalDisabled: false };
  return body.data;
}

async function fetchPrefs(): Promise<Preferences> {
  try {
    const res = await fetch('/api/themes/preferences');
    if (!res.ok) return { globalDisabled: false, disabledSlugs: [] };
    const body = await res.json();
    if (!body.ok) return { globalDisabled: false, disabledSlugs: [] };
    return body.data;
  } catch {
    return { globalDisabled: false, disabledSlugs: [] };
  }
}

export function ThemeProvider({ children }: {children: ReactNode;}) {
  const [activeThemes, setActive] = useState<Theme[]>([]);
  const [ready, setReady] = useState(false);
  const [previewDate, setPreviewDate] = useState<Date | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({ globalDisabled: false, disabledSlugs: [] });

  // 启动:并行拉 active + preferences
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchActive(previewDate), fetchPrefs()]).then(([act, pr]) => {
      if (cancelled) return;
      setActive(act.themes ?? []);
      setPrefs(pr);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [previewDate]);

  const previewAt = useCallback(async (at: Date | null) => {
    setPreviewDate(at);
  }, []);

  const updatePrefs = useCallback(async (patch: Partial<Preferences>) => {
    const res = await fetch('/api/themes/preferences', {
      method: 'PATCH',
      headers: { "Content-Type": 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!res.ok) return;
    const body = await res.json();
    if (body.ok) {
      setPrefs(body.data);
      // 立刻刷新 active
      const act = await fetchActive(previewDate);
      setActive(act.themes ?? []);
    }
  }, [previewDate]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      activeThemes,
      primary: activeThemes[0] ?? null,
      ready,
      previewAt,
      previewDate,
      prefs,
      updatePrefs
    }),
    [activeThemes, ready, previewAt, previewDate, prefs, updatePrefs]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      activeThemes: [],
      primary: null,
      ready: false,
      previewAt: async () => {},
      previewDate: null,
      prefs: { globalDisabled: false, disabledSlugs: [] },
      updatePrefs: async () => {}
    };
  }
  return ctx;
}