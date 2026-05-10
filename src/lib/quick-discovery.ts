/**
 * QuickDiscovery 数据抓取 — server-only
 *
 * 拆离自 QuickDiscovery 组件文件:client component 文件不能 import prisma。
 *
 * 数据源:
 *   - hotTopics: 从最近 30 天的 Post.tags(JSON 数组字符串)聚合,取 TOP-N 高频
 *   - categories: 全部板块按字母序
 *
 * 容错:tags 解析失败/无数据 → 回退到内置词池(避免冷启动空白)
 */
import { prisma } from '@/lib/db';

const FALLBACK_TOPICS = [
  '度夏', '配土', '叶插', '黑腐', '徒长', '上色', '浇水', '换盆',
  '砍头', '播种', '日烧', '冻伤', '介壳虫', '红蜘蛛',
  '老桩', '群生', '锦化', '出状态', '化水', '休眠', '醒水',
  '光照', '通风', '颗粒土', '泥炭', '园艺盆', '陶盆',
];

/**
 * 抓最近 30 天内带 tag 的帖子,统计 tag 频次,返回 TOP-N
 */
async function loadHotTopics(n: number, shuffle: boolean): Promise<string[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 只取 tags 非空的最近帖子;限 1000 条避免大库扫表
  const rows = await prisma.post.findMany({
    where: {
      deleted: false,
      createdAt: { gte: since },
      tags: { not: null },
    },
    select: { tags: true },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const counter = new Map<string, number>();
  for (const r of rows) {
    if (!r.tags) continue;
    try {
      const arr = JSON.parse(r.tags);
      if (!Array.isArray(arr)) continue;
      for (const t of arr) {
        if (typeof t !== 'string') continue;
        const k = t.trim();
        if (!k || k.length > 20) continue;
        counter.set(k, (counter.get(k) || 0) + 1);
      }
    } catch {
      // 单条 tags 格式异常,跳过
    }
  }

  // 频次排序
  let sorted = [...counter.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]);

  // 数据稀疏 → 用内置词池补足
  if (sorted.length < n) {
    const seen = new Set(sorted);
    for (const t of FALLBACK_TOPICS) {
      if (seen.has(t)) continue;
      sorted.push(t);
      if (sorted.length >= n * 2) break;
    }
  }

  if (shuffle) {
    sorted = [...sorted].sort(() => Math.random() - 0.5);
  }

  return sorted.slice(0, n);
}

export async function loadQuickDiscoveryData(opts: { n?: number; shuffle?: boolean } = {}) {
  const n = opts.n ?? 8;
  const shuffle = opts.shuffle ?? false;

  const [topics, categories] = await Promise.all([
    loadHotTopics(n, shuffle).catch(() => FALLBACK_TOPICS.slice(0, n)),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      take: 12,
    }),
  ]);

  return {
    topics,
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
    })),
    // 旧字段保留兼容(下次清理时可删除)
    species: [] as Array<{ id: string; name: string; url: string }>,
  };
}
