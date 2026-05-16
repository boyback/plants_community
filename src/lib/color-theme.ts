/**
 * 站点配色主题(用户主动选择,与节日 themes.ts 是两个系统)。
 *
 * 切换方式:
 *   <html data-theme="forest" data-mode="light"> 控制 CSS 变量
 *   data-mode 在 dark 时另外加上 html.dark(便于以后写 dark: 选择器)
 */

export type ColorThemeKey =
  | 'forest'
  | 'sakura'
  | 'ocean'
  | 'dopamine-purple'
  | 'beach'
  | 'lavender';

export type ColorThemeMode = 'light' | 'dark';

export interface ColorThemeMeta {
  key: ColorThemeKey;
  name: string;
  /** 一行描述 */
  desc: string;
  /** Logo 主 emoji(随主题切换) */
  logoEmoji: string;
  /** 主题色快速预览(从 CSS 变量取近似值,用于面板色板) */
  swatch: { primary: string; bg: string };
  /** 适合谁 */
  vibe: string;
}

export const COLOR_THEMES: ColorThemeMeta[] = [
  {
    key: 'forest',
    name: '森林绿',
    desc: '清新自然 · 默认',
    logoEmoji: '🌿',
    swatch: { primary: '#459c67', bg: '#f7faf5' },
    vibe: '自然系',
  },
  {
    key: 'sakura',
    name: '樱花粉',
    desc: '柔和浪漫',
    logoEmoji: '🌸',
    swatch: { primary: '#e45998', bg: '#fff5f8' },
    vibe: '少女心',
  },
  {
    key: 'ocean',
    name: '海洋蓝',
    desc: '冷静通透',
    logoEmoji: '🌊',
    swatch: { primary: '#3186c6', bg: '#f3f9fd' },
    vibe: '专业',
  },
  {
    key: 'dopamine-purple',
    name: '多巴胺紫',
    desc: '魔幻 · 仙气',
    logoEmoji: '💜',
    swatch: { primary: '#9333ea', bg: '#faf5ff' },
    vibe: '少女 · 二次元',
  },
  {
    key: 'beach',
    name: '海滩蓝',
    desc: '夏日限定',
    logoEmoji: '🏖️',
    swatch: { primary: '#06b6d4', bg: '#f0fcff' },
    vibe: '夏季 · 通透',
  },
  {
    key: 'lavender',
    name: '薰衣草',
    desc: '柔和紫调 · 治愈',
    logoEmoji: '💜',
    swatch: { primary: '#8b5cf6', bg: '#f5f3ff' },
    vibe: '柔和 · 治愈系',
  },
];

export const COLOR_THEME_KEYS: ColorThemeKey[] = COLOR_THEMES.map((t) => t.key);

export function isValidColorTheme(v: unknown): v is ColorThemeKey {
  return typeof v === 'string' && COLOR_THEME_KEYS.includes(v as ColorThemeKey);
}

export function isValidMode(v: unknown): v is ColorThemeMode {
  return v === 'light' || v === 'dark';
}

export function getThemeMeta(key: ColorThemeKey): ColorThemeMeta {
  return COLOR_THEMES.find((t) => t.key === key) ?? COLOR_THEMES[0]!;
}

export const COLOR_THEME_STORAGE_KEY = 'rouyou.colorTheme';
export const COLOR_THEME_MODE_STORAGE_KEY = 'rouyou.colorMode';
export const DEFAULT_COLOR_THEME: ColorThemeKey = 'ocean';
export const DEFAULT_COLOR_MODE: ColorThemeMode = 'light';
