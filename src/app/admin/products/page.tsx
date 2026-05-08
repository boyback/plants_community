import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { ProductRowActions } from './ProductRowActions';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; source?: string; status?: string; page?: string };
}) {
  const q = searchParams.q ?? '';
  const source = searchParams.source ?? '';
  const status = searchParams.status ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (source) where.source = source;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { seller: { name: { contains: q } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        seller: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🛒 商品管理</h1>
        <p className="mt-1 text-xs text-ink-600">
          共 {total} 件 · 第 {page}/{totalPages} 页
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs">
        <input
          name="q"
          defaultValue={q}
          placeholder="标题 / 卖家"
          className="w-48 rounded-lg border border-ink-200 px-3 py-1.5"
        />
        <select name="source" defaultValue={source} className="rounded-lg border border-ink-200 px-2 py-1.5">
          <option value="">全部来源</option>
          <option value="official">官方</option>
          <option value="c2c">肉友</option>
        </select>
        <select name="status" defaultValue={status} className="rounded-lg border border-ink-200 px-2 py-1.5">
          <option value="">全部状态</option>
          <option value="on_sale">销售中</option>
          <option value="sold_out">售罄</option>
          <option value="off_shelf">下架</option>
        </select>
        <button className="rounded-lg bg-ink-800 px-3 py-1.5 text-white">筛选</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="px-3 py-2 text-left">商品</th>
              <th className="px-3 py-2 text-left">来源</th>
              <th className="px-3 py-2 text-right">价格</th>
              <th className="px-3 py-2 text-right">库存/销量</th>
              <th className="px-3 py-2 text-left">卖家</th>
              <th className="px-3 py-2 text-left">状态</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                <td className="max-w-[260px] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-ink-50">
                      <Image src={p.cover} alt="" fill className="object-cover" unoptimized />
                    </div>
                    <Link href={`/market/${p.id}`} target="_blank" className="truncate hover:underline">
                      {p.title}
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className={p.source === 'official' ? 'rounded bg-leaf-100 px-1.5 py-0.5 text-[10px] text-leaf-700' : 'rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700'}>
                    {p.source === 'official' ? '官方' : '肉友'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-rose-600 font-semibold">
                  {formatPrice(p.price)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-600">
                  {p.stock} / {p._count.orders}
                </td>
                <td className="px-3 py-2">
                  {p.seller ? (
                    <Link href={`/user/${p.seller.id}`} target="_blank" className="hover:underline">
                      {p.seller.name}
                    </Link>
                  ) : (
                    <span className="text-ink-500">官方</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge s={p.status} />
                </td>
                <td className="px-3 py-2 text-right">
                  <ProductRowActions productId={p.id} status={p.status} />
                </td>
              </tr>
            ))}
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

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    on_sale: { label: '销售中', cls: 'bg-leaf-100 text-leaf-700' },
    sold_out: { label: '售罄', cls: 'bg-ink-100 text-ink-600' },
    off_shelf: { label: '已下架', cls: 'bg-rose-100 text-rose-700' },
    pending_review: { label: '待审核', cls: 'bg-amber-100 text-amber-700' },
  };
  const it = map[s] ?? { label: s, cls: 'bg-ink-100 text-ink-600' };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] ${it.cls}`}>{it.label}</span>;
}
