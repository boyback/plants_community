/**
 * 站点配色主题(用户主动选择,与节日 themes.ts 是两个系统)。
 *
 * 切换方式:在 <html> 上设置 data-theme,CSS 变量会自动跟着换。
 */

export type ColorThemeKey = 'forest' | 'sakura' | 'ocean' | 'vintage';

export interface ColorThemeMeta {
  key: ColorThemeKey;
  name: string;
  /** 一行描述 */
  desc: string;
  /** Logo 主 emoji(随主题切换) */
  logoEmoji: string;
  /** 主题色快速预览(从 CSS 变量取近似值,用于面板色板) */
  swatch: { primary: string; bg: string };
}

export const COLOR_THEMES: ColorThemeMeta[] = [
  {
    key: 'forest',
    name: '森林绿',
    desc: '清新自然 · 默认主题',
    logoEmoji: '🌿',
    swatch: { primary: '#459c67', bg: '#f7faf5' },
  },
  {
    key: 'sakura',
    name: '樱花粉',
    desc: '柔和浪漫 · 春日氛围',
    logoEmoji: '🌸',
    swatch: { primary: '#e45998', bg: '#fff5f8' },
  },
  {
    key: 'ocean',
    name: '海洋蓝',
    desc: '冷静专业 · 干净通透',
    logoEmoji: '🐋',
    swatch: { primary: '#3186c6', bg: '#f3f9fd' },
  },
  {
    key: 'vintage',
    name: '记忆黄',
    desc: '复古报纸 · 暖意旧时',
    logoEmoji: '📜',
    swatch: { primary: '#a78229', bg: '#fbf5e6' },
  },
];

export const COLOR_THEME_KEYS: ColorThemeKey[] = COLOR_THEMES.map((t) => t.key);

export function isValidColorTheme(v: unknown): v is ColorThemeKey {
  return typeof v === 'string' && COLOR_THEME_KEYS.includes(v as ColorThemeKey);
}

export function getThemeMeta(key: ColorThemeKey): ColorThemeMeta {
  return COLOR_THEMES.find((t) => t.key === key) ?? COLOR_THEMES[0]!;
}

export const COLOR_THEME_STORAGE_KEY = 'rouyou.colorTheme';
export const DEFAULT_COLOR_THEME: ColorThemeKey = 'forest';
