import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PostAdminActions } from './PostAdminActions';

export const dynamic = 'force-dynamic';

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; type?: string; page?: string };
}) {
  const status = (searchParams.status as 'all' | 'deleted' | 'active') ?? 'active';
  const type = searchParams.type ?? '';
  const q = searchParams.q ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (status === 'deleted') where.deleted = true;
  else if (status === 'active') where.deleted = false;
  if (type) where.type = type;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { author: { name: { contains: q } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        title: true,
        cover: true,
        views: true,
        deleted: true,
        deleteReason: true,
        createdAt: true,
        author: { select: { id: true, name: true, avatar: true, level: true } },
        _count: { select: { comments: true, likes: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">📝 帖子管理</h1>
        <p className="mt-1 text-xs text-ink-600">
          共 {total} 篇 · 第 {page}/{totalPages} 页
        </p>
      </div>

      {/* 过滤器 */}
      <form className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs">
        <input
          name="q"
          defaultValue={q}
          placeholder="按标题或作者搜索"
          className="w-48 rounded-lg border border-ink-200 px-3 py-1.5 focus:border-ink-400 focus:outline-none"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-ink-200 px-2 py-1.5"
        >
          <option value="active">仅正常</option>
          <option value="deleted">仅已删</option>
          <option value="all">全部</option>
        </select>
        <select
          name="type"
          defaultValue={type}
          className="rounded-lg border border-ink-200 px-2 py-1.5"
        >
          <option value="">全部类型</option>
          <option value="rich">富文本</option>
          <option value="short">短内容</option>
          <option value="vote">投票</option>
          <option value="video">视频</option>
          <option value="event">活动</option>
          <option value="help">求助</option>
        </select>
        <button className="rounded-lg bg-ink-800 px-3 py-1.5 text-white">筛选</button>
      </form>

      {/* 表格 */}
      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="px-3 py-2 text-left">标题</th>
              <th className="px-3 py-2 text-left">类型</th>
              <th className="px-3 py-2 text-left">作者</th>
              <th className="px-3 py-2 text-right">👁 / 💬 / ❤</th>
              <th className="px-3 py-2 text-left">发布时间</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                <td className="max-w-[260px] truncate px-3 py-2">
                  <Link href={`/post/${p.id}`} target="_blank" className="hover:underline">
                    {p.title}
                  </Link>
                  {p.deleted && p.deleteReason && (
                    <div className="mt-0.5 text-[10px] text-rose-600">原因:{p.deleteReason}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[10px]">
                    {p.type}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/user/${p.author.id}`} target="_blank" className="hover:underline">
                    {p.author.name}
                  </Link>
                  <span className="ml-1 text-[10px] text-ink-500">Lv.{p.author.level}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-600">
                  {p.views} / {p._count.comments} / {p._count.likes}
                </td>
                <td className="px-3 py-2 text-[11px] text-ink-500">
                  {new Date(p.createdAt).toLocaleDateString('zh-CN')}
                </td>
                <td className="px-3 py-2">
                  {p.deleted ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-700">
                      已删除
                    </span>
                  ) : (
                    <span className="rounded-full bg-leaf-100 px-2 py-0.5 text-[10px] text-leaf-700">
                      正常
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <PostAdminActions postId={p.id} deleted={p.deleted} />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-ink-500">
                  没有数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 翻页 */}
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
