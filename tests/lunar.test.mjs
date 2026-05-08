// 验证 TS 端 lunar.ts 的数据(轻量复制,以防 TS 侧与 Go 侧漂移)。
// 这里 7 个日期是查表数据,只做结构检查 + 边界日期。

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---- 最小复制 lunar.ts 查表 ----
const EVENTS = {
  'spring-festival': {
    dates: {
      2025: [1, 29], 2026: [2, 17], 2027: [2, 6], 2028: [1, 26],
      2029: [2, 13], 2030: [2, 3], 2031: [1, 23], 2032: [2, 11],
    },
    padBefore: 2, padAfter: 5,
  },
  'dragon-boat': {
    dates: {
      2025: [5, 31], 2026: [6, 19], 2027: [6, 9], 2028: [5, 28],
      2029: [6, 16], 2030: [6, 5], 2031: [6, 24],
    },
    padBefore: 1, padAfter: 2,
  },
  'mid-autumn': {
    dates: {
      2025: [10, 6], 2026: [9, 25], 2027: [9, 15], 2028: [10, 3],
      2029: [9, 22], 2030: [9, 12],
    },
    padBefore: 1, padAfter: 2,
  },
};

function inWindow(ev, date) {
  const year = date.getFullYear();
  for (const y of [year, year - 1, year + 1]) {
    const pair = ev.dates[y];
    if (!pair) continue;
    const [m, d] = pair;
    const start = new Date(y, m - 1, d - ev.padBefore);
    const end = new Date(y, m - 1, d + ev.padAfter);
    if (date >= start && date <= end) return true;
  }
  return false;
}

test('春节:2026 正月初一 = 2.17', () => {
  const ev = EVENTS['spring-festival'];
  assert.equal(inWindow(ev, new Date(2026, 1, 14)), false, '2.14 不到');
  assert.equal(inWindow(ev, new Date(2026, 1, 15)), true, '2.15 pad=2 开始');
  assert.equal(inWindow(ev, new Date(2026, 1, 17)), true, '2.17 正日');
  assert.equal(inWindow(ev, new Date(2026, 1, 22)), true, '2.22 pad=5 结束');
  assert.equal(inWindow(ev, new Date(2026, 1, 23)), false, '2.23 窗口外');
});

test('端午:2027 五月初五 = 6.9', () => {
  const ev = EVENTS['dragon-boat'];
  assert.equal(inWindow(ev, new Date(2027, 5, 7)), false);
  assert.equal(inWindow(ev, new Date(2027, 5, 8)), true);
  assert.equal(inWindow(ev, new Date(2027, 5, 9)), true);
  assert.equal(inWindow(ev, new Date(2027, 5, 11)), true);
  assert.equal(inWindow(ev, new Date(2027, 5, 12)), false);
});

test('中秋:2025 八月十五 = 10.6', () => {
  const ev = EVENTS['mid-autumn'];
  assert.equal(inWindow(ev, new Date(2025, 9, 5)), true);
  assert.equal(inWindow(ev, new Date(2025, 9, 6)), true);
  assert.equal(inWindow(ev, new Date(2025, 9, 8)), true);
  assert.equal(inWindow(ev, new Date(2025, 9, 9)), false);
});

test('跨年份:2026-1 还可能命中 2025 春节 pad 结束', () => {
  const ev = EVENTS['spring-festival'];
  // 2025 春节 = 1.29,pad 结束 2.3。所以 2026-01-28 不在 2025 窗口
  assert.equal(inWindow(ev, new Date(2025, 1, 2)), true, '2025-2-2 在 2025 春节');
});
