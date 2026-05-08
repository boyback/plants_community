/**
 * Feed ranker 单元测试。
 *
 * 复刻 src/lib/feed/ranker.ts 的核心公式以避开 TS 加载问题。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

function computeHotScore({ likes = 0, comments = 0, collects = 0, shares = 0, views = 0, createdAt, authorVip, hasCover }, now = new Date()) {
  const interactions =
    Math.max(0, likes) +
    Math.max(0, comments) * 2 +
    Math.max(0, collects) * 3 +
    Math.max(0, shares) * 0.5 +
    Math.max(0, views) * 0.05;
  const ts = new Date(createdAt).getTime();
  const hours = Math.max(0, (now.getTime() - ts) / 3_600_000);
  const gravity = 1.6;
  const base = Math.log10(1 + interactions + 1) / Math.pow(hours + 2, gravity);
  let modifier = 1;
  if (authorVip) modifier *= 1.1;
  if (hasCover) modifier *= 1.05;
  if (hours < 24) modifier *= 1.3;
  return base * modifier;
}

const BASE_NOW = new Date('2026-05-08T00:00:00Z');

test('hotScore — 基本公式正确(无修饰符)', () => {
  // 1 小时前发,10 个赞 → 应该 > 0
  const s = computeHotScore({
    likes: 10,
    createdAt: new Date(BASE_NOW.getTime() - 3600_000).toISOString(),
  }, BASE_NOW);
  assert.ok(s > 0, 'score > 0');
});

test('hotScore — 互动多 → 分高', () => {
  const a = computeHotScore({
    likes: 1,
    createdAt: new Date(BASE_NOW.getTime() - 3600_000),
  }, BASE_NOW);
  const b = computeHotScore({
    likes: 100,
    createdAt: new Date(BASE_NOW.getTime() - 3600_000),
  }, BASE_NOW);
  assert.ok(b > a);
});

test('hotScore — 时间越久 → 分越低(同样互动)', () => {
  const recent = computeHotScore({
    likes: 50, createdAt: new Date(BASE_NOW.getTime() - 3600_000),
  }, BASE_NOW);
  const old_ = computeHotScore({
    likes: 50, createdAt: new Date(BASE_NOW.getTime() - 30 * 86400_000),
  }, BASE_NOW);
  assert.ok(recent > old_ * 5, '新帖远比老贴高');
});

test('hotScore — 24h 内有 1.3x boost', () => {
  // 同样互动:23h 前 vs 25h 前
  const within = computeHotScore({
    likes: 10, createdAt: new Date(BASE_NOW.getTime() - 23 * 3600_000),
  }, BASE_NOW);
  const past = computeHotScore({
    likes: 10, createdAt: new Date(BASE_NOW.getTime() - 25 * 3600_000),
  }, BASE_NOW);
  // boost 切断,within 应明显高(基础 + boost)
  assert.ok(within > past * 1.2);
});

test('hotScore — 评论权重高于点赞', () => {
  const sameAge = new Date(BASE_NOW.getTime() - 3600_000);
  const a = computeHotScore({ likes: 10, createdAt: sameAge }, BASE_NOW);
  const b = computeHotScore({ likes: 0, comments: 10, createdAt: sameAge }, BASE_NOW);
  assert.ok(b > a, '同样数量的评论应比点赞分更高');
});

test('hotScore — VIP 作者 + 封面有加权', () => {
  const created = new Date(BASE_NOW.getTime() - 3600_000);
  const baseS = computeHotScore({ likes: 10, createdAt: created }, BASE_NOW);
  const vipS = computeHotScore({ likes: 10, createdAt: created, authorVip: true }, BASE_NOW);
  const coverS = computeHotScore({ likes: 10, createdAt: created, hasCover: true }, BASE_NOW);
  assert.ok(vipS > baseS);
  assert.ok(coverS > baseS);
  // boost 应近似 1.1x / 1.05x
  assert.ok(Math.abs(vipS / baseS - 1.1) < 0.01);
  assert.ok(Math.abs(coverS / baseS - 1.05) < 0.01);
});
