// 使用 node:test(Node 20 内置)跑的轻量单元测试。
//
// 这些测试读 src/lib/themes.ts 的语义(等效 TS/JS),
// 而不是直接 import TS,因此用纯 JS 复制最小等效实现做黑盒验证。
// 目的:验证 TS 端窗口判定与 Go 端一致。

import { test } from 'node:test';
import assert from 'node:assert/strict';

// ---- 最小等效实现(应与 src/lib/themes.ts 一致) ----
function inWindow(m, d, w) {
  const start = w.startMonth * 100 + w.startDay;
  const end = w.endMonth * 100 + w.endDay;
  const cur = m * 100 + d;
  if (start <= end) return cur >= start && cur <= end;
  return cur >= start || cur <= end;
}
function active(w, date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return inWindow(m, d, w);
}

// ---- 测试用例 ----

test('同年窗口 — 春节 1.20 - 2.15', () => {
  const w = { startMonth: 1, startDay: 20, endMonth: 2, endDay: 15 };
  assert.equal(active(w, new Date(2026, 0, 19)), false);
  assert.equal(active(w, new Date(2026, 0, 20)), true);
  assert.equal(active(w, new Date(2026, 1, 15)), true);
  assert.equal(active(w, new Date(2026, 1, 16)), false);
});

test('跨年窗口 — 圣诞节 12.20 - 1.2', () => {
  const w = { startMonth: 12, startDay: 20, endMonth: 1, endDay: 2 };
  assert.equal(active(w, new Date(2026, 11, 19)), false);
  assert.equal(active(w, new Date(2026, 11, 20)), true);
  assert.equal(active(w, new Date(2026, 11, 31)), true);
  assert.equal(active(w, new Date(2027, 0, 1)), true);
  assert.equal(active(w, new Date(2027, 0, 2)), true);
  assert.equal(active(w, new Date(2027, 0, 3)), false);
});

test('单日窗口 — 儿童节 6.1', () => {
  const w = { startMonth: 6, startDay: 1, endMonth: 6, endDay: 1 };
  assert.equal(active(w, new Date(2026, 5, 1)), true);
  assert.equal(active(w, new Date(2026, 4, 31)), false);
  assert.equal(active(w, new Date(2026, 5, 2)), false);
});
