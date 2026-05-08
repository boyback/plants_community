import Link from 'next/link';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { OrderRowActions } from './OrderRowActions';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: '待付款', cls: 'bg-amber-100 text-amber-700' },
  pending_ship: { label: '待发货', cls: 'bg-blue-100 text-blue-700' },
  pending_receipt: { label: '待收货', cls: 'bg-violet-100 text-violet-700' },
  pending_review: { label: '待评价', cls: 'bg-ink-100 text-ink-700' },
  completed: { label: '已完成', cls: 'bg-leaf-100 text-leaf-700' },
  cancelled: { label: '已取消', cls: 'bg-ink-100 text-ink-500' },
  refunded: { label: '已退款', cls: 'bg-rose-100 text-rose-700' },
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; source?: string; page?: string };
}) {
  const q = searchParams.q ?? '';
  const status = searchParams.status ?? '';
  const source = searchParams.source ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (source) where.source = source;
  if (q) {
    where.OR = [
      { orderNo: { contains: q } },
      { buyer: { name: { contains: q } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        product: { select: { id: true, title: true, cover: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">📦 订单管理</h1>
        <p className="mt-1 text-xs text-ink-600">
          共 {total} 单 · 第 {page}/{totalPages} 页
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs">
        <input
          name="q"
          defaultValue={q}
          placeholder="订单号 / 买家"
          className="w-48 rounded-lg border border-ink-200 px-3 py-1.5"
        />
        <select name="status" defaultValue={status} className="rounded-lg border border-ink-200 px-2 py-1.5">
          <option value="">全部状态</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select name="source" defaultValue={source} className="rounded-lg border border-ink-200 px-2 py-1.5">
          <option value="">全部来源</option>
          <option value="product">商品</option>
          <option value="auction">拍卖</option>
        </select>
        <button className="rounded-lg bg-ink-800 px-3 py-1.5 text-white">筛选</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="px-3 py-2 text-left">订单号</th>
              <th className="px-3 py-2 text-left">商品</th>
              <th className="px-3 py-2 text-left">买家</th>
              <th className="px-3 py-2 text-right">金额</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-left">创建</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => {
              const st = STATUS_LABEL[o.status] ?? { label: o.status, cls: 'bg-ink-100 text-ink-600' };
              return (
                <tr key={o.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                  <td className="px-3 py-2 font-mono text-[11px]">{o.orderNo}</td>
                  <td className="max-w-[240px] truncate px-3 py-2">
                    {o.product ? o.product.title : <span className="text-ink-500">拍卖订单</span>}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/user/${o.buyer.id}`} target="_blank" className="hover:underline">
                      {o.buyer.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-rose-600">
                    {formatPrice(o.totalPrice)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${st.cls}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[11px] text-ink-500">
                    {new Date(o.createdAt).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <OrderRowActions orderId={o.id} status={o.status} />
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
