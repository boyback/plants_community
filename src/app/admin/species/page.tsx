import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';

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
          select: { id: true, name: true, slug: true, category: { select: { slug: true, name: true } } },
        },
        _count: { select: { posts: true } },
      },
    }),
    prisma.species.count({ where }),
    prisma.genus.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📚 品种数据</h1>
          <p className="mt-1 text-xs text-ink-600">
            共 {total} 个品种 · 第 {page}/{totalPages} 页
          </p>
        </div>
        <Link
          href="/admin/species/new"
          className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-white hover:bg-ink-700"
        >
          + 新建品种
        </Link>
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
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <button className="rounded-lg bg-ink-800 px-3 py-1.5 text-white">筛选</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="px-3 py-2 text-left w-16">图</th>
              <th className="px-3 py-2 text-left">中文</th>
              <th className="px-3 py-2 text-left">拉丁</th>
              <th className="px-3 py-2 text-left">属 / 科</th>
              <th className="px-3 py-2 text-right">难度</th>
              <th className="px-3 py-2 text-left">光 / 水 / 冷</th>
              <th className="px-3 py-2 text-right">帖子</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                <td className="px-3 py-2">
                  <div className="relative h-10 w-10 overflow-hidden rounded bg-ink-50">
                    <Image src={s.cover} alt="" fill className="object-cover" unoptimized />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`/board/${s.genus.category.slug}/${s.genus.slug}/${s.slug}`}
                    target="_blank"
                    className="font-medium text-ink-800 hover:underline"
                  >
                    {s.name}
                  </Link>
                </td>
                <td className="px-3 py-2 italic text-ink-600">{s.latinName}</td>
                <td className="px-3 py-2 text-[11px]">
                  <div>{s.genus.name}</div>
                  <div className="text-ink-500">{s.genus.category.name}</div>
                </td>
                <td className="px-3 py-2 text-right text-amber-600">
                  {'★'.repeat(s.difficulty)}
                </td>
                <td className="px-3 py-2 text-[10px] text-ink-600">
                  ☀️ {s.light} · 💧 {s.watering} · ❄️ {s.hardiness}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-600">
                  {s._count.posts}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/species/${s.id}`}
                    className="rounded border border-ink-200 px-2 py-1 text-[10px] hover:bg-ink-50"
                  >
                    编辑
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-ink-500">
                  没有数据
                </td>
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
