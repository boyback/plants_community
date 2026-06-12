import Link from 'next/link';
import { prisma } from '@/lib/db';
import { serializeUser } from '@/lib/serializers';
import { Avatar } from '@/components/ui/Avatar';
import { UserName } from '@/components/ui/UserName';
import type { User } from '@/lib/types';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

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

const RANKING_TABS: {key: RankingKind;title: string;desc: string;unit: string;}[] = [
{ key: 'activity', title: '活跃度排行', desc: '本月活跃度', unit: '活跃度' },
{ key: 'points', title: '积分排行', desc: '按可消费积分余额', unit: '积分' },
{ key: 'posts', title: '发帖排行', desc: '按累计发帖数', unit: '帖' },
{ key: 'comments', title: '评论数排行', desc: '按累计评论数', unit: '评' },
{ key: 'level', title: '等级排行', desc: '按等级和经验排序', unit: '级' },
{ key: 'followers', title: '粉丝排行', desc: '按粉丝数排序', unit: '粉丝' }];


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
    followers: user.followers
  };
}

function withRanks(rows: {user: RankingUser;score: number;}[]): RankingRow[] {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export default async function RankingPage({
  searchParams


}: {searchParams: {kind?: string;};}) {
  const selectedKind = RANKING_TABS.some((tab) => tab.key === searchParams.kind) ?
  searchParams.kind as RankingKind :
  'activity';
  const selected = RANKING_TABS.find((tab) => tab.key === selectedKind)!;
  const ym = monthKey();

  const rows = await loadRankingRows(selectedKind, ym);

  return (
    <main className={cx(styles.r_0e12dc7d, styles.r_da310242, styles.r_b3542e05, styles.r_f92d0236, styles.r_940911bf, styles.r_6aeb2e95)}>
      <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_6f27f4f7, styles.r_8ef2268e, styles.r_1004c0c3)}>
        <div>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)}>排行榜</h1>
          <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_02eb621e)}>
            活跃度、积分、发帖、评论、等级和粉丝榜单。
          </p>
        </div>
        <Link href="/tasks" className={styles.r_dd702538}>
          查看活跃度任务
        </Link>
      </div>

      <nav className={cx(styles.r_60fbb771, styles.r_77a2a20e, styles.r_1384f66f, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_7660b450)}>
        {RANKING_TABS.map((tab) => {
          const active = tab.key === selectedKind;
          return (
            <Link
              key={tab.key}
              href={`/ranking?kind=${tab.key}`}
              className={
              active ? cx(styles.r_012fbd12, styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_2689f395, styles.r_72a4c7cd) : cx(styles.r_012fbd12, styles.r_5f22e64f, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_2689f395, styles.r_02eb621e, styles.r_5399e21f)


              }>

              {tab.title}
            </Link>);

        })}
      </nav>

      <LeaderboardPoster rows={rows} title={selected.title} desc={selected.desc} unit={selected.unit} ym={ym} />
    </main>);

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
            badges: { include: { badge: true } }
          }
        }
      }
    });
    return withRanks(rows.map((row) => ({ user: normalizeUser(row.user), score: row.score })));
  }

  const orderBy =
  kind === 'points' ?
  [{ pointsBalance: 'desc' as const }, { updatedAt: 'desc' as const }] :
  kind === 'level' ?
  [{ level: 'desc' as const }, { exp: 'desc' as const }] :
  [{ updatedAt: 'desc' as const }];

  const users = await prisma.user.findMany({
    take: 200,
    orderBy,
    include: {
      _count: { select: { posts: true, comments: true, followers: true, following: true } },
      badges: { include: { badge: true } }
    }
  });

  const scored = users.
  map((user) => {
    const normalized = normalizeUser(user);
    const score =
    kind === 'points' ?
    normalized.pointsBalance :
    kind === 'posts' ?
    normalized.posts :
    kind === 'comments' ?
    normalized.comments :
    kind === 'level' ?
    normalized.level :
    normalized.followers;
    return { user: normalized, score };
  }).
  filter((row) => kind === 'level' ? row.score > 0 : row.score > 0).
  sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (kind === 'level') return b.user.pointsBalance - a.user.pointsBalance;
    return a.user.name.localeCompare(b.user.name, "zh-CN");
  }).
  slice(0, 50);

  return withRanks(scored);
}

