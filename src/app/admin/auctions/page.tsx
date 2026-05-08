import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { AuctionRowActions } from './AuctionRowActions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿', cls: 'bg-ink-100 text-ink-600' },
  scheduled: { label: '未开始', cls: 'bg-amber-100 text-amber-700' },
  live: { label: '进行中', cls: 'bg-rose-100 text-rose-700' },
  finished: { label: '已结束', cls: 'bg-leaf-100 text-leaf-700' },
  cancelled: { label: '已取消', cls: 'bg-ink-100 text-ink-500' },
};

export default async function AdminAuctionsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const q = searchParams.q ?? '';
  const status = searchParams.status ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) where.OR = [{ title: { contains: q } }, { seller: { name: { contains: q } } }];

  const [items, total] = await Promise.all([
    prisma.auction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        seller: { select: { id: true, name: true } },
        _count: { select: { bids: true } },
      },
    }),
    prisma.auction.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🔨 拍卖管理</h1>
        <p className="mt-1 text-xs text-ink-600">
          共 {total} 场 · 第 {page}/{totalPages} 页
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs">
        <input
          name="q"
          defaultValue={q}
          placeholder="拍品 / 卖家"
          className="w-48 rounded-lg border border-ink-200 px-3 py-1.5"
        />
        <select name="status" defaultValue={status} className="rounded-lg border border-ink-200 px-2 py-1.5">
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button className="rounded-lg bg-ink-800 px-3 py-1.5 text-white">筛选</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="px-3 py-2 text-left">标题</th>
              <th className="px-3 py-2 text-left">卖家</th>
              <th className="px-3 py-2 text-right">起拍 / 当前</th>
              <th className="px-3 py-2 text-right">出价数</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-left">结束</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const st = STATUS_LABEL[a.status] ?? { label: a.status, cls: 'bg-ink-100 text-ink-600' };
              return (
                <tr key={a.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                  <td className="max-w-[260px] truncate px-3 py-2">
                    <Link href={`/auction/${a.id}`} target="_blank" className="hover:underline">
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/user/${a.seller.id}`} target="_blank" className="hover:underline">
                      {a.seller.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatPrice(a.startPrice)}
                    <span className="ml-1 text-rose-600 font-semibold">/{formatPrice(a.currentPrice)}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-600">{a._count.bids}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-ink-500">
                    {new Date(a.endAt).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <AuctionRowActions id={a.id} status={a.status} />
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-ink-500">没有数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-1 text-xs">
        {page > 1 && (
          <Link href={{ query: { ...searchParams, page: String(page - 1) } }} className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50">← 上一页</Link>
        )}
        <span className="px-3 py-1 text-ink-500">{page} / {totalPages}</span>
        {page < totalPages && (
          <Link href={{ query: { ...searchParams, page: String(page + 1) } }} className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50">下一页 →</Link>
        )}
      </div>
    </div>
  );
}
