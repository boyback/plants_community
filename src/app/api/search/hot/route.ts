/**
 * GET /api/search/hot
 *
 * 返回搜索热词,给 Header 搜索框下拉建议用。
 *
 * 数据源(优先级):
 *   1. 帖子数 top 12 的品种名(动态)
 *   2. 核心养护长尾词(写死)
 *
 * 返回:{ hot: [{ q: '胧月', count?: 12 }, ...] }
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const FALLBACK_TOPICS = [
  '度夏', '配土', '叶插', '黑腐', '徒长', '上色', '浇水', '换盆',
];

export async function GET() {
  try {
    const top = await prisma.species.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
      take: 8,
    });

    const fromSpecies = top.map((s) => ({
      q: s.name,
      kind: 'species' as const,
      count: s._count.posts,
    }));

    const fromTopics = FALLBACK_TOPICS.map((q) => ({
      q,
      kind: 'topic' as const,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        hot: [...fromSpecies, ...fromTopics],
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: true, data: { hot: FALLBACK_TOPICS.map((q) => ({ q, kind: 'topic' as const })) } },
    );
  }
}
