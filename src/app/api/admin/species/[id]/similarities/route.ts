import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  items: z.array(z.object({
    speciesId: z.string().min(1),
    score: z.number().int().min(1).max(100).optional(),
    reason: z.string().max(1000).optional(),
  })).max(12),
  syncReverse: z.boolean().default(true),
});

function pickId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const index = parts.indexOf('species');
  return parts[index + 1]!;
}

export const GET = handler(async (req) => {
  const id = pickId(req);
  await requireAdmin();
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    similarSpeciesId: string;
    score: number;
    reason: string | null;
    name: string;
    latinName: string;
  }>>`
    SELECT ss.id, ss.similarSpeciesId, ss.score, ss.reason, s.name, s.latinName
    FROM species_similarities ss
    INNER JOIN species s ON s.id = ss.similarSpeciesId
    WHERE ss.speciesId = ${id}
    ORDER BY ss.score DESC, s.name ASC
  `;
  return rows;
});

export const PUT = handler(async (req) => {
  const me = await requireAdmin();
  const id = pickId(req);
  const body = Body.parse(await req.json());

  const targetIds = body.items.map((item) => item.speciesId).filter((targetId) => targetId !== id);
  const uniqueTargetIds = Array.from(new Set(targetIds));
  if (uniqueTargetIds.length !== targetIds.length) return fail(400, '相似品种不能重复');

  if (uniqueTargetIds.length > 0) {
    const count = await prisma.species.count({ where: { id: { in: uniqueTargetIds } } });
    if (count !== uniqueTargetIds.length) return fail(400, '存在无效品种 ID');
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM species_similarities
      WHERE speciesId = ${id}
    `;
    for (const item of body.items) {
      if (item.speciesId === id) continue;
      const rowId = crypto.randomUUID();
      await tx.$executeRaw`
        INSERT INTO species_similarities (id, speciesId, similarSpeciesId, score, reason, createdAt, updatedAt)
        VALUES (${rowId}, ${id}, ${item.speciesId}, ${item.score ?? 80}, ${item.reason ?? null}, NOW(), NOW())
      `;
      if (body.syncReverse) {
        await tx.$executeRaw`
          INSERT INTO species_similarities (id, speciesId, similarSpeciesId, score, reason, createdAt, updatedAt)
          VALUES (${crypto.randomUUID()}, ${item.speciesId}, ${id}, ${item.score ?? 80}, ${item.reason ?? null}, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
            score = VALUES(score),
            reason = VALUES(reason),
            updatedAt = NOW()
        `;
      }
    }
  });

  await logAdmin({
    actorId: me.id,
    action: 'species.similarities.update',
    targetType: 'species',
    targetId: id,
    meta: { count: body.items.length, syncReverse: body.syncReverse },
  });

  return { ok: true };
});
