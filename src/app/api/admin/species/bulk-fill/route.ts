import { z } from 'zod';
import { handler } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const fillableFields = [
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

type FillableField = typeof fillableFields[number];

const Body = z.object({
  dryRun: z.boolean().optional(),
  boardId: z.string().optional(),
  genusId: z.string().optional(),
  fields: z.array(z.enum(fillableFields)).optional(),
  limit: z.number().int().min(1).max(5000).optional(),
});

export const POST = handler(async (req) => {
  const me = await requireAdmin();
  const body = Body.parse(await req.json().catch(() => ({})));
  const dryRun = body.dryRun ?? false;
  const limit = body.limit ?? 5000;
  const selectedFields = body.fields?.length ? body.fields : [...fillableFields];

  const rows = await prisma.species.findMany({
    where: {
      ...(body.genusId ? { genusId: body.genusId } : {}),
      ...(body.boardId && !body.genusId ? { genus: { boardId: body.boardId } } : {}),
    },
    take: limit,
    orderBy: { updatedAt: 'asc' },
    select: {
      id: true,
      name: true,
      difficulty: true,
      light: true,
      watering: true,
      hardiness: true,
      growthType: true,
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
  });

  const candidates = rows
    .map((row) => {
      const data = buildDefaults(row, selectedFields);
      return {
        id: row.id,
        name: row.name,
        group: `${row.genus.board?.name ?? '-'} / ${row.genus.name}`,
        fields: Object.keys(data),
        data,
      };
    })
    .filter((item) => item.fields.length > 0);

  if (!dryRun) {
    for (const item of candidates) {
      await prisma.species.update({ where: { id: item.id }, data: item.data });
    }
    await logAdmin({
      actorId: me.id,
      action: 'species.bulkFillCareFields',
      targetType: 'species',
      meta: { scanned: rows.length, updated: candidates.length, boardId: body.boardId, genusId: body.genusId, fields: selectedFields },
    });
  }

  return {
    scanned: rows.length,
    updated: dryRun ? 0 : candidates.length,
    candidates: candidates.slice(0, 50),
  };
});

function buildDefaults(
  row: {
    difficulty: number;
    light: string;
    hardiness: string;
    growthType: string | null;
    growthSpeed: string | null;
    summerDormancy: string | null;
    lightRequirement: string | null;
    idealTemperature: string | null;
    minTemperature: string | null;
    maxTemperature: string | null;
    humidity: string | null;
    soil: string | null;
    riskTips: string | null;
  },
  fields: FillableField[],
) {
  const enabled = new Set(fields);
  const data: Partial<Record<FillableField, string>> = {};
  if (enabled.has('growthSpeed') && !row.growthSpeed) data.growthSpeed = /夏型|快/.test(row.growthType ?? '') ? '较快' : '中等';
  if (enabled.has('summerDormancy') && !row.summerDormancy) data.summerDormancy = /冬型|夏眠|休眠/.test(row.growthType ?? '') ? '明显' : '不明显';
  if (enabled.has('lightRequirement') && !row.lightRequirement) data.lightRequirement = row.light || '充足散射光';
  if (enabled.has('idealTemperature') && !row.idealTemperature) data.idealTemperature = '15-28°C';
  if (enabled.has('minTemperature') && !row.minTemperature) data.minTemperature = row.hardiness || '5°C';
  if (enabled.has('maxTemperature') && !row.maxTemperature) data.maxTemperature = '35°C';
  if (enabled.has('humidity') && !row.humidity) data.humidity = '20%-60%';
  if (enabled.has('soil') && !row.soil) data.soil = row.difficulty >= 4 ? '颗粒土 80%+，加强排水' : '颗粒土 70% 左右，疏松透气';
  if (enabled.has('riskTips') && !row.riskTips) {
    data.riskTips = JSON.stringify([
      '高温闷湿时注意通风控水',
      '长期缺光容易徒长',
      '浇水过多容易烂根',
    ]);
  }
  return data;
}
