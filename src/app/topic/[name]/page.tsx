/**
 * 话题详情页 /topic/[name]
 *
 * 展示与「关键词」相关的帖子(标题或正文 LIKE),按热度+时间倒序。
 *
 * 用途:
 *   - 首页「热门品种」chip 点击进来(name = 品种名,如「胧月」)
 *   - 未来扩展:养护话题词、活动话题词,都走这个统一页
 *
 * 路由约定:
 *   - name 为 URL-encoded 中文,decode 后用于 LIKE 搜索
 *   - 同时尝试匹配品种(name 精确等)→ 顶部展示品种简介卡 + 跳转链接
 */
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import { REVIEW_FILTER_ENABLED } from "@/lib/feature-flags";
import { Avatar } from '@/components/ui/Avatar';
import { Highlight } from '@/components/ui/Highlight';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export async function generateMetadata({
  params


}: {params: {name: string;};}): Promise<Metadata> {
  const name = decodeURIComponent(params.name || '').trim();
  if (!name) return { title: '话题 · 植友圈' };
  return {
    title: `#${name} · 话题 · 植友圈`,
    description: `查看「${name}」相关的多肉帖子、养护经验与精彩瞬间`
  };
}

export default async function TopicPage({
  params,
  searchParams



}: {params: {name: string;};searchParams: {page?: string;};}) {
  const name = decodeURIComponent(params.name || '').trim();
  if (!name) notFound();

  const page = Math.max(1, Number(searchParams.page || 1));
  const skip = (page - 1) * PAGE_SIZE;

  /**
   * 匹配策略(三选一,优先级高→低):
   *   1. tags 字段(JSON 数组字符串)精准包含 — LIKE %"name"%
   *   2. 标题包含
   *   3. 正文包含
   *
   * 其中 tags 是「该话题精准命中」的最强信号,所以排在最前。
   */
  const where = {
    deleted: false,
    ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' as const } : {}),
    OR: [
    // tags 列存的是 JSON.stringify 的数组,精准匹配 "<tag>"
    { tags: { contains: `"${name}"` } },
    { title: { contains: name } },
    { content: { contains: name } }]

  };

  const [posts, total, matchedSpecies] = await Promise.all([
  prisma.post.findMany({
    where,
    select: {
      id: true,
      title: true,
      content: true,
      cover: true,
      createdAt: true,
      author: { select: { id: true, name: true, handle: true, avatar: true } },
      _count: { select: { likes: true, comments: true } },
      pins: {
        select: { id: true, scope: true, targetId: true, orderIdx: true, pinnedAt: true },
        orderBy: [{ orderIdx: 'asc' }, { pinnedAt: 'desc' }]
      }
    },
    orderBy: [{ hotScore: 'desc' }, { createdAt: 'desc' }],
    skip,
    take: PAGE_SIZE
  }),
  prisma.post.count({ where }),
  // 顺便看是否匹配到一个同名品种,匹配上就在顶部加跳转
  prisma.species.findFirst({
    where: { name },
    include: { genus: { include: { board: true } } }
  })]
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const sortedPosts = sortTopicPosts(posts, name);

  return (
    <Shell>
      {/* 话题头 */}
      <div className={styles.r_fb88ccaa}>
        <div className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>
          <Link href="/" className={styles.r_9825203a}>首页</Link>
          <span className={styles.r_418ac28d}>/</span>
          <span>话题</span>
        </div>
        <h1 className={cx(styles.r_b6b02c0e, styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)}>
          <span className={styles.r_5f6a59f1}>#</span>
          {name}
        </h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_69335b95)}>
          共 {total} 条与「{name}」相关的帖子
        </p>
      </div>

      {/* 如果该话题恰好是一个品种 → 给一个跳到图鉴的入口卡 */}
      {matchedSpecies &&
      <Link
        href={`/board/${matchedSpecies.genus.board?.slug ?? ''}/${matchedSpecies.genus.slug}/${matchedSpecies.slug}`}
        className={cx(styles.r_fb88ccaa, styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_eb6e8b88)}>

          <div className={cx(styles.r_d89972fe, styles.r_acaee621, styles.r_baceed34, styles.r_012fbd12, styles.r_2cd02d11, styles.r_421ac2be, styles.r_7ebecbb6)}>
            <Image
            src={matchedSpecies.cover}
            alt={matchedSpecies.name}
            fill
            className={styles.r_7d85d0c2}
            unoptimized />

          </div>
          <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
            <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>
              🌱 {matchedSpecies.name}
            </div>
            {matchedSpecies.latinName &&
          <div className={cx(styles.r_f283ea9b, styles.r_d058ca6d, styles.r_90665ca6, styles.r_6c4cc49e)}>
                {matchedSpecies.latinName}
              </div>
          }
            <div className={cx(styles.r_15e1b1f4, styles.r_d058ca6d, styles.r_6c4cc49e)}>
              点击查看品种图鉴 →
            </div>
          </div>
        </Link>
      }

      {/* 帖子列表 */}
      {sortedPosts.length === 0 ?
      <div className={cx(styles.r_16a5872e, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>
          还没有「{name}」相关的帖子,快来发第一篇 🌱
        </div> :

      <div className={styles.r_6ed543e2}>
          {sortedPosts.map((p) =>
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
                  <Highlight text={p.title} q={name} />
                </h3>
                <p className={cx(styles.r_b6b02c0e, styles.r_054cb4e3, styles.r_69cdf25a, styles.r_6b189c6e, styles.r_e3622902)}>
                  <Highlight
                text={(p.content || '').replace(/<[^>]+>/g, '').slice(0, 120)}
                q={name} />

                </p>
                <div className={cx(styles.r_aac62f0e, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                  <Avatar src={p.author.avatar} alt={p.author.name} size={16} />
                  <span>{p.author.name}</span>
                  <span>·</span>
                  <span>♥ {p._count.likes}</span>
                  <span>·</span>
                  <span>💬 {p._count.comments}</span>
                  <span>·</span>
                  <span>{fmtDate(p.createdAt)}</span>
                </div>
              </div>
            </Link>
        )}
        </div>
      }

      {/* 分页 */}
      {totalPages > 1 &&
      <nav className={cx(styles.r_31f25533, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_77a2a20e, styles.r_fc7473ca)}>
          {page > 1 &&
        <Link
          href={`/topic/${encodeURIComponent(name)}?page=${page - 1}`}
          className={cx(styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_5f6a59f1, styles.r_5756b7b4)}>

              ← 上一页
            </Link>
        }
          <span className={styles.r_69335b95}>
            {page} / {totalPages}
          </span>
          {page < totalPages &&
        <Link
          href={`/topic/${encodeURIComponent(name)}?page=${page + 1}`}
          className={cx(styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_5f6a59f1, styles.r_5756b7b4)}>

              下一页 →
            </Link>
        }
        </nav>
      }
    </Shell>);

}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sortTopicPosts<T extends {createdAt: Date;pins?: Array<{scope: string;targetId: string;orderIdx: number;pinnedAt: Date;}>;}>(
posts: T[],
topicName: string)
: T[] {
  return [...posts].sort((a, b) => {
    const ap = bestTopicPin(a, topicName);
    const bp = bestTopicPin(b, topicName);
    if (ap && !bp) return -1;
    if (!ap && bp) return 1;
    if (ap && bp) {
      if (ap.orderIdx !== bp.orderIdx) return ap.orderIdx - bp.orderIdx;
      const at = ap.pinnedAt.getTime();
      const bt = bp.pinnedAt.getTime();
      if (at !== bt) return bt - at;
    }
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

function bestTopicPin<T extends {pins?: Array<{scope: string;targetId: string;orderIdx: number;pinnedAt: Date;}>;}>(
post: T,
topicName: string)
{
  return post.pins?.
  filter((pin) => pin.scope === 'topic' && pin.targetId === topicName).
  sort((a, b) => {
    if (a.orderIdx !== b.orderIdx) return a.orderIdx - b.orderIdx;
    return b.pinnedAt.getTime() - a.pinnedAt.getTime();
  })[0];
}