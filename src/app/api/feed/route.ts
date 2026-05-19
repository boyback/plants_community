/**
 * GET /api/feed?tab=&cursor=&limit=
 *
 * tab:
 *   - recommend  个性化推荐(登录用 profile + personalize,未登录按 hotScore)
 *   - following  只显示关注的人发的帖(未登录会 401)
 *   - hot        hotScore desc(全站)
 *   - latest     createdAt desc(全站)
 *
 * cursor 用 (score|createdAt) 的字符串拼接;给 infinite scroll。
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { loadUserProfile } from '@/lib/feed/profile';
import { personalize, type PostForRank } from '@/lib/feed/ranker';
import { serializePost } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

const Query = z.object({
  tab: z.enum(['recommend', 'following', 'hot', 'latest']).default('recommend'),
  type: z
    .enum(['rich', 'short', 'vote', 'video', 'event', 'help', 'journal'])
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const GET = handler(async (req) => {
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return fail(400, '参数错误', parsed.error.issues);
  const { tab, type, cursor, limit } = parsed.data;

  const me = await getCurrentUser();

  // -------- 各 tab 的 where --------
  // 公开 feed 仅展示已发布(隐藏 pending/rejected)
  const baseWhere: Record<string, unknown> = {
    deleted: false,
    ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
    ...(type ? { type } : {}),
  };

  if (tab === 'following') {
    if (!me) return fail(401, '请先登录');
    const follows = await prisma.follow.findMany({
      where: { followerId: me.id },
      select: { followeeId: true },
    });
    const ids = follows.map((f) => f.followeeId);
    if (ids.length === 0) {
      return { items: [], nextCursor: null };
    }
    baseWhere.authorId = { in: ids };
  }

  // 查询用户已投票状态
  const userVotedMap = new Map<string, boolean>();
  const userVotedOptionIdsMap = new Map<string, string[]>();
  if (me) {
    const voteRecords = await prisma.voteRecord.findMany({
      where: { userId: me.id },
      select: { voteId: true, optionId: true },
    });
    voteRecords.forEach(r => {
      userVotedMap.set(r.voteId, true);
      if (!userVotedOptionIdsMap.has(r.voteId)) {
        userVotedOptionIdsMap.set(r.voteId, []);
      }
      userVotedOptionIdsMap.get(r.voteId)!.push(r.optionId);
    });
  }

  // -------- 各 tab 的排序 --------
  if (tab === 'latest' || tab === 'following') {
    const decodedCursor = cursor ? decodeLatestCursor(cursor) : null;
    if (decodedCursor) {
      baseWhere.createdAt = { lt: decodedCursor };
    }
    const items = await prisma.post.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: postInclude(),
    });
    const hasMore = items.length > limit;
    const slice = items.slice(0, limit);
    return {
      items: slice.map((p) => {
        const vote = p.vote;
        const voted = vote ? (userVotedMap.get(vote.id) ?? false) : false;
        const votedOptionIds = vote ? (userVotedOptionIdsMap.get(vote.id) ?? []) : [];
        return serializePost(p as any, voted, votedOptionIds);
      }),
      nextCursor: hasMore ? encodeLatestCursor(slice[slice.length - 1].createdAt) : null,
    };
  }

  if (tab === 'hot') {
    const decoded = cursor ? decodeHotCursor(cursor) : null;
    const where: Record<string, unknown> = { ...baseWhere };
    if (decoded) {
      where.OR = [
        { hotScore: { lt: decoded.score } },
        { AND: [{ hotScore: decoded.score }, { id: { lt: decoded.id } }] },
      ];
    }
    const items = await prisma.post.findMany({
      where,
      orderBy: [{ hotScore: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: postInclude(),
    });
    const hasMore = items.length > limit;
    const slice = items.slice(0, limit);
    return {
      items: slice.map((p) => {
        const vote = p.vote;
        const voted = vote ? (userVotedMap.get(vote.id) ?? false) : false;
        const votedOptionIds = vote ? (userVotedOptionIdsMap.get(vote.id) ?? []) : [];
        return serializePost(p as any, voted, votedOptionIds);
      }),
      nextCursor: hasMore
        ? encodeHotCursor({ score: slice[slice.length - 1].hotScore, id: slice[slice.length - 1].id })
        : null,
    };
  }

  // ----- recommend -----
  // 策略:
  //   - 取最近 14 天内 hotScore Top 200
  //   - 如果用户登录,拉 profile 做 personalize,重新排序
  //   - 分页用 offset(推荐池较小,20 条分页足够)
  const page = cursor ? Number(cursor) : 0;
  const now = new Date();
  const since = new Date(now.getTime() - 14 * 86400_000);
  const pool = await prisma.post.findMany({
    where: {
      deleted: false,
      ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
      createdAt: { gte: since },
    },
    orderBy: { hotScore: 'desc' },
    take: 200,
    include: postInclude(),
  });

  let ranked: typeof pool;
  if (me) {
    const profile = await loadUserProfile(me.id);
    ranked = [...pool].sort((a, b) => {
      const pa = personalize(toRankInput(a), profile);
      const pb = personalize(toRankInput(b), profile);
      return pb - pa;
    });
  } else {
    ranked = pool; // 原 hotScore 顺序
  }

  const start = page * limit;
  const slice = ranked.slice(start, start + limit);
  const hasMore = start + limit < ranked.length;
  return {
    items: slice.map((p) => {
      const vote = p.vote;
      const voted = vote ? (userVotedMap.get(vote.id) ?? false) : false;
      const votedOptionIds = vote ? (userVotedOptionIdsMap.get(vote.id) ?? []) : [];
      return serializePost(p as any, voted, votedOptionIds);
    }),
    nextCursor: hasMore ? String(page + 1) : null,
  };
});

function toRankInput(p: {
  id: string;
  authorId: string;
  boardId: string | null;
  genusId: string | null;
  speciesId: string | null;
  hotScore: number;
  createdAt: Date;
}): PostForRank {
  return {
    id: p.id,
    authorId: p.authorId,
    boardId: p.boardId,
    genusId: p.genusId,
    speciesId: p.speciesId,
    hotScore: p.hotScore,
    createdAt: p.createdAt,
  };
}

/* ---- cursor 编解码(简单起见,明文 base64) ---- */
function encodeLatestCursor(d: Date): string {
  return Buffer.from(d.toISOString()).toString('base64url');
}
function decodeLatestCursor(c: string): Date | null {
  try {
    return new Date(Buffer.from(c, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}
function encodeHotCursor(v: { score: number; id: string }): string {
  return Buffer.from(`${v.score}::${v.id}`).toString('base64url');
}
function decodeHotCursor(c: string): { score: number; id: string } | null {
  try {
    const [s, id] = Buffer.from(c, 'base64url').toString('utf-8').split('::');
    return { score: Number(s), id };
  } catch {
    return null;
  }
}
