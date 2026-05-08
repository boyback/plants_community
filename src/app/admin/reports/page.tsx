import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ReportActions } from './ReportActions';

export const dynamic = 'force-dynamic';

const REASON_LABEL: Record<string, string> = {
  spam: '垃圾广告',
  abuse: '辱骂 / 骚扰',
  pornography: '色情低俗',
  politics: '政治敏感',
  illegal: '违法信息',
  scam: '诈骗',
  other: '其他',
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const status = (searchParams.status as 'pending' | 'resolved' | 'rejected' | 'all') ?? 'pending';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (status !== 'all') where.status = status;

  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        reporter: { select: { id: true, name: true, avatar: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  // 手动拉 target 内容(因为多态,不能直接 include)
  const targets = await Promise.all(
    items.map(async (r) => {
      if (r.targetType === 'post') {
        return prisma.post.findUnique({
          where: { id: r.targetId },
          select: { id: true, title: true, deleted: true },
        });
      }
      if (r.targetType === 'user') {
        return prisma.user.findUnique({
          where: { id: r.targetId },
          select: { id: true, name: true, bannedUntil: true },
        });
      }
      if (r.targetType === 'comment') {
        return prisma.comment.findUnique({
          where: { id: r.targetId },
          select: { id: true, content: true, postId: true },
        });
      }
      return null;
    })
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🚨 举报处理</h1>
        <p className="mt-1 text-xs text-ink-600">
          共 {total} 条 · 第 {page}/{totalPages} 页
        </p>
      </div>

      <form className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs">
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-ink-200 px-2 py-1.5"
        >
          <option value="pending">待处理</option>
          <option value="resolved">已处理</option>
          <option value="rejected">已驳回</option>
          <option value="all">全部</option>
        </select>
        <button className="rounded-lg bg-ink-800 px-3 py-1.5 text-white">筛选</button>
      </form>

      <div className="space-y-3">
        {items.map((r, i) => {
          const target = targets[i];
          return (
            <div key={r.id} className="rounded-xl border border-ink-100 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-rose-50 px-2 py-0.5 font-mono text-[10px] text-rose-700">
                      {r.targetType}
                    </span>
                    <span className="font-semibold text-ink-800">
                      {REASON_LABEL[r.reason] ?? r.reason}
                    </span>
                    <span className="text-ink-500">
                      · {new Date(r.createdAt).toLocaleString('zh-CN')}
                    </span>
                    <span className="ml-auto">
                      {r.status === 'pending' ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
                          待处理
                        </span>
                      ) : r.status === 'resolved' ? (
                        <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-[10px] text-leaf-700">
                          已处理
                        </span>
                      ) : (
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-600">
                          已驳回
                        </span>
                      )}
                    </span>
                  </div>

                  {r.detail && (
                    <div className="mt-2 rounded bg-ink-50 p-2 text-[11px] text-ink-700">
                      {r.detail}
                    </div>
                  )}

                  <div className="mt-2 text-[11px] text-ink-600">
                    举报人:
                    {r.reporter ? (
                      <Link
                        href={`/user/${r.reporter.id}`}
                        target="_blank"
                        className="ml-1 hover:underline"
                      >
                        {r.reporter.name}
                      </Link>
                    ) : (
                      ' 匿名'
                    )}
                  </div>

                  {/* 目标摘要 */}
                  <div className="mt-2 flex items-center gap-2 rounded border border-ink-100 bg-ink-50/50 p-2 text-[11px]">
                    {target ? (
                      r.targetType === 'post' ? (
                        <>
                          <span className="text-ink-500">帖子:</span>
                          <Link
                            href={`/post/${r.targetId}`}
                            target="_blank"
                            className="flex-1 truncate hover:underline"
                          >
                            {(target as { title: string }).title}
                          </Link>
                          {(target as { deleted: boolean }).deleted && (
                            <span className="text-rose-600">已删除</span>
                          )}
                        </>
                      ) : r.targetType === 'user' ? (
                        <>
                          <span className="text-ink-500">用户:</span>
                          <Link
                            href={`/user/${r.targetId}`}
                            target="_blank"
                            className="flex-1 truncate hover:underline"
                          >
                            {(target as { name: string }).name}
                          </Link>
                          {(target as { bannedUntil?: Date | null }).bannedUntil &&
                            new Date((target as { bannedUntil: Date }).bannedUntil).getTime() > Date.now() && (
                              <span className="text-rose-600">已封禁</span>
                            )}
                        </>
                      ) : (
                        <>
                          <span className="text-ink-500">评论:</span>
                          <span className="flex-1 truncate text-ink-700">
                            {((target as { content: string }).content ?? '').slice(0, 60)}
                          </span>
                        </>
                      )
                    ) : (
                      <span className="text-ink-500">目标已不存在</span>
                    )}
                  </div>

                  {r.status !== 'pending' && r.handleNote && (
                    <div className="mt-2 text-[11px] text-ink-500">
                      处理备注:{r.handleNote}
                    </div>
                  )}
                </div>

                {r.status === 'pending' && (
                  <ReportActions reportId={r.id} />
                )}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="rounded-xl border border-ink-100 bg-white p-10 text-center text-sm text-ink-500">
            没有符合的举报
          </div>
        )}
      </div>

      <div className="flex justify-center gap-1 text-xs">
        {page > 1 && (
          <Link
            href={{ query: { ...searchParams, page: String(page - 1) } }}
            className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50"
          >
            ← 上一页
          </Link>
        )}
        <span className="px-3 py-1 text-ink-500">
          {page} / {totalPages}
        </span>
        {page < totalPages && (
          <Link
            href={{ query: { ...searchParams, page: String(page + 1) } }}
            className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50"
          >
            下一页 →
          </Link>
        )}
      </div>
    </div>
  );
}
