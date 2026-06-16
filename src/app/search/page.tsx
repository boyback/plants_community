/**
 * 搜索结果页 /search?q=xxx&tab=all|posts|species|boards|users
 *
 * SSR 渲染 + 4 维并行查询 + 关键词高亮
 *
 * tab 设计:
 *   - all:  4 类各取 8 条预览,有「查看更多」跳到对应 tab
 *   - posts/species/boards/users:单类全量(目前最多 30 条)
 */
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import { REVIEW_FILTER_ENABLED } from "@/lib/feature-flags";
import { Avatar } from '@/components/ui/Avatar';
import { Highlight } from '@/components/ui/Highlight';
import { cn } from '@/lib/utils';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

type TabKey = 'all' | 'posts' | 'species' | 'boards' | 'users';

const TABS: {key: TabKey;label: string;}[] = [
{ key: 'all', label: '全部' },
{ key: 'posts', label: '📝 帖子' },
{ key: 'species', label: '🌱 图鉴' },
{ key: 'boards', label: '🏷️ 板块' },
{ key: 'users', label: '👥 肉友' }];


export async function generateMetadata({
  searchParams


}: {searchParams: {q?: string;};}): Promise<Metadata> {
  const q = (searchParams.q || '').trim();
  return {
    title: q ? `${q} · 站内搜索 · 植友圈` : '搜索 · 植友圈',
    description: q ? `搜索「${q}」相关的多肉帖子、品种、板块、肉友` : '在植友圈搜索内容',
    robots: 'noindex, follow'
  };
}

