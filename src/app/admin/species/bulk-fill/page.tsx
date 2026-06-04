import Link from 'next/link';
import { prisma } from '@/lib/db';
import { BulkFillButton } from './BulkFillButton';
import { StatsBackfillButton } from './StatsBackfillButton';

export const dynamic = 'force-dynamic';

const fields = [
  'growthSpeed',
  'summerDormancy',
  'lightRequirement',
  'idealTemperature',
  'minTemperature',
  'maxTemperature',
  'humidity',
  'soil',
  'riskTips',
] as const;

export default async function SpeciesBulkFillPage() {
  const [total, rows, boards, genera] = await Promise.all([
    prisma.species.count(),
    prisma.species.findMany({
      where: {
        OR: fields.map((field) => ({ [field]: null })),
      },
      take: 20,
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        growthSpeed: true,
        summerDormancy: true,
        lightRequirement: true,
        idealTemperature: true,
        minTemperature: true,
        maxTemperature: true,
        humidity: true,
        soil: true,
        riskTips: true,
        genus: { select: { name: true, board: { select: { name: true } } } },
      },
    }),
    prisma.board.findMany({
      where: { kind: 'family', enabled: true },
      orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    }),
    prisma.genus.findMany({
      orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, boardId: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">品种字段批量补数据</h1>
          <p className="mt-1 text-xs text-ink-500">共 {total} 个品种，下方展示最早需要补齐的 20 个。</p>
        </div>
        <Link href="/admin/species" className="rounded-lg border border-ink-200 px-3 py-2 text-xs hover:bg-ink-50">
          返回品种数据
        </Link>
      </div>

      <BulkFillButton boards={boards} genera={genera.filter((genus) => genus.boardId).map((genus) => ({ id: genus.id, name: genus.name, boardId: genus.boardId! }))} />
      <StatsBackfillButton />

      <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-ink-50 text-ink-600">
            <tr>
              <th className="px-3 py-2 text-left">品种</th>
              <th className="px-3 py-2 text-left">科属</th>
              <th className="px-3 py-2 text-left">缺失字段</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const missing = fields.filter((field) => !row[field]);
              return (
                <tr key={row.id} className="border-t border-ink-100">
                  <td className="px-3 py-3">
                    <div className="font-medium text-ink-800">{row.name}</div>
                    <div className="font-mono text-[10px] text-ink-400">{row.slug}</div>
                  </td>
                  <td className="px-3 py-3 text-ink-600">{row.genus.board?.name ?? '-'} / {row.genus.name}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {missing.map((field) => (
                        <span key={field} className="rounded-full bg-amber-50 px-2 py-1 text-[10px] text-amber-800">
                          {field}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-10 text-center text-ink-500">
                  当前没有缺失默认养护字段的品种
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
