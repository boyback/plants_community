import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { serializeUser } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

type RankingKind = 'points' | 'posts' | 'comments' | 'level' | 'followers';

const KINDS = new Set<RankingKind>([
  'points',
  'posts',
  'comments',
  'level',
  'followers',
]);

const META: Record<RankingKind, { title: string; desc: string; unit: string }> = {
  points: { title: '钻石排行', desc: '按可消费钻石余额', unit: '钻石' },
  posts: { title: '发帖排行', desc: '按累计发帖数', unit: '帖' },
  comments: { title: '评论数排行', desc: '按累计评论数', unit: '评' },
  level: { title: '等级排行', desc: '按等级和经验排序', unit: '级' },
  followers: { title: '粉丝排行', desc: '按粉丝数排序', unit: '粉丝' },
};

function normalizeUser(raw: any) {
  const user = serializeUser(raw);
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    level: user.level,
    pointsBalance: user.pointsBalance,
    posts: user.posts,
    comments: raw._count?.comments ?? 0,
    followers: user.followers,
  };
}

function withRanks(rows: { user: ReturnType<typeof normalizeUser>; score: number }[]) {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const requested = url.searchParams.get('kind') as RankingKind | null;
  const kind = requested && KINDS.has(requested) ? requested : 'points';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 100);

  const rows = await loadRankingRows(kind, limit);

  return {
    kind,
    ...META[kind],
    items: rows,
  };
});

async function loadRankingRows(kind: RankingKind, limit: number) {
  const orderBy =
    kind === 'points'
      ? [{ pointsBalance: 'desc' as const }, { updatedAt: 'desc' as const }]
      : kind === 'level'
      ? [{ level: 'desc' as const }, { exp: 'desc' as const }]
      : [{ updatedAt: 'desc' as const }];

  const users = await prisma.user.findMany({
    take: 200,
    orderBy,
    include: {
      _count: { select: { posts: true, comments: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });

  const scored = users
    .map((user) => {
      const normalized = normalizeUser(user);
      const score =
        kind === 'points'
          ? normalized.pointsBalance
          : kind === 'posts'
          ? normalized.posts
          : kind === 'comments'
          ? normalized.comments
          : kind === 'level'
          ? normalized.level
          : normalized.followers;
      return { user: normalized, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (kind === 'level') return b.user.pointsBalance - a.user.pointsBalance;
      return a.user.name.localeCompare(b.user.name, 'zh-CN');
    })
    .slice(0, limit);

  return withRanks(scored);
}
