// 验证翻译文件完整性:
//   - 每个 locale 下必须存在全部 namespaces
//   - 每个 namespace 在所有 locale 中的 key 集合应一致(检查翻译丢失)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko'];
const NAMESPACES = [
  'common',
  'nav',
  'auth',
  'settings',
  'post',
  'theme',
  'cookie',
  'editor',
  'market',
  'auction',
  'detail',
];

const base = join(process.cwd(), 'src/i18n/messages');

function flatten(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

test('所有 locale + namespace 文件都存在', () => {
  for (const loc of LOCALES) {
    for (const ns of NAMESPACES) {
      const file = join(base, loc, `${ns}.json`);
      assert.equal(
        existsSync(file),
        true,
        `missing file: ${loc}/${ns}.json`,
      );
    }
  }
});

test('每个 namespace 所有 locale 的 key 集合完全一致', () => {
  for (const ns of NAMESPACES) {
    const keysByLoc = {};
    for (const loc of LOCALES) {
      const file = join(base, loc, `${ns}.json`);
      const obj = JSON.parse(readFileSync(file, 'utf-8'));
      keysByLoc[loc] = new Set(flatten(obj));
    }
    // 以 zh-CN 为基准
    const reference = keysByLoc['zh-CN'];
    for (const loc of LOCALES) {
      if (loc === 'zh-CN') continue;
      const cur = keysByLoc[loc];
      const missing = [...reference].filter((k) => !cur.has(k));
      const extra = [...cur].filter((k) => !reference.has(k));
      assert.equal(
        missing.length,
        0,
        `${loc}/${ns}.json missing keys: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' …' : ''}`,
      );
      assert.equal(
        extra.length,
        0,
        `${loc}/${ns}.json extra keys: ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? ' …' : ''}`,
      );
    }
  }
});

test('不应有空字符串翻译', () => {
  for (const loc of LOCALES) {
    for (const ns of NAMESPACES) {
      const file = join(base, loc, `${ns}.json`);
      const obj = JSON.parse(readFileSync(file, 'utf-8'));
      const flat = flatten(obj);
      for (const path of flat) {
        const segs = path.split('.');
        let cur = obj;
        for (const s of segs) cur = cur[s];
        assert.notEqual(cur, '', `${loc}/${ns}.json: empty value at ${path}`);
      }
    }
  }
});
