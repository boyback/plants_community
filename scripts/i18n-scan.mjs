#!/usr/bin/env node
/**
 * 扫描 src/ 里的中文硬编码,辅助 i18n 迁移。
 *
 * 用法:
 *   node scripts/i18n-scan.mjs                  # 列出全部
 *   node scripts/i18n-scan.mjs --top 20         # 仅 top 20
 *   node scripts/i18n-scan.mjs --file foo.tsx   # 单文件
 *
 * 策略:
 *   - 扫所有 *.tsx / *.ts 文件
 *   - 忽略 src/i18n/messages/ (那些本来就是翻译源)
 *   - 忽略 src/app/{terms,privacy,cookies}/ (法务页按 locale 分文件,已有条目化)
 *   - 忽略行内注释(// 后面的中文) 和 /** 块注释
 *   - 规则:任何 tsx 文件里非注释、非字符串-like-key 的 CJK 字符都算"可能硬编码"
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
const IGNORE_DIRS = [
  'src/i18n/messages',
  'src/app/terms',
  'src/app/privacy',
  'src/app/cookies',
];
const TARGET_EXT = new Set(['.tsx', '.ts']);

const args = process.argv.slice(2);
const top = args.includes('--top') ? Number(args[args.indexOf('--top') + 1]) : 0;
const onlyFile = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (IGNORE_DIRS.some((x) => full.startsWith(x))) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (TARGET_EXT.has(path.extname(full))) out.push(full);
  }
  return out;
}

/** 删除单行注释、块注释、TS 类型字符串字面量里的 CJK,以免误报 */
function strip(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')   // 块注释
    .replace(/^\s*\/\/.*$/gm, '')        // 行注释(整行)
    .replace(/\/\/[^\n]*/g, '');          // 行尾注释
}

const CJK = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7a3]/;

function scan(file) {
  const src = fs.readFileSync(file, 'utf-8');
  const stripped = strip(src);
  const hits = [];
  stripped.split('\n').forEach((line, i) => {
    if (!CJK.test(line)) return;
    // 忽略 t('...') 中文参数里的内容(这是翻译,合理)
    // 只抓出原样显示在 UI 的文案
    // 我们先宽松,把所有命中都列出来,由人工判断
    hits.push({ line: i + 1, text: line.trim().slice(0, 120) });
  });
  return hits;
}

// 主流程
let files = walk(ROOT);
if (onlyFile) files = files.filter((f) => f.includes(onlyFile));

const ranking = files
  .map((f) => ({ file: f, hits: scan(f) }))
  .filter((r) => r.hits.length > 0)
  .sort((a, b) => b.hits.length - a.hits.length);

const totalHits = ranking.reduce((s, r) => s + r.hits.length, 0);
console.log(`\n扫描完成:${files.length} 个文件,${ranking.length} 个文件含中文硬编码,合计 ${totalHits} 处\n`);

const show = top > 0 ? ranking.slice(0, top) : ranking;
for (const { file, hits } of show) {
  console.log(`\x1b[36m${file}\x1b[0m  (${hits.length} 处)`);
  for (const h of hits.slice(0, 6)) {
    console.log(`  \x1b[90mL${String(h.line).padStart(4)}\x1b[0m  ${h.text}`);
  }
  if (hits.length > 6) console.log(`  \x1b[90m... 还有 ${hits.length - 6} 处\x1b[0m`);
}

// 摘要:按目录聚合
console.log('\n=== 按目录聚合 ===');
const byDir = {};
for (const r of ranking) {
  const topDir = r.file.split('/').slice(0, 3).join('/');
  byDir[topDir] = (byDir[topDir] ?? 0) + r.hits.length;
}
Object.entries(byDir)
  .sort((a, b) => b[1] - a[1])
  .forEach(([d, n]) => console.log(`  ${n.toString().padStart(4)}  ${d}`));