export default async function SearchPage({
  searchParams


}: {searchParams: {q?: string;tab?: string;};}) {
  const q = (searchParams.q || '').trim();
  const tab = (searchParams.tab as TabKey || 'all') as TabKey;
  const tabValid: TabKey = TABS.some((t) => t.key === tab) ? tab : 'all';

  if (!q) {
    return (
      <Shell>
        <EmptyHint />
      </Shell>);

  }

  // 各 tab 取数:all=每类 8 条,单类 tab=30 条
  const PER = tabValid === 'all' ? 8 : 30;
  const want = (k: TabKey) => tabValid === 'all' || tabValid === k;

  const [posts, species, boards, users, totalCounts] = await Promise.all([
  want('posts') ?
  prisma.post.findMany({
    where: {
      deleted: false,
      ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
      OR: [{ title: { contains: q } }, { content: { contains: q } }]
    },
    select: {
      id: true,
      title: true,
      content: true,
      cover: true,
      createdAt: true,
      author: { select: { id: true, name: true, handle: true, avatar: true } },
      _count: { select: { likes: true, comments: true } }
    },
    orderBy: [{ hotScore: 'desc' }, { createdAt: 'desc' }],
    take: PER
  }) :
  Promise.resolve([]),
  want('species') ?
  prisma.species.findMany({
    where: {
      OR: [{ name: { contains: q } }, { latinName: { contains: q } }]
    },
    include: { genus: { include: { board: true } } },
    orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
    take: PER
  }) :
  Promise.resolve([]),
  want('boards') ?
  prisma.board.findMany({
    where: {
      OR: [{ name: { contains: q } }, { description: { contains: q } }]
    },
    orderBy: { name: 'asc' },
    take: PER
  }) :
  Promise.resolve([]),
  want('users') ?
  prisma.user.findMany({
    where: {
      OR: [
      { name: { contains: q } },
      { handle: { contains: q } },
      { bio: { contains: q } }]

    },
    select: {
      id: true,
      name: true,
      handle: true,
      avatar: true,
      bio: true,
      level: true
    },
    orderBy: { updatedAt: 'desc' },
    take: PER
  }) :
  Promise.resolve([]),
  // 顶部 tab 数字徽章用 — 4 维总数,各自独立 count
  Promise.all([
  prisma.post.count({
    where: {
      deleted: false,
      ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
      OR: [{ title: { contains: q } }, { content: { contains: q } }]
    }
  }),
  prisma.species.count({
    where: { OR: [{ name: { contains: q } }, { latinName: { contains: q } }] }
  }),
  prisma.board.count({
    where: { OR: [{ name: { contains: q } }, { description: { contains: q } }] }
  }),
  prisma.user.count({
    where: {
      OR: [
      { name: { contains: q } },
      { handle: { contains: q } },
      { bio: { contains: q } }]

    }
  })]
  )]
  );

  const [cntPosts, cntSpecies, cntBoards, cntUsers] = totalCounts;
  const tabCounts: Record<TabKey, number | null> = {
    all: cntPosts + cntSpecies + cntBoards + cntUsers,
    posts: cntPosts,
    species: cntSpecies,
    boards: cntBoards,
    users: cntUsers
  };
  const totalAll = tabCounts.all;

  return (
    <Shell>
      <div className={styles.r_1bb88326}>
        <h1 className={cx(styles.r_d5c9b000, styles.r_69450ef1, styles.r_399e11a5)}>
          搜索:<span className={styles.r_5f6a59f1}>{q}</span>
        </h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_69335b95)}>找到 {totalAll} 条结果</p>
      </div>

      {/* tab 切换 */}
      <div className={cx(styles.r_fb88ccaa, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_44ee8ba0, styles.r_65fdbade, styles.r_88b684d2)}>
        {TABS.map((t) => {
          const active = t.key === tabValid;
          const count = tabCounts[t.key];
          return (
            <Link
              key={t.key}
              href={`/search?q=${encodeURIComponent(q)}&tab=${t.key}`}
              className={cn(cx(styles.r_d89972fe, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_2689f395, styles.r_ceb69a6b),

              active ? styles.r_5f6a59f1 : cx(styles.r_5fa66415, styles.r_9825203a)
              )}>

              {t.label}
              {count !== null && count > 0 &&
              <span
                className={cn(cx(styles.r_f58b0257, styles.r_ac204c10, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3),

                active ? cx(styles.r_f2b23104, styles.r_5f6a59f1) : cx(styles.r_7ebecbb6, styles.r_69335b95)
                )}>

                  {count}
                </span>
              }
              {active &&
              <span className={cx(styles.r_da4dbfbc, styles.r_2735aadb, styles.r_89d6afbc, styles.r_10db0d55, styles.r_ac204c10, styles.r_45499621)} />
              }
            </Link>);

        })}
      </div>

      {totalAll === 0 ?
      <div className={cx(styles.r_16a5872e, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>
          没有找到相关内容,试试其他关键词
        </div> :

      <div className={styles.r_b3542e05}>
          {/* 帖子 */}
          {(tabValid === 'all' || tabValid === 'posts') && posts.length > 0 &&
        <Section title={`📝 帖子`} count={cntPosts} viewMore={tabValid === 'all' && cntPosts > posts.length ? `/search?q=${encodeURIComponent(q)}&tab=posts` : null}>
              <div className={styles.r_6ed543e2}>
                {posts.map((p) =>
            <Link
              key={p.id}
              href={`/post/${p.id}`}
              className={cx(styles.r_64292b1c, styles.r_60fbb771, styles.r_1004c0c3, styles.r_eb6e8b88)}>

                    {p.cover &&
              <div className={cx(styles.r_d89972fe, styles.r_0a769880, styles.r_ed831a4d, styles.r_012fbd12, styles.r_2cd02d11, styles.r_421ac2be, styles.r_7ebecbb6)}>
                        <Image src={p.cover} alt={p.title} fill className={styles.r_7d85d0c2} unoptimized />
                      </div>
              }
                    <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                      <h3 className={cx(styles.r_f50e2015, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5, styles.r_0eb80431)}>
                        <Highlight text={p.title} q={q} />
                      </h3>
                      <p className={cx(styles.r_b6b02c0e, styles.r_054cb4e3, styles.r_69cdf25a, styles.r_6b189c6e, styles.r_e3622902)}>
                        <Highlight
                    text={(p.content || '').replace(/<[^>]+>/g, '').slice(0, 100)}
                    q={q} />

                      </p>
                      <div className={cx(styles.r_aac62f0e, styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                        <span>{p.author.name}</span>
                        <span>·</span>
                        <span>♥ {p._count.likes}</span>
                        <span>·</span>
                        <span>💬 {p._count.comments}</span>
                      </div>
                    </div>
                  </Link>
            )}
              </div>
            </Section>
        }

          {/* 图鉴(品种) */}
          {(tabValid === 'all' || tabValid === 'species') && species.length > 0 &&
        <Section title={`🌱 多肉图鉴`} count={cntSpecies} viewMore={tabValid === 'all' && cntSpecies > species.length ? `/search?q=${encodeURIComponent(q)}&tab=species` : null}>
              <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_9a638cfe, styles.r_4558bce6)}>
                {species.map((s) =>
            <Link
              key={s.id}
              href={`/board/${s.genus.board?.slug ?? ''}/${s.genus.slug}/${s.slug}`}
              className={cx(styles.r_64292b1c, styles.r_2cd02d11)}>

                    <div className={cx(styles.r_d89972fe, styles.r_357868ab, styles.r_7ebecbb6)}>
                      <Image src={s.cover} alt={s.name} fill className={styles.r_7d85d0c2} unoptimized />
                    </div>
                    <div className={styles.r_9fe52d5d}>
                      <div className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5, styles.r_0eb80431)}>
                        <Highlight text={s.name} q={q} />
                      </div>
                      {s.latinName &&
                <div className={cx(styles.r_f283ea9b, styles.r_d058ca6d, styles.r_90665ca6, styles.r_6c4cc49e)}>
                          <Highlight text={s.latinName} q={q} />
                        </div>
                }
                    </div>
                  </Link>
            )}
              </div>
            </Section>
        }

          {/* 板块 */}
          {(tabValid === 'all' || tabValid === 'boards') && boards.length > 0 &&
        <Section title={`🏷️ 板块`} count={cntBoards} viewMore={tabValid === 'all' && cntBoards > boards.length ? `/search?q=${encodeURIComponent(q)}&tab=boards` : null}>
              <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77a2a20e)}>
                {boards.map((b) =>
            <Link
              key={b.id}
              href={`/board/${b.slug}`}
              className={cx(styles.r_5f22e64f, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca)}>

                    <div className={cx(styles.r_2689f395, styles.r_399e11a5)}>
                      <Highlight text={b.name} q={q} />
                    </div>
                    <div className={cx(styles.r_15e1b1f4, styles.r_f50e2015, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                      <Highlight text={b.description} q={q} />
                    </div>
                  </Link>
            )}
              </div>
            </Section>
        }

          {/* 用户 */}
          {(tabValid === 'all' || tabValid === 'users') && users.length > 0 &&
        <Section title={`👥 肉友`} count={cntUsers} viewMore={tabValid === 'all' && cntUsers > users.length ? `/search?q=${encodeURIComponent(q)}&tab=users` : null}>
              <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_77a2a20e, styles.r_e4d6f343, styles.r_19d9b25e)}>
                {users.map((u) =>
            <Link
              key={u.id}
              href={`/user/${u.id}`}
              className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_eb6e8b88)}>

                    <Avatar src={u.avatar} alt={u.name} size={40} />
                    <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e)}>
                        <span className={cx(styles.r_f283ea9b, styles.r_2689f395, styles.r_399e11a5)}>
                          <Highlight text={u.name} q={q} />
                        </span>
                        <span className={cx(styles.r_07389a77, styles.r_f2b23104, styles.r_d8e0e382, styles.r_1dc571a3, styles.r_5f6a59f1)}>
                          Lv.{u.level}
                        </span>
                      </div>
                      <div className={cx(styles.r_f283ea9b, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                        {u.handle ?
                  <>@<Highlight text={u.handle} q={q} /></> :

                  <Highlight text={u.bio || '这家伙很懒…'} q={q} />
                  }
                      </div>
                    </div>
                  </Link>
            )}
              </div>
            </Section>
        }
        </div>
      }
    </Shell>);

}

function Section({
  title,
  count,
  viewMore,
  children





}: {title: string;count: number;viewMore: string | null;children: React.ReactNode;}) {
  return (
    <section>
      <div className={cx(styles.r_fbe25fd3, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <h2 className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>
          {title}
          <span className={cx(styles.r_61b99e43, styles.r_359090c2, styles.r_8ecebc9f, styles.r_6c4cc49e)}>{count}</span>
        </h2>
        {viewMore &&
        <Link href={viewMore} className={cx(styles.r_359090c2, styles.r_5f6a59f1, styles.r_f673f4a7)}>
            查看全部 →
          </Link>
        }
      </div>
      {children}
    </section>);

}

function EmptyHint() {
  return (
    <div className={cx(styles.r_16a5872e, styles.r_ca6bf630)}>
      <div className={styles.r_a95699d9}>🔍</div>
      <div className={cx(styles.r_eccd13ef, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>输入关键词开始搜索</div>
      <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_6c4cc49e)}>
        支持搜索:帖子标题/正文 · 品种(中文/拉丁名) · 板块 · 肉友
      </div>
    </div>);

}