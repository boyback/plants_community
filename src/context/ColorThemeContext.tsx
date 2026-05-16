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
  COLOR_THEME_MODE_STORAGE_KEY,
  DEFAULT_COLOR_THEME,
  DEFAULT_COLOR_MODE,
  getThemeMeta,
  isValidColorTheme,
  isValidMode,
  type ColorThemeKey,
  type ColorThemeMeta,
  type ColorThemeMode,
} from '@/lib/color-theme';

interface Ctx {
  theme: ColorThemeKey;
  mode: ColorThemeMode;
  meta: ColorThemeMeta;
  setTheme: (k: ColorThemeKey) => void;
  setMode: (m: ColorThemeMode) => void;
  toggleMode: () => void;
  themes: ColorThemeMeta[];
}

const ColorThemeContext = createContext<Ctx | null>(null);

function applyToDOM(theme: ColorThemeKey, mode: ColorThemeMode) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.setAttribute('data-theme', theme);
  html.setAttribute('data-mode', mode);
  if (mode === 'dark') html.classList.add('dark');
  else html.classList.remove('dark');
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ColorThemeKey>(DEFAULT_COLOR_THEME);
  const [mode, setModeState] = useState<ColorThemeMode>(DEFAULT_COLOR_MODE);

  // mount 后从 localStorage 读取并应用
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedTheme = localStorage.getItem(COLOR_THEME_STORAGE_KEY);
      const savedMode = localStorage.getItem(COLOR_THEME_MODE_STORAGE_KEY);
      const t = isValidColorTheme(savedTheme) ? savedTheme : DEFAULT_COLOR_THEME;
      const m = isValidMode(savedMode) ? savedMode : DEFAULT_COLOR_MODE;
      setThemeState(t);
      setModeState(m);
      applyToDOM(t, m);
    } catch {
      // ignore
    }
  }, []);

  const setTheme = useCallback(
    (k: ColorThemeKey) => {
      if (!isValidColorTheme(k)) return;
      setThemeState(k);
      try {
        localStorage.setItem(COLOR_THEME_STORAGE_KEY, k);
      } catch {
        // ignore
      }
      applyToDOM(k, mode);
    },
    [mode]
  );

  const setMode = useCallback(
    (m: ColorThemeMode) => {
      if (!isValidMode(m)) return;
      setModeState(m);
      try {
        localStorage.setItem(COLOR_THEME_MODE_STORAGE_KEY, m);
      } catch {
        // ignore
      }
      applyToDOM(theme, m);
    },
    [theme]
  );

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  return (
    <ColorThemeContext.Provider
      value={{
        theme,
        mode,
        meta: getThemeMeta(theme),
        setTheme,
        setMode,
        toggleMode,
        themes: COLOR_THEMES,
      }}
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
 * SSR 防闪烁脚本 — 在 <head> 里同步执行,确保首屏 data-theme/data-mode 正确。
 */
export const COLOR_THEME_SSR_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('${COLOR_THEME_STORAGE_KEY}');
    var m = localStorage.getItem('${COLOR_THEME_MODE_STORAGE_KEY}');
    var validThemes = ['ocean','forest','vintage','dopamine-red','dopamine-purple','latte','matcha','cybermist','rosegold','sapphire','beach','lavender','cream','neon','minimal','forest-green','terracotta','mint','amethyst'];
    if (validThemes.indexOf(t) >= 0) {
      document.documentElement.setAttribute('data-theme', t);
    }
    if (m === 'dark' || m === 'light') {
      document.documentElement.setAttribute('data-mode', m);
      if (m === 'dark') document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`.trim();
