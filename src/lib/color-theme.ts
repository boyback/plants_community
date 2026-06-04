/**
 * 站点配色主题(用户主动选择,与节日 themes.ts 是两个系统)。
 *
 * 切换方式:
 *   <html data-theme="forest" data-mode="light"> 控制 CSS 变量
 *   data-mode 在 dark 时另外加上 html.dark(便于以后写 dark: 选择器)
 *
 * 注意:所有 data-theme 值必须与 globals.css 中定义的 CSS 主题名严格一致。
 */

export type ColorThemeKey =
  | 'plantnet'
  | 'ocean'
  | 'forest'
  | 'vintage'
  | 'dopamine-red'
  | 'dopamine-purple'
  | 'latte'
  | 'matcha'
  | 'cybermist'
  | 'rosegold'
  | 'sapphire'
  | 'beach'
  | 'lavender'
  | 'cream'
  | 'neon'
  | 'minimal'
  | 'forest-green'
  | 'terracotta'
  | 'mint'
  | 'amethyst';

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
    key: 'plantnet',
    name: 'PlantNet 绿',
    desc: '清爽自然 · 默认',
    logoEmoji: '🌿',
    swatch: { primary: '#4f8b43', bg: '#f7f8f5' },
    vibe: '自然',
  },
  {
    key: 'ocean',
    name: '海洋蓝',
    desc: '冷静通透 · 默认',
    logoEmoji: '🌊',
    swatch: { primary: '#3186c6', bg: '#f0f8fe' },
    vibe: '专业',
  },
  {
    key: 'forest',
    name: '樱花粉',
    desc: '柔和浪漫',
    logoEmoji: '🌸',
    swatch: { primary: '#e45998', bg: '#fef4f8' },
    vibe: '少女心',
  },
  {
    key: 'vintage',
    name: '复古金',
    desc: '怀旧温暖',
    logoEmoji: '📜',
    swatch: { primary: '#a78229', bg: '#fcf8eb' },
    vibe: '复古',
  },
  {
    key: 'dopamine-red',
    name: '多巴胺红',
    desc: '热情活力',
    logoEmoji: '❤️',
    swatch: { primary: '#ef4444', bg: '#fff4f0' },
    vibe: '热情',
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
    desc: '温暖醇厚',
    logoEmoji: '☕',
    swatch: { primary: '#a16b3f', bg: '#faf5ed' },
    vibe: '温暖',
  },
  {
    key: 'matcha',
    name: '抹茶绿',
    desc: '清新治愈',
    logoEmoji: '🍵',
    swatch: { primary: '#7d9a4a', bg: '#f7faea' },
    vibe: '清新',
  },
  {
    key: 'cybermist',
    name: '赛博薄雾',
    desc: '科技神秘',
    logoEmoji: '🌐',
    swatch: { primary: '#a855f7', bg: '#f5f0ff' },
    vibe: '科技',
  },
  {
    key: 'rosegold',
    name: '玫瑰金',
    desc: '轻奢雅致',
    logoEmoji: '🥀',
    swatch: { primary: '#b8860b', bg: '#fcf7e8' },
    vibe: '轻奢',
  },
  {
    key: 'sapphire',
    name: '蓝宝石',
    desc: '深邃沉稳',
    logoEmoji: '💎',
    swatch: { primary: '#405fd5', bg: '#f0f5ff' },
    vibe: '沉稳',
  },
  {
    key: 'beach',
    name: '海滩蓝',
    desc: '夏日限定',
    logoEmoji: '🏖️',
    swatch: { primary: '#06b6d4', bg: '#ecfcff' },
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
  {
    key: 'cream',
    name: '奶油黄',
    desc: '温暖柔和',
    logoEmoji: '🧈',
    swatch: { primary: '#d97706', bg: '#fffbeb' },
    vibe: '温暖',
  },
  {
    key: 'neon',
    name: '霓虹绿',
    desc: '暗夜赛博',
    logoEmoji: '💚',
    swatch: { primary: '#06ff06', bg: '#0a0f0a' },
    vibe: '暗色 · 赛博',
  },
  {
    key: 'minimal',
    name: '极简灰',
    desc: '去色 · 专注内容',
    logoEmoji: '⬜',
    swatch: { primary: '#737373', bg: '#fafafa' },
    vibe: '极简',
  },
  {
    key: 'forest-green',
    name: '森系自然',
    desc: '墨绿 · 沉稳自然',
    logoEmoji: '🌲',
    swatch: { primary: '#2d7a4f', bg: '#f2f6f0' },
    vibe: '自然系',
  },
  {
    key: 'terracotta',
    name: '暖阳多肉',
    desc: '赤陶 · 温暖活力',
    logoEmoji: '🏺',
    swatch: { primary: '#c27a5c', bg: '#f8f4ef' },
    vibe: '温暖系',
  },
  {
    key: 'mint',
    name: '极简清冷',
    desc: '薄荷 · 清爽现代',
    logoEmoji: '🌿',
    swatch: { primary: '#2d9b85', bg: '#f2f8f6' },
    vibe: '清新系',
  },
  {
    key: 'amethyst',
    name: '暮光紫韵',
    desc: '紫晶 · 独特优雅',
    logoEmoji: '💎',
    swatch: { primary: '#8b6fa8', bg: '#f7f5fa' },
    vibe: '优雅系',
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
export const DEFAULT_COLOR_THEME: ColorThemeKey = 'plantnet';
export const DEFAULT_COLOR_MODE: ColorThemeMode = 'light';
