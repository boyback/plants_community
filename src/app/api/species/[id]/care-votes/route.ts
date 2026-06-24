import { z } from 'zod';
import { prisma } from '@/lib/db';
import { fail, handler } from '@/lib/api';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { SPECIES_CARE_FIELD_SET, type SpeciesCareField } from '@/lib/species-care';

export const dynamic = 'force-dynamic';

function pickSpeciesId(req: Request) {
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  return segs[segs.length - 2]!;
}

const Body = z.object({
  field: z.string().refine((value): value is SpeciesCareField => SPECIES_CARE_FIELD_SET.has(value as SpeciesCareField), {
    message: '养护参数无效',
  }),
  value: z.string().trim().min(1).max(80),
});

export const GET = handler(async (req) => {
  const speciesId = pickSpeciesId(req);
  const me = await getCurrentUser().catch(() => null);

  const species = await prisma.species.findUnique({ where: { id: speciesId }, select: { id: true } });
  if (!species) return fail(404, '品种不存在');

  const rows = await prisma.speciesCareVote.findMany({
    where: { speciesId },
    orderBy: { updatedAt: 'desc' },
    select: {
      field: true,
      value: true,
      userId: true,
      user: { select: { id: true, name: true, avatar: true, equipPendantId: true } },
    },
  });

  const byField: Record<string, {
    total: number;
    options: Record<string, number>;
    myValue: string | null;
    users: Array<{ id: string; name: string; avatar: string }>;
  }> = {};
  const participantIds = new Set<string>();
  for (const row of rows) {
    participantIds.add(row.userId);
    const bucket = byField[row.field] ?? { total: 0, options: {}, myValue: null, users: [] };
    bucket.total += 1;
    bucket.options[row.value] = (bucket.options[row.value] ?? 0) + 1;
    if (me?.id === row.userId) bucket.myValue = row.value;
    if (bucket.users.length < 4 && !bucket.users.some((user) => user.id === row.user.id)) {
      bucket.users.push(row.user);
    }
    byField[row.field] = bucket;
  }

  return { fields: byField, participantCount: participantIds.size };
});

export const POST = handler(async (req) => {
  const speciesId = pickSpeciesId(req);
  const me = await requireUser();
  const body = Body.parse(await req.json());

  const species = await prisma.species.findUnique({ where: { id: speciesId }, select: { id: true } });
  if (!species) return fail(404, '品种不存在');

  await prisma.speciesCareVote.upsert({
    where: {
      userId_speciesId_field: {
        userId: me.id,
        speciesId,
        field: body.field,
      },
    },
    create: {
      userId: me.id,
      speciesId,
      field: body.field,
      value: body.value,
    },
    update: {
      value: body.value,
    },
  });

  return { ok: true };
});
