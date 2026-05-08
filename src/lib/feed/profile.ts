/**
 * 拉取用户画像(profile),给 personalize() 用。
 *
 * 注意:这是个 hot path,做了几层缓存:
 *   - 进程内 Map 缓存,30 秒 TTL
 *   - followingSet / followedBoardIds 来自 DB,categoryAffinity 来自最近 PostView/PostLike 聚合
 */

import { prisma } from '../db';
import { softmax, type UserProfile } from './ranker';

interface CacheEntry {
  profile: UserProfile;
  at: number;
}
const cache = new Map<string, CacheEntry>();
const TTL_MS = 30_000;

export async function loadUserProfile(userId: string): Promise<UserProfile> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.profile;

  const [follows, boardFollows, recentInteractions] = await Promise.all([
    // followee 列表
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { followeeId: true },
    }),
    // 关注的板块(Category 级别我们存了 categorySlug 等,这里取 targetId)
    prisma.boardFollow.findMany({
      where: { userId },
      select: { targetId: true },
    }),
    // 最近 30 天浏览 + 点赞(用作 categoryAffinity 信号)
    prisma.postView.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 30 * 86400_000) },
      },
      take: 500,
      select: { post: { select: { categoryId: true } } },
    }),
  ]);

  const followingSet = new Set(follows.map((f) => f.followeeId));
  const followedBoardIds = new Set(boardFollows.map((b) => b.targetId));

  const counts = new Map<string, number>();
  for (const v of recentInteractions) {
    const cid = v.post?.categoryId;
    if (!cid) continue;
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }
  const categoryAffinity = softmax(counts);

  const profile: UserProfile = {
    userId,
    followingSet,
    followedBoardIds,
    categoryAffinity,
  };
  cache.set(userId, { profile, at: Date.now() });
  return profile;
}

/** 主动失效(关注/取关后用) */
export function invalidateProfile(userId: string): void {
  cache.delete(userId);
}
