import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { incrementSpeciesDailyStat } from '@/lib/species-daily-stats';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return parts[parts.indexOf('species') + 1]!;
}

export const GET = handler(async (req) => {
  const me = await requireUser();
  const speciesId = pickId(req);
  const [exists, totalRows] = await Promise.all([
    prisma.$queryRaw<Array<{ userId: string }>>`
      SELECT userId FROM species_collects
      WHERE userId = ${me.id} AND speciesId = ${speciesId}
      LIMIT 1
    `,
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT COUNT(*) AS total FROM species_collects
      WHERE speciesId = ${speciesId}
    `,
  ]);
  return { collected: exists.length > 0, total: Number(totalRows[0]?.total ?? 0) };
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const speciesId = pickId(req);

  const species = await prisma.species.findUnique({
    where: { id: speciesId },
    select: { id: true },
  });
  if (!species) return fail(404, 'Species 不存在');

  const existing = await prisma.$queryRaw<Array<{ userId: string }>>`
    SELECT userId FROM species_collects
    WHERE userId = ${me.id} AND speciesId = ${speciesId}
    LIMIT 1
  `;

  if (existing.length > 0) {
    await prisma.$executeRaw`
      DELETE FROM species_collects
      WHERE userId = ${me.id} AND speciesId = ${speciesId}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO species_collects (userId, speciesId, createdAt)
      VALUES (${me.id}, ${speciesId}, NOW())
    `;
    await incrementSpeciesDailyStat(speciesId, 'collects');
  }

  const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) AS total FROM species_collects
    WHERE speciesId = ${speciesId}
  `;

  return { collected: existing.length === 0, total: Number(totalRows[0]?.total ?? 0) };
});
