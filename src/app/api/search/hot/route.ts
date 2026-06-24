/**
 * GET /api/search/hot
 *
 * 返回搜索热词,给 Header 搜索框下拉建议用。
 *
 * 数据源:
 *   1. 帖子数靠前的品种名(动态候选)
 *   2. 核心养护长尾词(固定候选)
 * 最终按去重参与人数 count 倒序返回。
 *
 * 返回:{ hot: [{ q: '胧月', count?: 12, participants?: [...] }, ...] }
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';
import { jsonWithUserPendants } from '@/lib/api';

export const dynamic = 'force-dynamic';

const FALLBACK_TOPICS = [
  '度夏', '配土', '叶插', '黑腐', '徒长', '上色', '浇水', '换盆',
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shuffle = url.searchParams.get('shuffle') === '1';
  const publishedWhere = {
    deleted: false,
    ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' as const } : {}),
  };

  try {
    // shuffle=1 时扩大候选池,但最终仍按参与人数排行。
    const pool = await prisma.species.findMany({
      include: {
        _count: { select: { posts: true } },
      },
      orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
      take: shuffle ? 30 : 16,
    });

    const speciesPicked = pool;

    // 获取每个品种的参与用户
    const fromSpecies = await Promise.all(
      speciesPicked.map(async (s) => {
        const stats = await loadParticipantStats({
          ...publishedWhere,
          speciesId: s.id,
        });

        // 如果 count 为 0，不查询用户信息
        if (stats.count === 0) {
          return {
            q: s.name,
            kind: 'species' as const,
            count: 0,
          };
        }

        return {
          q: s.name,
          kind: 'species' as const,
          count: stats.count,
          participants: stats.participants.length > 0 ? stats.participants : undefined,
        };
      })
    );

    const fromTopics = await Promise.all(
      FALLBACK_TOPICS.map(async (q) => {
        const stats = await loadParticipantStats({
          ...publishedWhere,
          OR: [
            { tags: { contains: `"${q}"` } },
            { title: { contains: q } },
            { content: { contains: q } },
          ],
        });

        return {
          q,
          kind: 'topic' as const,
          count: stats.count,
          participants: stats.participants.length > 0 ? stats.participants : undefined,
        };
      })
    );

    const hot = [...fromSpecies, ...fromTopics]
      .sort((a, b) => {
        if ((b.count ?? 0) !== (a.count ?? 0)) return (b.count ?? 0) - (a.count ?? 0);
        return a.q.localeCompare(b.q, 'zh-Hans-CN');
      })
      .slice(0, shuffle ? 16 : 8);

    return jsonWithUserPendants({
      ok: true,
      data: {
        hot,
      },
    });
  } catch (err) {
    console.error('Hot search API error:', err);
    return NextResponse.json({
      ok: true,
      data: { hot: FALLBACK_TOPICS.map((q) => ({ q, kind: 'topic' as const })) },
    });
  }
}

async function loadParticipantStats(where: any) {
  const [allParticipants, recentPosts] = await Promise.all([
    prisma.post.findMany({
      where,
      distinct: ['authorId'],
      select: { authorId: true },
    }),
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            equipPendantId: true,
          },
        },
      },
    }),
  ]);

  const seen = new Set<string>();
  const participants = recentPosts
    .map((p) => p.author)
    .filter((author) => {
      if (seen.has(author.id)) return false;
      seen.add(author.id);
      return true;
    })
    .slice(0, 3);

  return {
    count: allParticipants.length,
    participants,
  };
}
