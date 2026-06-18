import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';
import { AppShell } from '@/components/layout/AppShell';
import { Icon, type IconName } from '@/components/ui/Icon';
import { UserIdentity } from '@/components/ui/UserIdentity';
import type { User } from '@/lib/types';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

type RankingKind = 'points' | 'posts' | 'comments' | 'level' | 'followers';

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

type RankingTab = {
  key: RankingKind;
  title: string;
  desc: string;
  unit: string;
  icon: IconName;
};

const RANKING_TABS: RankingTab[] = [
  { key: 'points', title: '钻石排行', desc: '按可消费钻石余额', unit: '钻石', icon: 'diamond' },
  { key: 'posts', title: '发帖排行', desc: '按累计发帖数', unit: '帖', icon: 'edit' },
  { key: 'comments', title: '评论数排行', desc: '按累计评论数', unit: '评', icon: 'comment' },
  { key: 'level', title: '等级排行', desc: '按等级和经验排序', unit: '级', icon: 'diamond' },
  { key: 'followers', title: '粉丝排行', desc: '按粉丝数排序', unit: '粉丝', icon: 'heart' }
];

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

function withRanks(rows: { user: RankingUser; score: number }[]): RankingRow[] {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

export default async function RankingPage({
  searchParams
}: {
  searchParams: { kind?: string };
}) {
  const selectedKind = RANKING_TABS.some((tab) => tab.key === searchParams.kind)
    ? (searchParams.kind as RankingKind)
    : 'points';
  const selected = RANKING_TABS.find((tab) => tab.key === selectedKind)!;

  const [rows, me] = await Promise.all([
    loadRankingRows(selectedKind),
    getCurrentUser().catch(() => null)
  ]);
  const myRow = me ? rows.find((row) => row.user.id === me.id) : undefined;
  const myUser = me
    ? {
        id: me.id,
        name: me.name,
        avatar: me.avatar,
        level: me.level,
        pointsBalance: me.pointsBalance,
        posts: 0,
        comments: 0,
        followers: 0
      }
    : null;

  return (
    <AppShell showFloatingAi={false} className={styles.shellNavWidth}>
      <main className={styles.page}>
        <nav className={styles.tabs} aria-label="排行榜类型">
          {RANKING_TABS.map((tab) => {
            const active = tab.key === selectedKind;
            return (
              <Link key={tab.key} href={`/ranking?kind=${tab.key}`} className={active ? styles.tabActive : styles.tab}>
                <Icon name={tab.icon} size={17} />
                <span>{tab.title}</span>
              </Link>
            );
          })}
          <Link href="/tasks" className={styles.ruleLink}>
            排行榜规则
            <Icon name="arrow-right" size={13} />
          </Link>
        </nav>

        <div className={styles.contentGrid}>
          <section className={styles.board} aria-label={selected.title}>
            <TopPodium rows={rows} selected={selected} />
            <RankingTable rows={rows.slice(3, 100)} unit={selected.unit} selectedKind={selectedKind} />
          </section>

          <aside className={styles.sideRail}>
            <MyRankCard user={myUser} row={myRow} unit={selected.unit} selected={selected} />
            <InfoCard selected={selected} />
          </aside>
        </div>
      </main>
    </AppShell>
  );
}

async function loadRankingRows(kind: RankingKind): Promise<RankingRow[]> {
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
      badges: { include: { badge: true } }
    }
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
    .slice(0, 100);

  return withRanks(scored);
}

function TopPodium({ rows, selected }: { rows: RankingRow[]; selected: RankingTab }) {
  const first = rows.find((row) => row.rank === 1);
  const second = rows.find((row) => row.rank === 2);
  const third = rows.find((row) => row.rank === 3);

  return (
    <div className={styles.podiumWrap}>
      <Image
        src="/images/ranking_bg.png"
        alt=""
        fill
        sizes="(max-width: 768px) 100vw, 100vw"
        className={styles.podiumWrapBg}
        priority
      />
      <PodiumCard row={second} place={2} unit={selected.unit} />
      <PodiumCard row={first} place={1} unit={selected.unit} primary />
      <PodiumCard row={third} place={3} unit={selected.unit} />
    </div>
  );
}