function LeaderboardPoster({
  rows,
  title,
  desc,
  unit,
  ym






}: {rows: RankingRow[];title: string;desc: string;unit: string;ym: string;}) {
  const first = rows.find((row) => row.rank === 1);
  const second = rows.find((row) => row.rank === 2);
  const third = rows.find((row) => row.rank === 3);
  const rest = rows.slice(3);

  return (
    <section className={cx(styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8)}>
      <div className={cx(styles.r_c820c990, styles.r_f0faeb26, styles.r_9fcd8a13, styles.r_ce335a8e, styles.r_8a383123)}>
        <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
          <div>
            <div className={cx(styles.r_d058ca6d, styles.r_2689f395, styles.r_117ec720, styles.r_09ace3a4, styles.r_5f6a59f1)}>Community Ranking</div>
            <div className={cx(styles.r_15e1b1f4, styles.r_d5c9b000, styles.r_69450ef1, styles.r_399e11a5)}>{title}</div>
            <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>{desc}</div>
          </div>
          <div className={cx(styles.r_ac204c10, styles.r_84591855, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_2689f395, styles.r_02eb621e, styles.r_3daca9af, styles.r_52c47100)}>
            {ym}
          </div>
        </div>

        <div className={cx(styles.r_f3c543ad, styles.r_7135d5f8, styles.r_be2e831b, styles.r_6f27f4f7, styles.r_77a2a20e, styles.r_15121b08)}>
          <PodiumUser row={second} place="2" height={cx(styles.r_e836f6e0, styles.r_23043691)} tone={cx(styles.r_febec8f2, styles.r_eb6abb1f)} unit={unit} />
          <PodiumUser row={first} place="1" height={cx(styles.r_54dd2cfe, styles.r_93ab0b33)} tone={cx(styles.r_735dd972, styles.r_5c6230d2)} unit={unit} primary />
          <PodiumUser row={third} place="3" height={cx(styles.r_9678c61e, styles.r_15e9479a)} tone={cx(styles.r_f2b23104, styles.r_e7eab4cb)} unit={unit} />
        </div>
      </div>

      <div className={cx(styles.r_5e10cdb8, styles.r_f0faeb26, styles.r_cb11fec3, styles.r_8a383123)}>
        <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_d058ca6d, styles.r_7b89cd85)}>
          <span>后续排名</span>
          <span>{unit}</span>
        </div>
        {rest.length > 0 ?
        <div className={cx(styles.r_f3c543ad, styles.r_77a2a20e, styles.r_e4d6f343)}>
            {rest.map((row) =>
          <Link
            key={row.user.id}
            href={`/user/${row.user.id}`}
            className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ce27a834, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_5756b7b4)}>

                <span className={cx(styles.r_cbbf90f9, styles.r_012fbd12, styles.r_ca6bf630, styles.r_359090c2, styles.r_e83a7042, styles.r_7b89cd85)}>{row.rank}</span>
                <Avatar src={row.user.avatar} alt={row.user.name} size={30} />
                <span className={cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_f283ea9b, styles.r_359090c2, styles.r_2689f395, styles.r_399e11a5)}>{row.user.name}</span>
                <span className={cx(styles.r_012fbd12, styles.r_359090c2, styles.r_e83a7042, styles.r_5f6a59f1)}>
                  {row.score} {unit}
                </span>
              </Link>
          )}
          </div> :

        <div className={cx(styles.r_5f22e64f, styles.r_ce27a834, styles.r_0e17f2bd, styles.r_a1f611f0, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_7b89cd85)}>
            暂无更多上榜用户
          </div>
        }
      </div>
    </section>);

}

function PodiumUser({
  row,
  place,
  height,
  tone,
  unit,
  primary







}: {row?: RankingRow;place: '1' | '2' | '3';height: string;tone: string;unit: string;primary?: boolean;}) {
  if (!row) {
    return (
      <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2)}>
        <div className={cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_6f27f4f7, styles.r_86843cf1, styles.r_1301e5c1, styles.r_d2fa6cb5, `${height}`)}>
          <span className={cx(styles.r_9fcd8a13, styles.r_fc7473ca, styles.r_66a36c90)}>未上榜</span>
        </div>
      </div>);

  }

  return (
    <div className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_8dddea07, styles.r_3960ffc2)}>
      <div className={cx(styles.r_d89972fe, styles.r_1bb88326)}>
        <div
          className={cx(styles.r_da4dbfbc, styles.r_c6756399, styles.r_e632769a, styles.r_236812d6, styles.r_f3c543ad, styles.r_d0a52b31, styles.r_cbbf90f9, styles.r_efaa0701, styles.r_67d66567, styles.r_ac204c10, styles.r_359090c2, styles.r_69450ef1, styles.r_438b2237, `${tone}`)}>

          {place}
        </div>
        <Avatar
          src={row.user.avatar}
          alt={row.user.name}
          size={primary ? 68 : 56}
          ring
          className={styles.r_0ab86672} />

      </div>
      <UserName user={row.user} asLink size="sm" className={cx(styles.r_65281709, styles.r_c0980a65, styles.r_86843cf1, styles.r_f283ea9b, styles.r_ca6bf630)} />
      <div className={cx(styles.r_a77ed4d9, styles.r_359090c2, styles.r_e83a7042, styles.r_5f6a59f1)}>
        {row.score} {unit}
      </div>
      <div className={cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_6f27f4f7, styles.r_86843cf1, styles.r_1301e5c1, `${height}${tone}`)}>
        <span className={primary ? cx(styles.r_09c1ba5f, styles.r_a95699d9, styles.r_7fbb8569) : cx(styles.r_9fcd8a13, styles.r_751fb0d1, styles.r_7fbb8569)}>{place}</span>
      </div>
    </div>);

}