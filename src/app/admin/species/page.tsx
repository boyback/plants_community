import Link from 'next/link';
import { prisma } from '@/lib/db';
import { AdminSpeciesTable } from './AdminSpeciesTable';

export const dynamic = 'force-dynamic';

export default async function AdminSpeciesPage({
  searchParams,
}: {
  searchParams: { q?: string; genusId?: string; page?: string };
}) {
  const q = searchParams.q ?? '';
  const genusId = searchParams.genusId ?? '';
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 30;

  const where: Record<string, unknown> = {};
  if (genusId) where.genusId = genusId;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { latinName: { contains: q } },
      { slug: { contains: q } },
    ];
  }

  const [items, total, genera] = await Promise.all([
    prisma.species.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        genus: {
          select: {
            id: true,
            name: true,
            slug: true,
            board: { select: { slug: true, name: true } },
          },
        },
        _count: { select: { posts: true } },
      },
    }),
    prisma.species.count({ where }),
    prisma.genus.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        board: { select: { name: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">品种数据</h1>
          <p className="mt-1 text-xs text-ink-600">
            共 {total} 个品种 · 第 {page}/{totalPages} 页
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/species/bulk-fill" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100">
            批量补数据
          </Link>
          <Link href="/admin/species/contributions" className="rounded-lg border border-leaf-200 bg-leaf-50 px-3 py-2 text-xs font-semibold text-leaf-800 hover:bg-leaf-100">
            图鉴贡献审核
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 bg-white p-3 text-xs">
        <input
          name="q"
          defaultValue={q}
          placeholder="中文 / 拉丁名 / slug"
          className="w-56 rounded-lg border border-ink-200 px-3 py-1.5"
        />
        <select
          name="genusId"
          defaultValue={genusId}
          className="rounded-lg border border-ink-200 px-2 py-1.5"
        >
          <option value="">全部属</option>
          {genera.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-ink-800 px-3 py-1.5 text-white">筛选</button>
      </form>

      <AdminSpeciesTable
        items={items}
        genera={genera.map((g) => ({
          id: g.id,
          label: `${g.board?.name ?? '未分类'} / ${g.name} (${g.slug})`,
        }))}
      />

      <div className="flex justify-center gap-1 text-xs">
        {page > 1 && (
          <Link href={{ query: { ...searchParams, page: String(page - 1) } }} className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50">
            ← 上一页
          </Link>
        )}
        <span className="px-3 py-1 text-ink-500">{page} / {totalPages}</span>
        {page < totalPages && (
          <Link href={{ query: { ...searchParams, page: String(page + 1) } }} className="rounded border border-ink-200 px-3 py-1 hover:bg-ink-50">
            下一页 →
          </Link>
        )}
      </div>
    </div>
  );
}
