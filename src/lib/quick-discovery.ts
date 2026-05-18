/**
 * QuickDiscovery 数据抓取 — server-only
 *
 * 拆离自 QuickDiscovery 组件文件:client component 文件不能 import prisma。
 *
 * 数据源:
 *   - species: 按帖子数排序的热门品种
 *   - boards: 全部板块按字母序
 */
import { prisma } from '@/lib/db';

export async function loadQuickDiscoveryData(opts: { n?: number; shuffle?: boolean } = {}) {
  const n = opts.n ?? 12;

  const [species, boards] = await Promise.all([
    prisma.species.findMany({
      include: { genus: { include: { board: true } } },
      orderBy: opts.shuffle
        ? { id: 'asc' }
        : [{ posts: { _count: 'desc' } }, { name: 'asc' }],
      take: opts.shuffle ? n * 5 : n,
    }),
    prisma.board.findMany({
      orderBy: { name: 'asc' },
      take: 12,
    }),
  ]);

  // 过滤掉 board 为 null 的无效数据
  const validSpecies = species.filter((s) => s.genus?.board);

  let pickedSpecies = validSpecies;
  if (opts.shuffle) {
    pickedSpecies = [...validSpecies].sort(() => Math.random() - 0.5).slice(0, n);
  }

  return {
    species: pickedSpecies.map((s) => ({
      id: s.id,
      name: s.name,
      url: `/board/${s.genus.board?.slug ?? ''}/${s.genus.slug}/${s.slug}`,
    })),
    boards: boards.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
    })),
  };
}
