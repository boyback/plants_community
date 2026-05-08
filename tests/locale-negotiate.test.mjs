// 验证 negotiateLocale 的精神一致性。
// 由于 config.ts 是 TS,这里用纯 JS 复制最小等效实现跑一遍。

import { test } from 'node:test';
import assert from 'node:assert/strict';

const locales = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko'];
const defaultLocale = 'zh-CN';

function negotiate(input) {
  if (!input) return defaultLocale;
  const direct = locales.find((l) => l === input);
  if (direct) return direct;
  const firstTag = (input.split(',')[0] ?? '').trim().split(';')[0]?.trim().toLowerCase() ?? '';
  for (const l of locales) {
    if (firstTag === l.toLowerCase()) return l;
  }
  if (firstTag.startsWith('zh')) {
    if (firstTag.includes('tw') || firstTag.includes('hk') || firstTag.includes('hant')) return 'zh-TW';
    return 'zh-CN';
  }
  if (firstTag.startsWith('ja')) return 'ja';
  if (firstTag.startsWith('ko')) return 'ko';
  if (firstTag.startsWith('en')) return 'en';
  return defaultLocale;
}

test('精确匹配', () => {
  assert.equal(negotiate('zh-CN'), 'zh-CN');
  assert.equal(negotiate('zh-TW'), 'zh-TW');
  assert.equal(negotiate('ja'), 'ja');
});

test('Accept-Language 首段优先', () => {
  // 之前的 bug:会命中 en
  assert.equal(negotiate('ko-KR,ko;q=0.9,en;q=0.8'), 'ko');
  assert.equal(negotiate('ja,en;q=0.5'), 'ja');
});

test('zh 区域变体', () => {
  assert.equal(negotiate('zh-HK'), 'zh-TW');
  assert.equal(negotiate('zh-Hant-TW'), 'zh-TW');
  assert.equal(negotiate('zh'), 'zh-CN');
});

test('未支持语言回退到默认', () => {
  assert.equal(negotiate('fr-FR'), 'zh-CN');
  assert.equal(negotiate(''), 'zh-CN');
  assert.equal(negotiate(null), 'zh-CN');
  assert.equal(negotiate(undefined), 'zh-CN');
});
