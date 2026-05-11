/**
 * 话题排行榜聚合逻辑。
 *
 * 从 Post.tags(JSON 数组) 中统计每个 tag 的帖子数、热度分、近期活跃度，
 * 全量写入 TopicRanking 表。由 POST /api/admin/topics/refresh 触发。
 */
import { prisma } from './db';
import { parseJsonArray } from './api';

interface TagAccumulator {
  postCount: number;
  hotScoreSum: number;
  recent30dCount: number;
  firstSeenAt: Date;
  lastPostAt: Date;
}

/**
 * 全量刷新话题排行榜。返回聚合的话题数量。
 */
export async function refreshTopicRankings(): Promise<number> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 取所有非删除帖子的 tags + hotScore + createdAt
  const posts = await prisma.post.findMany({
    where: { deleted: false },
    select: {
      tags: true,
      hotScore: true,
      createdAt: true,
    },
  });

  // 内存聚合
  const map = new Map<string, TagAccumulator>();

  for (const post of posts) {
    const tags = parseJsonArray(post.tags);
    for (const tag of tags) {
      const key = tag.trim().toLowerCase();
      if (!key) continue;

      let acc = map.get(key);
      if (!acc) {
        acc = {
          postCount: 0,
          hotScoreSum: 0,
          recent30dCount: 0,
          firstSeenAt: post.createdAt,
          lastPostAt: post.createdAt,
        };
        map.set(key, acc);
      }

      acc.postCount++;
      acc.hotScoreSum += post.hotScore;
      if (post.createdAt >= thirtyDaysAgo) {
        acc.recent30dCount++;
      }
      if (post.createdAt < acc.firstSeenAt) {
        acc.firstSeenAt = post.createdAt;
      }
      if (post.createdAt > acc.lastPostAt) {
        acc.lastPostAt = post.createdAt;
      }
    }
  }

  // 全量重建
  await prisma.topicRanking.deleteMany();

  const rows = Array.from(map.entries()).map(([tag, acc]) => ({
    tag,
    postCount: acc.postCount,
    hotScoreSum: acc.hotScoreSum,
    recent30dCount: acc.recent30dCount,
    firstSeenAt: acc.firstSeenAt,
    lastPostAt: acc.lastPostAt,
  }));

  if (rows.length > 0) {
    await prisma.topicRanking.createMany({ data: rows });
  }

  return rows.length;
}
