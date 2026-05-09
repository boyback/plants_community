'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  COLOR_THEMES,
  COLOR_THEME_STORAGE_KEY,
  DEFAULT_COLOR_THEME,
  getThemeMeta,
  isValidColorTheme,
  type ColorThemeKey,
  type ColorThemeMeta,
} from '@/lib/color-theme';

interface Ctx {
  theme: ColorThemeKey;
  meta: ColorThemeMeta;
  setTheme: (k: ColorThemeKey) => void;
  themes: ColorThemeMeta[];
}

const ColorThemeContext = createContext<Ctx | null>(null);

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  // 初始用默认值;mounted 后从 localStorage 读取
  const [theme, setThemeState] = useState<ColorThemeKey>(DEFAULT_COLOR_THEME);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
      if (isValidColorTheme(saved)) {
        setThemeState(saved);
        document.documentElement.setAttribute('data-theme', saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setTheme = useCallback((k: ColorThemeKey) => {
    if (!isValidColorTheme(k)) return;
    setThemeState(k);
    try {
      localStorage.setItem(COLOR_THEME_STORAGE_KEY, k);
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', k);
    }
  }, []);

  return (
    <ColorThemeContext.Provider
      value={{ theme, meta: getThemeMeta(theme), setTheme, themes: COLOR_THEMES }}
    >
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme(): Ctx {
  const ctx = useContext(ColorThemeContext);
  if (!ctx) {
    throw new Error('useColorTheme must be used within ColorThemeProvider');
  }
  return ctx;
}

/**
 * SSR 防闪烁脚本 — 在 <head> 里同步执行,确保首屏 data-theme 正确。
 * 必须放在所有 CSS 之前,以免 light → 用户主题切换时闪一下。
 */
export const COLOR_THEME_SSR_SCRIPT = `
(function() {
  try {
    var v = localStorage.getItem('${COLOR_THEME_STORAGE_KEY}');
    if (v === 'forest' || v === 'sakura' || v === 'ocean' || v === 'vintage') {
      document.documentElement.setAttribute('data-theme', v);
    }
  } catch(e) {}
})();
`.trim();
