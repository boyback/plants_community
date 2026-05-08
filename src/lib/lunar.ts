/**
 * 最小化农历节日日期表(2025-2035),覆盖:
 *   - 春节(正月初一)
 *   - 元宵/灯会(正月十五)
 *   - 端午(五月初五)
 *   - 中秋(八月十五)
 *   - 七夕(七月初七)
 *
 * 数据源:查表人工维护,比引一个 chinese-lunar-calendar 包轻 20KB。
 * 年份超出范围时回退到使用 fallbackMonth/fallbackDay 的公历估算。
 */

export interface LunarEvent {
  slug: string;
  // key: 'YYYY-MM-DD' 格式的公历日期
  dates: Record<number, [number, number]>;
  fallback: [number, number]; // 未覆盖年份的公历 fallback(m, d)
  // 前后宽容天数 = 节日往前/往后各铺几天装饰
  padBefore: number;
  padAfter: number;
}

// 2025-2035 农历主要节日对应的公历日期
export const LUNAR_EVENTS: LunarEvent[] = [
  {
    slug: 'spring-festival',
    // 春节:正月初一
    dates: {
      2025: [1, 29],
      2026: [2, 17],
      2027: [2, 6],
      2028: [1, 26],
      2029: [2, 13],
      2030: [2, 3],
      2031: [1, 23],
      2032: [2, 11],
      2033: [1, 31],
      2034: [2, 19],
      2035: [2, 8],
    },
    fallback: [2, 1],
    padBefore: 2,
    padAfter: 5,
  },
  {
    slug: 'lantern',
    // 元宵节:正月十五
    dates: {
      2025: [2, 12],
      2026: [3, 3],
      2027: [2, 20],
      2028: [2, 9],
      2029: [2, 27],
      2030: [2, 17],
      2031: [2, 6],
      2032: [2, 25],
      2033: [2, 14],
      2034: [3, 5],
      2035: [2, 22],
    },
    fallback: [2, 15],
    padBefore: 0,
    padAfter: 1,
  },
  {
    slug: 'dragon-boat',
    // 端午节:五月初五
    dates: {
      2025: [5, 31],
      2026: [6, 19],
      2027: [6, 9],
      2028: [5, 28],
      2029: [6, 16],
      2030: [6, 5],
      2031: [6, 24],
      2032: [6, 12],
      2033: [6, 1],
      2034: [6, 20],
      2035: [6, 10],
    },
    fallback: [6, 5],
    padBefore: 1,
    padAfter: 2,
  },
  {
    slug: 'mid-autumn',
    // 中秋节:八月十五
    dates: {
      2025: [10, 6],
      2026: [9, 25],
      2027: [9, 15],
      2028: [10, 3],
      2029: [9, 22],
      2030: [9, 12],
      2031: [10, 1],
      2032: [9, 19],
      2033: [9, 8],
      2034: [9, 27],
      2035: [9, 17],
    },
    fallback: [9, 15],
    padBefore: 1,
    padAfter: 2,
  },
  {
    slug: 'qixi',
    // 七夕:七月初七
    dates: {
      2025: [8, 29],
      2026: [8, 19],
      2027: [8, 8],
      2028: [8, 26],
      2029: [8, 16],
      2030: [8, 5],
      2031: [8, 24],
      2032: [8, 12],
      2033: [8, 1],
      2034: [8, 20],
      2035: [8, 10],
    },
    fallback: [8, 7],
    padBefore: 1,
    padAfter: 1,
  },
];

/** 算出某个年份下农历节日实际的公历窗口 [startDate, endDate] */
export function lunarWindow(ev: LunarEvent, year: number): [Date, Date] {
  const [m, d] = ev.dates[year] ?? ev.fallback;
  const center = new Date(year, m - 1, d);
  const start = new Date(year, m - 1, d - ev.padBefore);
  const end = new Date(year, m - 1, d + ev.padAfter);
  return [start, end];
}

/** 某日期是否处在农历 slug 的节日窗口里(跨月边界会自然处理) */
export function isInLunarWindow(slug: string, date: Date): boolean {
  const ev = LUNAR_EVENTS.find((e) => e.slug === slug);
  if (!ev) return false;
  const year = date.getFullYear();
  // 检查当年和上一年(跨年元旦节日之类极少)
  for (const y of [year, year - 1, year + 1]) {
    const [start, end] = lunarWindow(ev, y);
    if (date >= start && date <= end) return true;
  }
  return false;
}
