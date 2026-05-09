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
  | 'vintage'
  | 'dopamine-red'
  | 'dopamine-purple'
  | 'latte'
  | 'matcha'
  | 'cybermist'
  | 'rosegold'
  | 'sapphire'
  | 'beach';

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
    logoEmoji: '🐋',
    swatch: { primary: '#3186c6', bg: '#f3f9fd' },
    vibe: '专业',
  },
  {
    key: 'vintage',
    name: '记忆黄',
    desc: '复古报纸',
    logoEmoji: '📜',
    swatch: { primary: '#a78229', bg: '#fbf5e6' },
    vibe: '怀旧',
  },
  {
    key: 'dopamine-red',
    name: '多巴胺红',
    desc: '热烈 · 充满能量',
    logoEmoji: '🔥',
    swatch: { primary: '#ef4444', bg: '#fff7f5' },
    vibe: '年轻 · 游戏向',
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
    key: 'latte',
    name: '拿铁棕',
    desc: '咖啡调 · 暖意',
    logoEmoji: '☕',
    swatch: { primary: '#a16b3f', bg: '#faf5ed' },
    vibe: '中年 · 阅读',
  },
  {
    key: 'matcha',
    name: '抹茶酱',
    desc: '低调 · 静',
    logoEmoji: '🍵',
    swatch: { primary: '#7d9a4a', bg: '#f6f8ed' },
    vibe: '静心 · 文艺',
  },
  {
    key: 'cybermist',
    name: '冷雾纱',
    desc: '赛博朋克',
    logoEmoji: '⚡',
    swatch: { primary: '#a855f7', bg: '#0d0e1c' },
    vibe: 'Z 世代 · 鬼才',
  },
  {
    key: 'rosegold',
    name: '玫瑰金',
    desc: '黑金 · 高贵',
    logoEmoji: '⚜️',
    swatch: { primary: '#b8860b', bg: '#1a1410' },
    vibe: '商务 · VIP',
  },
  {
    key: 'sapphire',
    name: '蓝莉金刚',
    desc: '宝石调 · 鲜艳',
    logoEmoji: '💎',
    swatch: { primary: '#1e40af', bg: '#f0f5ff' },
    vibe: '高阶鲜颜',
  },
  {
    key: 'beach',
    name: '海滩蓝',
    desc: '夏日限定',
    logoEmoji: '🏖️',
    swatch: { primary: '#06b6d4', bg: '#f0fcff' },
    vibe: '夏季 · 通透',
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
export const DEFAULT_COLOR_THEME: ColorThemeKey = 'forest';
export const DEFAULT_COLOR_MODE: ColorThemeMode = 'light';
