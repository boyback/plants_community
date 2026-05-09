/**
 * 板块「动态封面」工具:
 *   - 给 Category / Genus 计算 topPhotoUrl(子节点下投票最高的现场照)
 *   - 注入到 serializer 输入,让前端展示热门照而非 admin 静态 cover
 */
import { prisma } from './db';

/** 给一组 Category 算出每个的 topPhotoUrl */
export async function pickCategoryTopPhotos(
  categoryIds: string[]
): Promise<Map<string, string | null>> {
  if (categoryIds.length === 0) return new Map();

  // 一次查询拿到这些 category 下票数最高的 approved + pinned 优先
  // 用 raw SQL 比较快;这里用 prisma 查所有再 reduce(数据量不大)
  const photos = await prisma.speciesPhoto.findMany({
    where: {
      status: 'approved',
      species: { genus: { categoryId: { in: categoryIds } } },
    },
    select: {
      url: true,
      pinned: true,
      votes: true,
      createdAt: true,
      species: { select: { genus: { select: { categoryId: true } } } },
    },
  });

  const winners = new Map<string, { url: string; pinned: boolean; votes: number; at: number }>();
  for (const p of photos) {
    const cid = p.species.genus.categoryId;
    if (!cid) continue;
    const cur = winners.get(cid);
    const score = (p.pinned ? 1_000_000 : 0) + p.votes;
    const at = p.createdAt.getTime();
    if (
      !cur ||
      score > (cur.pinned ? 1_000_000 : 0) + cur.votes ||
      (score === (cur.pinned ? 1_000_000 : 0) + cur.votes && at > cur.at)
    ) {
      winners.set(cid, { url: p.url, pinned: p.pinned, votes: p.votes, at });
    }
  }

  const out = new Map<string, string | null>();
  for (const cid of categoryIds) {
    out.set(cid, winners.get(cid)?.url ?? null);
  }
  return out;
}

/** 给一组 Genus 算出每个的 topPhotoUrl */
export async function pickGenusTopPhotos(
  genusIds: string[]
): Promise<Map<string, string | null>> {
  if (genusIds.length === 0) return new Map();
  const photos = await prisma.speciesPhoto.findMany({
    where: {
      status: 'approved',
      species: { genusId: { in: genusIds } },
    },
    select: {
      url: true,
      pinned: true,
      votes: true,
      createdAt: true,
      species: { select: { genusId: true } },
    },
  });
  const winners = new Map<string, { url: string; pinned: boolean; votes: number; at: number }>();
  for (const p of photos) {
    const gid = p.species.genusId;
    const cur = winners.get(gid);
    const score = (p.pinned ? 1_000_000 : 0) + p.votes;
    const at = p.createdAt.getTime();
    if (
      !cur ||
      score > (cur.pinned ? 1_000_000 : 0) + cur.votes ||
      (score === (cur.pinned ? 1_000_000 : 0) + cur.votes && at > cur.at)
    ) {
      winners.set(gid, { url: p.url, pinned: p.pinned, votes: p.votes, at });
    }
  }
  const out = new Map<string, string | null>();
  for (const gid of genusIds) out.set(gid, winners.get(gid)?.url ?? null);
  return out;
}

/**
 * Species 级别用 prisma include 直接拿(更快)
 * 注意:不能用 `as const`,Prisma 类型要求 mutable 数组
 */
export const speciesTopPhotoInclude = {
  photos: {
    where: { status: 'approved' as const },
    orderBy: [
      { pinned: 'desc' as const },
      { votes: 'desc' as const },
      { createdAt: 'desc' as const },
    ],
    take: 1,
    select: { url: true },
  },
};
