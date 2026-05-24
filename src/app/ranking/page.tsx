import Link from 'next/link';
import { prisma } from '@/lib/db';
import { serializeUser } from '@/lib/serializers';
import { Avatar } from '@/components/ui/Avatar';
import { UserName } from '@/components/ui/UserName';
import type { User } from '@/lib/types';

export const dynamic = 'force-dynamic';

type RankingKind = 'activity' | 'points' | 'posts' | 'comments' | 'level' | 'followers';

type RankingUser = Pick<User, 'id' | 'name' | 'avatar' | 'level' | 'pointsBalance'> & {
  posts: number;
  comments: number;
  followers: number;
};

type RankingRow = {
  rank: number;
  score: number;
  user: RankingUser;
};

const RANKING_TABS: { key: RankingKind; title: string; desc: string; unit: string }[] = [
  { key: 'activity', title: '活跃度排行', desc: '本月活跃度', unit: '活跃度' },
  { key: 'points', title: '积分排行', desc: '按可消费积分余额', unit: '积分' },
  { key: 'posts', title: '发帖排行', desc: '按累计发帖数', unit: '帖' },
  { key: 'comments', title: '评论数排行', desc: '按累计评论数', unit: '评' },
  { key: 'level', title: '等级排行', desc: '按等级和经验排序', unit: '级' },
  { key: 'followers', title: '粉丝排行', desc: '按粉丝数排序', unit: '粉丝' },
];

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeUser(raw: any): RankingUser {
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

function withRanks(rows: { user: RankingUser; score: number }[]): RankingRow[] {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: { kind?: string };
}) {
  const selectedKind = RANKING_TABS.some((tab) => tab.key === searchParams.kind)
    ? (searchParams.kind as RankingKind)
    : 'activity';
  const selected = RANKING_TABS.find((tab) => tab.key === selectedKind)!;
  const ym = monthKey();

  const rows = await loadRankingRows(selectedKind, ym);

  return (
    <main className="mx-auto max-w-[1280px] space-y-6 px-6 py-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-800">排行榜</h1>
          <p className="mt-1 text-sm text-ink-600">
            活跃度、积分、发帖、评论、等级和粉丝榜单。
          </p>
        </div>
        <Link href="/tasks" className="btn-outline !text-xs">
          查看活跃度任务
        </Link>
      </div>

      <nav className="flex gap-2 overflow-x-auto rounded-xl border border-ink-100 bg-white p-2">
        {RANKING_TABS.map((tab) => {
          const active = tab.key === selectedKind;
          return (
            <Link
              key={tab.key}
              href={`/ranking?kind=${tab.key}`}
              className={
                active
                  ? 'shrink-0 rounded-lg bg-ink-800 px-3 py-2 text-xs font-medium text-white'
                  : 'shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-ink-600 hover:bg-ink-50'
              }
            >
              {tab.title}
            </Link>
          );
        })}
      </nav>

      <LeaderboardPoster rows={rows} title={selected.title} desc={selected.desc} unit={selected.unit} ym={ym} />
    </main>
  );
}

async function loadRankingRows(kind: RankingKind, ym: string): Promise<RankingRow[]> {
  if (kind === 'activity') {
    const rows = await prisma.monthlyActivity.findMany({
      where: { yearMonth: ym },
      orderBy: [{ score: 'desc' }, { updatedAt: 'asc' }],
      take: 50,
      include: {
        user: {
          include: {
            _count: { select: { posts: true, comments: true, followers: true, following: true } },
            badges: { include: { badge: true } },
          },
        },
      },
    });
    return withRanks(rows.map((row) => ({ user: normalizeUser(row.user), score: row.score })));
  }

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
    .filter((row) => (kind === 'level' ? row.score > 0 : row.score > 0))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (kind === 'level') return b.user.pointsBalance - a.user.pointsBalance;
      return a.user.name.localeCompare(b.user.name, 'zh-CN');
    })
    .slice(0, 50);

  return withRanks(scored);
}

function LeaderboardPoster({
  rows,
  title,
  desc,
  unit,
  ym,
}: {
  rows: RankingRow[];
  title: string;
  desc: string;
  unit: string;
  ym: string;
}) {
  const first = rows.find((row) => row.rank === 1);
  const second = rows.find((row) => row.rank === 2);
  const third = rows.find((row) => row.rank === 3);
  const rest = rows.slice(3);

  return (
    <section className="overflow-hidden rounded-xl border border-leaf-100 bg-white">
      <div className="bg-[linear-gradient(135deg,#f8faf7_0%,#eef7ec_48%,#fff7ed_100%)] px-4 pb-4 pt-3 md:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-leaf-700">Community Ranking</div>
            <div className="mt-0.5 text-xl font-bold text-ink-800">{title}</div>
            <div className="mt-1 text-xs text-ink-500">{desc}</div>
          </div>
          <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-ink-600 ring-1 ring-leaf-100">
            {ym}
          </div>
        </div>

        <div className="grid min-h-[270px] grid-cols-3 items-end gap-2 md:gap-4">
          <PodiumUser row={second} place="2" height="h-28 md:h-36" tone="bg-ink-100 text-ink-700" unit={unit} />
          <PodiumUser row={first} place="1" height="h-44 md:h-56" tone="bg-amber-100 text-amber-800" unit={unit} primary />
          <PodiumUser row={third} place="3" height="h-24 md:h-32" tone="bg-leaf-100 text-leaf-800" unit={unit} />
        </div>
      </div>

      <div className="bg-white px-4 py-4 md:px-6">
        <div className="mb-2 flex items-center justify-between text-[11px] text-ink-500">
          <span>后续排名</span>
          <span>{unit}</span>
        </div>
        {rest.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {rest.map((row) => (
              <Link
                key={row.user.id}
                href={`/user/${row.user.id}`}
                className="flex min-w-0 items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 hover:bg-leaf-50"
              >
                <span className="w-7 shrink-0 text-center text-xs font-semibold text-ink-500">{row.rank}</span>
                <Avatar src={row.user.avatar} alt={row.user.name} size={30} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-800">{row.user.name}</span>
                <span className="shrink-0 text-xs font-semibold text-leaf-700">
                  {row.score} {unit}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-ink-50 px-3 py-8 text-center text-sm text-ink-500">
            暂无更多上榜用户
          </div>
        )}
      </div>
    </section>
  );
}

function PodiumUser({
  row,
  place,
  height,
  tone,
  unit,
  primary,
}: {
  row?: RankingRow;
  place: '1' | '2' | '3';
  height: string;
  tone: string;
  unit: string;
  primary?: boolean;
}) {
  if (!row) {
    return (
      <div className="flex flex-col items-center">
        <div className={`${height} flex w-full items-end justify-center rounded-t-xl bg-white/60`}>
          <span className="pb-4 text-sm text-ink-400">未上榜</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className="relative mb-3">
        <div
          className={`absolute -top-2 left-1/2 z-10 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full text-xs font-bold shadow-sm ${tone}`}
        >
          {place}
        </div>
        <Avatar
          src={row.user.avatar}
          alt={row.user.name}
          size={primary ? 68 : 56}
          ring
          className="mt-4"
        />
      </div>
      <UserName user={row.user} asLink size="sm" className="mb-1 max-w-full justify-center truncate text-center" />
      <div className="mb-2 text-xs font-semibold text-leaf-700">
        {row.score} {unit}
      </div>
      <div className={`${height} flex w-full items-end justify-center rounded-t-xl ${tone}`}>
        <span className={primary ? 'pb-5 text-4xl font-black' : 'pb-4 text-3xl font-black'}>{place}</span>
      </div>
    </div>
  );
}
