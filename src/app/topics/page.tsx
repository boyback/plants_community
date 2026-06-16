/**
 * 话题排行榜 /topics
 *
 * 按帖子数量排序的所有话题，从 TopicRanking 预聚合表读取。
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export const metadata: Metadata = {
  title: '话题排行榜 · 植友圈',
  description: '查看植友圈所有热门话题排行榜，按帖子数量排序'
};

export default async function TopicsRankingPage({
  searchParams


}: {searchParams: {page?: string;};}) {
  const page = Math.max(1, Number(searchParams.page || 1));
  const skip = (page - 1) * PAGE_SIZE;

  const [items, total] = await Promise.all([
  prisma.topicRanking.findMany({
    orderBy: { postCount: 'desc' },
    skip,
    take: PAGE_SIZE
  }),
  prisma.topicRanking.count()]
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Shell>
      <div className={styles.r_b6777c6d}>
        <div className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>
          <Link href="/" className={styles.r_9825203a}>首页</Link>
          <span className={styles.r_418ac28d}>/</span>
          <span>话题排行榜</span>
        </div>
        <h1 className={cx(styles.r_b6b02c0e, styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)}>话题排行榜</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_69335b95)}>
          按帖子数量排序的所有话题，共 {total} 个
        </p>
      </div>

      {items.length === 0 ?
      <div className={cx(styles.r_16a5872e, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>
          暂无话题数据，管理员请先刷新排行榜
        </div> :

      <div className={styles.r_2cd02d11}>
          <ul>
            {items.map((item, i) => {
            const globalRank = skip + i + 1;
            const isHot = item.recent30dCount >= 50;
            return (
              <li key={item.id}>
                  <Link
                  href={`/topic/${encodeURIComponent(item.tag)}`}
                  className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_d139dd09, styles.r_69e76918, styles.r_98dc6304, styles.r_65fdbade, styles.r_38748e06, styles.r_b4cf72cd)}>

                    <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3)}>
                      <span
                      className={
                      globalRank <= 3 ? cx(styles.r_c5d9aaf6, styles.r_f6fe9024, styles.r_7ec10f86, styles.r_67d66567, styles.r_5f22e64f, styles.r_45499621, styles.r_359090c2, styles.r_69450ef1, styles.r_72a4c7cd) : cx(styles.r_c5d9aaf6, styles.r_f6fe9024, styles.r_7ec10f86, styles.r_67d66567, styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_359090c2, styles.r_69450ef1, styles.r_b17d6a13)


                      }>

                        {globalRank}
                      </span>
                      <span className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>
                        #{item.tag}
                      </span>
                      {isHot &&
                    <span className={cx(styles.r_07389a77, styles.r_0759a0f1, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395, styles.r_595fceba)}>
                          HOT
                        </span>
                    }
                    </span>
                    <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_0c3bc985, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                      <span>{item.postCount} 篇帖子</span>
                      {item.recent30dCount > 0 &&
                    <span className={styles.r_b17d6a13}>近30天 {item.recent30dCount}</span>
                    }
                    </span>
                  </Link>
                </li>);

          })}
          </ul>
        </div>
      }

      {totalPages > 1 &&
      <nav className={cx(styles.r_31f25533, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_77a2a20e, styles.r_fc7473ca)}>
          {page > 1 &&
        <Link
          href={`/topics?page=${page - 1}`}
          className={cx(styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_5f6a59f1, styles.r_5756b7b4)}>

              ← 上一页
            </Link>
        }
          <span className={styles.r_69335b95}>
            {page} / {totalPages}
          </span>
          {page < totalPages &&
        <Link
          href={`/topics?page=${page + 1}`}
          className={cx(styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_5f6a59f1, styles.r_5756b7b4)}>

              下一页 →
            </Link>
        }
        </nav>
      }
    </Shell>);

}