#!/usr/bin/env node
/**
 * 定时刷 Post.hotScore — 默认每 10 分钟跑一次。
 *
 * 用法:
 *   node -r dotenv/config scripts/feed-refresh.mjs
 *   crontab:
 *     0,10,20,30,40,50 * * * * cd /path/to/proj && node -r dotenv/config scripts/feed-refresh.mjs
 *
 * 当前实现:
 *   - 计算近 14 天发布的所有未删除帖子(老贴影响小,跳过节约时间)
 *   - 每帖按公式重算 hotScore
 *   - 批量 update(分批 200 个,避免大事务)
 */

import { PrismaClient } from '@prisma/client';

function computeHotScore({ likes, comments, collects, shares, views, createdAt, authorVip, hasCover }, now = new Date()) {
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

const prisma = new PrismaClient();

const since = new Date(Date.now() - 14 * 86400_000);
const t0 = Date.now();

const posts = await prisma.post.findMany({
  where: { deleted: false, createdAt: { gte: since } },
  select: {
    id: true,
    cover: true,
    createdAt: true,
    views: true,
    shares: true,
    author: { select: { vipExpireAt: true, vipLifetime: true } },
    _count: { select: { likes: true, comments: true, collects: true } },
  },
});

console.log(`刷分:${posts.length} 个 14 天内的帖子`);

const now = new Date();
const updates = posts.map((p) => {
  const authorVip =
    p.author.vipLifetime ||
    (p.author.vipExpireAt && new Date(p.author.vipExpireAt).getTime() > Date.now());
  return {
    id: p.id,
    score: computeHotScore({
      likes: p._count.likes,
      comments: p._count.comments,
      collects: p._count.collects,
      shares: p.shares,
      views: p.views,
      createdAt: p.createdAt,
      authorVip: !!authorVip,
      hasCover: !!p.cover,
    }, now),
  };
});

const BATCH = 200;
for (let i = 0; i < updates.length; i += BATCH) {
  const slice = updates.slice(i, i + BATCH);
  await prisma.$transaction(
    slice.map((u) =>
      prisma.post.update({
        where: { id: u.id },
        data: { hotScore: u.score },
      })
    )
  );
  process.stdout.write(`\r${Math.min(i + BATCH, updates.length)} / ${updates.length}`);
}
console.log();

const top5 = [...updates].sort((a, b) => b.score - a.score).slice(0, 5);
console.log('Top 5:');
for (const t of top5) console.log(`  ${t.score.toFixed(4)}  ${t.id}`);

console.log(`\n✅ 完成,耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
process.exit(0);
