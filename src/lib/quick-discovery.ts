/**
 * QuickDiscovery 数据抓取 — server-only
 *
 * 拆离自 QuickDiscovery 组件文件:client component 文件不能 import prisma。
 *
 * 数据源:
 *   - species: 按帖子数排序的热门品种
 *   - categories: 全部板块按字母序
 */
import { prisma } from '@/lib/db';

export async function loadQuickDiscoveryData(opts: { n?: number; shuffle?: boolean } = {}) {
  const n = opts.n ?? 12;

  const [species, categories] = await Promise.all([
    prisma.species.findMany({
      include: { genus: { include: { category: true } } },
      orderBy: opts.shuffle
        ? { id: 'asc' }
        : [{ posts: { _count: 'desc' } }, { name: 'asc' }],
      take: opts.shuffle ? n * 5 : n,
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      take: 12,
    }),
  ]);

  let pickedSpecies = species;
  if (opts.shuffle) {
    pickedSpecies = [...species].sort(() => Math.random() - 0.5).slice(0, n);
  }

  return {
    species: pickedSpecies.map((s) => ({
      id: s.id,
      name: s.name,
      url: `/board/${s.genus.category.slug}/${s.genus.slug}/${s.slug}`,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
    })),
  };
}