function PodiumCard({
  row,
  place,
  unit,
  primary
}: {
  row?: RankingRow;
  place: 1 | 2 | 3;
  unit: string;
  primary?: boolean;
}) {
  if (!row) return null;

  const className = [styles.podiumCard, styles[`podium${place}`], primary ? styles.podiumPrimary : '']
    .filter(Boolean)
    .join(' ');

  return (
    <article className={className}>
      <>
          <div className={styles.podiumTop}>
            <div className={styles.avatarCrown}>
              <Image
                src={`/images/ranking_icon${place}.png`}
                alt=""
                fill
                sizes="220px"
                className={styles.crownImage}
              />
              <UserIdentity user={row.user} size="lg" showName={false} avatarClassName={styles.rankingAvatar} />
            </div>
            <UserIdentity user={row.user} size="md" showAvatar={false} nameClassName={styles.podiumName} />
            <LevelPill level={row.user.level} tone={place} />
          </div>
          <div className={styles.podiumStats}>
            <ScoreBlock value={row.score} label={unit} />
            <ScoreBlock value={totalScore(row)} label="总钻石" />
          </div>
      </>
    </article>
  );
}

function RankingTable({
  rows,
  unit,
  selectedKind
}: {
  rows: RankingRow[];
  unit: string;
  selectedKind: RankingKind;
}) {
  return (
    <div className={styles.tableCard}>
      <div className={styles.tableHeader}>
        <span>排名</span>
        <span>用户</span>
        <span>等级</span>
        <span>{unit}</span>
        <span>总钻石</span>
      </div>
      <div className={styles.tableBody}>
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={row.user.id} className={styles.tableRow}>
              <span className={styles.rankNumber}>{row.rank}</span>
              <span className={styles.userCell}>
                <UserIdentity user={row.user} size="sm" variant="list" className={styles.userNameLink} />
              </span>
              <span>
                <LevelPill level={row.user.level} />
              </span>
              <strong>{formatScore(row.score, selectedKind)}</strong>
              <strong>{totalScore(row)}</strong>
            </div>
          ))
        ) : (
          <div className={styles.emptyTable}>
            <Icon name="trophy" size={22} />
            <span>暂无更多上榜用户</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MyRankCard({
  user,
  row,
  unit,
  selected
}: {
  user: RankingUser | null;
  row?: RankingRow;
  unit: string;
  selected: RankingTab;
}) {
  return (
    <section className={styles.sideCard}>
      <h2>我的排名</h2>
      {user ? (
        <>
          <div className={styles.myProfile}>
            <UserIdentity user={user} size="lg" showName={false} />
            <div className={styles.myProfileMeta}>
              <UserIdentity user={user} size="md" showAvatar={false} />
              <LevelPill level={user.level} />
            </div>
          </div>
          <div className={styles.myStats}>
            <ScoreBlock value={row?.rank ?? '--'} label="当前排名" />
            <ScoreBlock value={row?.score ?? 0} label={unit} />
            <ScoreBlock value={row ? totalScore(row) : user.pointsBalance} label="总钻石" />
          </div>
          <div className={styles.progressLabel}>超过了 {row ? Math.max(1, 101 - row.rank) : 0}% 的用户</div>
          <div className={styles.progressTrack}>
            <span style={{ width: `${row ? Math.max(8, Math.min(99, 101 - row.rank)) : 8}%` }} />
          </div>
        </>
      ) : (
        <div className={styles.loginPrompt}>
          <p>登录后查看你的当前排名。</p>
          <Link href="/login?redirect=/ranking">去登录</Link>
        </div>
      )}
    </section>
  );
}

function InfoCard({ selected }: { selected: RankingTab }) {
  const items = [
    { icon: 'event' as IconName, title: selected.title, desc: selected.desc },
    { icon: 'rotate-cw' as IconName, title: '每日凌晨更新数据', desc: '统计昨日 00:00 - 24:00 的数据' },
    { icon: 'lock' as IconName, title: '数据仅统计公开内容', desc: '隐私内容不计入排行榜' }
  ];

  return (
    <section className={styles.sideCard}>
      <h2>排行榜说明</h2>
      <div className={styles.infoList}>
        {items.map((item) => (
          <div key={item.title} className={styles.infoItem}>
            <span>
              <Icon name={item.icon} size={18} />
            </span>
            <div>
              <strong>{item.title}</strong>
              <p>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LevelPill({ level, tone = 0 }: { level: number; tone?: number }) {
  const className = [styles.levelPill, tone === 1 ? styles.levelGold : tone === 2 ? styles.levelBlue : tone === 3 ? styles.levelOrange : '']
    .filter(Boolean)
    .join(' ');
  return <span className={className}>Lv.{level} {level >= 9 ? '重生玩家' : level >= 7 ? '资深玩家' : level >= 5 ? '成长玩家' : '新手玩家'}</span>;
}

function ScoreBlock({ value, label }: { value: number | string; label: string }) {
  return (
    <div className={styles.scoreBlock}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function totalScore(row: RankingRow) {
  return Math.max(row.user.pointsBalance, row.score + row.user.level * 128);
}

function formatScore(score: number, kind: RankingKind) {
  if (kind === 'level') return `Lv.${score}`;
  return score;
}
