#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const force = args.has('--force');
const publicDir = path.join(process.cwd(), 'public');
const concurrency = Number(readArg('--concurrency') ?? 4);
const keyPrefix = normalizePrefix(readArg('--prefix') ?? '');

const accessKey = process.env.QINIU_ACCESS_KEY;
const secretKey = process.env.QINIU_SECRET_KEY;
const bucket = process.env.QINIU_BUCKET;
const domain = normalizeDomain(process.env.QINIU_DOMAIN);
const region = process.env.QINIU_REGION ?? 'z0';

if (!accessKey || !secretKey || !bucket || !domain) {
  console.error('缺少七牛配置: QINIU_ACCESS_KEY / QINIU_SECRET_KEY / QINIU_BUCKET / QINIU_DOMAIN');
  process.exit(1);
}

const files = await listFiles(publicDir);
if (!files.length) {
  console.log('public 目录下没有可上传文件');
  process.exit(0);
}

const items = files.map((filePath) => {
  const rel = normalizeKey(path.relative(publicDir, filePath));
  const key = keyPrefix ? `${keyPrefix}/${rel}` : rel;
  return {
    filePath,
    rel,
    key,
    url: `${domain}/${encodeURI(key).replace(/%2F/g, '/')}`,
  };
});

console.log(`准备上传 ${items.length} 个文件到七牛 bucket=${bucket}`);
console.log(`CDN 域名: ${domain}`);
if (keyPrefix) console.log(`Key 前缀: ${keyPrefix}`);

if (dryRun) {
  for (const item of items) {
    console.log(`${item.rel} -> ${item.url}`);
  }
  console.log('dry-run 完成,未上传任何文件');
  process.exit(0);
}

const qiniuModule = await import('qiniu');
const qiniu = qiniuModule.default ?? qiniuModule;
const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
const config = new qiniu.conf.Config({
  zone: regionZone(qiniu, region),
});
const formUploader = new qiniu.form_up.FormUploader(config);
let uploaded = 0;
let failed = 0;

await runPool(items, Math.max(1, concurrency), async (item) => {
  try {
    await uploadOne({ qiniu, mac, formUploader, item });
    uploaded += 1;
    console.log(`✓ ${item.rel} -> ${item.url}`);
  } catch (error) {
    failed += 1;
    console.error(`✗ ${item.rel}`);
    console.error(error instanceof Error ? error.message : error);
  }
});

console.log(`上传完成: 成功 ${uploaded}, 失败 ${failed}`);
if (failed > 0) process.exit(1);

async function uploadOne({ qiniu, mac, formUploader, item }) {
  const policy = new qiniu.rs.PutPolicy({
    scope: force ? `${bucket}:${item.key}` : bucket,
    insertOnly: force ? 0 : 1,
  });
  const token = policy.uploadToken(mac);
  const putExtra = new qiniu.form_up.PutExtra();
  putExtra.mimeType = mimeTypeForKey(item.key);

  await new Promise((resolve, reject) => {
    formUploader.putFile(token, item.key, item.filePath, putExtra, (err, body, info) => {
      if (err) {
        reject(err);
        return;
      }
      if (info.statusCode >= 200 && info.statusCode < 300) {
        resolve(body);
        return;
      }
      if (info.statusCode === 614 && !force) {
        reject(new Error(`七牛对象已存在: ${item.key}。如需覆盖,请加 --force`));
        return;
      }
      reject(new Error(`七牛上传失败: status=${info.statusCode}, body=${JSON.stringify(body)}`));
    });
  });
}

function mimeTypeForKey(key) {
  const ext = path.extname(key).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml; charset=utf-8';
    case '.ico':
      return 'image/x-icon';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...await listFiles(fullPath));
    } else if (entry.isFile()) {
      result.push(fullPath);
    }
  }
  return result.sort();
}

async function runPool(items, limit, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) await worker(item);
    }
  });
  await Promise.all(runners);
}

function readArg(name) {
  const exact = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (exact) return exact.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizeKey(value) {
  return value.split(path.sep).join('/').replace(/^\/+/, '');
}

function normalizePrefix(value) {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

function normalizeDomain(value) {
  return value?.trim().replace(/\/+$/g, '');
}

function regionZone(qiniu, value) {
  switch (value) {
    case 'z1':
      return qiniu.zone.Zone_z1;
    case 'z2':
      return qiniu.zone.Zone_z2;
    case 'na0':
      return qiniu.zone.Zone_na0;
    case 'as0':
      return qiniu.zone.Zone_as0;
    case 'z0':
    default:
      return qiniu.zone.Zone_z0;
  }
}
