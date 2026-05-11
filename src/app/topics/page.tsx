/**
 * 话题排行榜 /topics
 *
 * 按帖子数量排序的所有话题，从 TopicRanking 预聚合表读取。
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

export const metadata: Metadata = {
  title: '话题排行榜 · 肉友社',
  description: '查看肉友社所有热门话题排行榜，按帖子数量排序',
};

export default async function TopicsRankingPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams.page || 1));
  const skip = (page - 1) * PAGE_SIZE;

  const [items, total] = await Promise.all([
    prisma.topicRanking.findMany({
      orderBy: { postCount: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.topicRanking.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Shell>
      <div className="mb-6">
        <div className="text-[11px] text-leaf-700/60">
          <Link href="/" className="hover:text-leaf-700">首页</Link>
          <span className="mx-1.5">/</span>
          <span>话题排行榜</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-ink-800">话题排行榜</h1>
        <p className="mt-1 text-sm text-leaf-700/70">
          按帖子数量排序的所有话题，共 {total} 个
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center text-sm text-leaf-700/60">
          暂无话题数据，管理员请先刷新排行榜
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul>
            {items.map((item, i) => {
              const globalRank = skip + i + 1;
              const isHot = item.recent30dCount >= 50;
              return (
                <li key={item.id}>
                  <Link
                    href={`/topic/${encodeURIComponent(item.tag)}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-leaf-50/50 border-b border-leaf-100/60 last:border-b-0"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={
                          globalRank <= 3
                            ? 'inline-grid h-6 w-6 place-items-center rounded-lg bg-leaf-500 text-xs font-bold text-white'
                            : 'inline-grid h-6 w-6 place-items-center rounded-lg bg-leaf-50 text-xs font-bold text-leaf-600'
                        }
                      >
                        {globalRank}
                      </span>
                      <span className="text-sm font-semibold text-ink-800">
                        #{item.tag}
                      </span>
                      {isHot && (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">
                          HOT
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-4 text-[11px] text-leaf-700/60">
                      <span>{item.postCount} 篇帖子</span>
                      {item.recent30dCount > 0 && (
                        <span className="text-leaf-600">近30天 {item.recent30dCount}</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link
              href={`/topics?page=${page - 1}`}
              className="rounded-md border border-leaf-200 px-3 py-1.5 text-leaf-700 hover:bg-leaf-50"
            >
              ← 上一页
            </Link>
          )}
          <span className="text-leaf-700/70">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/topics?page=${page + 1}`}
              className="rounded-md border border-leaf-200 px-3 py-1.5 text-leaf-700 hover:bg-leaf-50"
            >
              下一页 →
            </Link>
          )}
        </nav>
      )}
    </Shell>
  );
}
