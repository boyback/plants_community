/**
 * 节日主题配置 — 与 server-go/internal/themes/themes.go 基本一致。
 *
 * 窗口规则:
 *   - 普通节日:单一公历窗口(startMonth/startDay → endMonth/endDay)
 *     跨年(12.20 → 1.2)通过两个窗口分段表达。
 *   - 农历节日:`slug` 命中 LUNAR_EVENTS 时优先走 isInLunarWindow(按年查表),
 *     没命中再退回声明的公历窗口。
 */

import { isInLunarWindow, LUNAR_EVENTS } from './lunar';

const LUNAR_SLUGS = new Set(LUNAR_EVENTS.map((e) => e.slug));

export interface ThemeWindow {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

export interface ThemeDecoration {
  accentFrom: string;
  accentTo: string;
  logoBadge: string;
  avatarBadge: string;
  bannerTextKey: string;
  particleEmoji: string;
  particleCount: number;
}

export interface Theme {
  slug: string;
  name: string;
  category: 'cn-festival' | 'intl-festival' | 'commemorative';
  windows: ThemeWindow[];
  decoration: ThemeDecoration;
}

export const THEME_REGISTRY: Theme[] = [
  {
    slug: 'spring-festival', name: '春节', category: 'cn-festival',
    windows: [{ startMonth: 1, startDay: 20, endMonth: 2, endDay: 15 }, { startMonth: 2, startDay: 1, endMonth: 2, endDay: 10 }],
    decoration: { accentFrom: '#ff4d4f', accentTo: '#ffbf3c', logoBadge: '🏮', avatarBadge: '🧧', bannerTextKey: 'theme.springFestival.banner', particleEmoji: '🧨', particleCount: 8 },
  },
  {
    slug: 'lantern', name: '灯会', category: 'cn-festival',
    windows: [{ startMonth: 2, startDay: 14, endMonth: 2, endDay: 16 }],
    decoration: { accentFrom: '#ff7875', accentTo: '#ffc53d', logoBadge: '🏮', avatarBadge: '🌕', bannerTextKey: 'theme.lantern.banner', particleEmoji: '🏮', particleCount: 10 },
  },
  {
    slug: 'valentine', name: '情人节 · 520', category: 'intl-festival',
    windows: [
      { startMonth: 2, startDay: 13, endMonth: 2, endDay: 15 },
      { startMonth: 5, startDay: 19, endMonth: 5, endDay: 21 },
      { startMonth: 8, startDay: 6, endMonth: 8, endDay: 8 },
    ],
    decoration: { accentFrom: '#ff85c0', accentTo: '#ff4d4f', logoBadge: '💝', avatarBadge: '❤️', bannerTextKey: 'theme.valentine.banner', particleEmoji: '💗', particleCount: 8 },
  },
  {
    slug: 'womens-day', name: '女神节', category: 'intl-festival',
    windows: [{ startMonth: 3, startDay: 7, endMonth: 3, endDay: 8 }],
    decoration: { accentFrom: '#eb2f96', accentTo: '#ff85c0', logoBadge: '🌷', avatarBadge: '🌹', bannerTextKey: 'theme.womensDay.banner', particleEmoji: '🌸', particleCount: 8 },
  },
  {
    slug: 'arbor-day', name: '植树节', category: 'commemorative',
    windows: [{ startMonth: 3, startDay: 10, endMonth: 3, endDay: 13 }],
    decoration: { accentFrom: '#73d13d', accentTo: '#237804', logoBadge: '🌲', avatarBadge: '🌱', bannerTextKey: 'theme.arborDay.banner', particleEmoji: '🍃', particleCount: 8 },
  },
  {
    slug: 'earth-day', name: '世界地球日', category: 'commemorative',
    windows: [{ startMonth: 4, startDay: 20, endMonth: 4, endDay: 23 }],
    decoration: { accentFrom: '#1677ff', accentTo: '#52c41a', logoBadge: '🌍', avatarBadge: '🌿', bannerTextKey: 'theme.earthDay.banner', particleEmoji: '🌿', particleCount: 8 },
  },
  {
    slug: 'community-birthday', name: '社区生日', category: 'commemorative',
    windows: [{ startMonth: 5, startDay: 1, endMonth: 5, endDay: 3 }],
    decoration: { accentFrom: '#eb2f96', accentTo: '#faad14', logoBadge: '🎉', avatarBadge: '🎂', bannerTextKey: 'theme.communityBirthday.banner', particleEmoji: '🎊', particleCount: 12 },
  },
  {
    slug: 'childrens-day', name: '儿童节', category: 'intl-festival',
    windows: [{ startMonth: 6, startDay: 1, endMonth: 6, endDay: 1 }],
    decoration: { accentFrom: '#69c0ff', accentTo: '#ffd666', logoBadge: '🎈', avatarBadge: '🧸', bannerTextKey: 'theme.childrensDay.banner', particleEmoji: '🎈', particleCount: 10 },
  },
  {
    slug: 'dragon-boat', name: '端午节', category: 'cn-festival',
    windows: [{ startMonth: 6, startDay: 3, endMonth: 6, endDay: 9 }],
    decoration: { accentFrom: '#52c41a', accentTo: '#faad14', logoBadge: '🐉', avatarBadge: '🍃', bannerTextKey: 'theme.dragonBoat.banner', particleEmoji: '🍃', particleCount: 6 },
  },
  {
    slug: 'mid-autumn', name: '中秋节', category: 'cn-festival',
    windows: [{ startMonth: 9, startDay: 13, endMonth: 9, endDay: 18 }],
    decoration: { accentFrom: '#faad14', accentTo: '#b37feb', logoBadge: '🌕', avatarBadge: '🐰', bannerTextKey: 'theme.midAutumn.banner', particleEmoji: '🌙', particleCount: 6 },
  },
  {
    slug: 'national-day', name: '国庆节', category: 'cn-festival',
    windows: [{ startMonth: 10, startDay: 1, endMonth: 10, endDay: 7 }],
    decoration: { accentFrom: '#f5222d', accentTo: '#ffd666', logoBadge: '🇨🇳', avatarBadge: '⭐', bannerTextKey: 'theme.nationalDay.banner', particleEmoji: '⭐', particleCount: 10 },
  },
  {
    slug: 'halloween', name: '万圣节', category: 'intl-festival',
    windows: [{ startMonth: 10, startDay: 25, endMonth: 11, endDay: 2 }],
    decoration: { accentFrom: '#faad14', accentTo: '#722ed1', logoBadge: '🎃', avatarBadge: '👻', bannerTextKey: 'theme.halloween.banner', particleEmoji: '🦇', particleCount: 8 },
  },
  {
    slug: 'christmas', name: '圣诞新年', category: 'intl-festival',
    windows: [{ startMonth: 12, startDay: 20, endMonth: 12, endDay: 31 }, { startMonth: 1, startDay: 1, endMonth: 1, endDay: 2 }],
    decoration: { accentFrom: '#ff4d4f', accentTo: '#52c41a', logoBadge: '🎄', avatarBadge: '🎅', bannerTextKey: 'theme.christmas.banner', particleEmoji: '❄️', particleCount: 12 },
  },
];

function inWindow(m: number, d: number, w: ThemeWindow): boolean {
  const start = w.startMonth * 100 + w.startDay;
  const end = w.endMonth * 100 + w.endDay;
  const cur = m * 100 + d;
  if (start <= end) return cur >= start && cur <= end;
  // 跨年窗口
  return cur >= start || cur <= end;
}

export function themeActiveAt(slug: string, at: Date): boolean {
  if (LUNAR_SLUGS.has(slug)) return isInLunarWindow(slug, at);
  const th = THEME_REGISTRY.find((t) => t.slug === slug);
  if (!th) return false;
  const m = at.getMonth() + 1;
  const d = at.getDate();
  return th.windows.some((w) => inWindow(m, d, w));
}

export function activeThemesAt(at: Date): Theme[] {
  const m = at.getMonth() + 1;
  const d = at.getDate();
  return THEME_REGISTRY.filter((th) => {
    if (LUNAR_SLUGS.has(th.slug)) return isInLunarWindow(th.slug, at);
    return th.windows.some((w) => inWindow(m, d, w));
  });
}
