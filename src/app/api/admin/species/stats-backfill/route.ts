import { randomUUID } from 'crypto';
import { handler } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

export const POST = handler(async () => {
  const me = await requireAdmin();

  await prisma.$executeRaw`DELETE FROM species_daily_stats`;

  const results = await Promise.all([
    backfillPosts(),
    backfillCollects(),
    backfillCompares(),
    backfillContributions(),
    backfillRatings(),
  ]);

  const totals = {
    posts: results[0],
    collects: results[1],
    compares: results[2],
    contributions: results[3],
    ratings: results[4],
  };

  await logAdmin({
    actorId: me.id,
    action: 'species.dailyStats.backfill',
    targetType: 'speciesDailyStats',
    meta: totals,
  });

  return totals;
});

async function backfillPosts() {
  const rows = await prisma.$queryRaw<Array<{ speciesId: string; date: Date; total: bigint }>>`
    SELECT speciesId, DATE(createdAt) AS date, COUNT(*) AS total
    FROM posts
    WHERE speciesId IS NOT NULL AND deleted = 0 AND reviewStatus = 'published'
    GROUP BY speciesId, DATE(createdAt)
  `;
  for (const row of rows) {
    await prisma.$executeRaw`
      INSERT INTO species_daily_stats (id, speciesId, date, posts, createdAt, updatedAt)
      VALUES (${randomUUID()}, ${row.speciesId}, ${row.date}, ${Number(row.total)}, NOW(), NOW())
      ON DUPLICATE KEY UPDATE posts = VALUES(posts), updatedAt = NOW()
    `;
  }
  return rows.length;
}

async function backfillCollects() {
  const rows = await prisma.$queryRaw<Array<{ speciesId: string; date: Date; total: bigint }>>`
    SELECT speciesId, DATE(createdAt) AS date, COUNT(*) AS total
    FROM species_collects
    GROUP BY speciesId, DATE(createdAt)
  `;
  for (const row of rows) {
    await prisma.$executeRaw`
      INSERT INTO species_daily_stats (id, speciesId, date, collects, createdAt, updatedAt)
      VALUES (${randomUUID()}, ${row.speciesId}, ${row.date}, ${Number(row.total)}, NOW(), NOW())
      ON DUPLICATE KEY UPDATE collects = VALUES(collects), updatedAt = NOW()
    `;
  }
  return rows.length;
}

async function backfillCompares() {
  const rows = await prisma.$queryRaw<Array<{ speciesId: string; date: Date; total: bigint }>>`
    SELECT speciesId, DATE(createdAt) AS date, COUNT(*) AS total
    FROM species_compares
    GROUP BY speciesId, DATE(createdAt)
  `;
  for (const row of rows) {
    await prisma.$executeRaw`
      INSERT INTO species_daily_stats (id, speciesId, date, compares, createdAt, updatedAt)
      VALUES (${randomUUID()}, ${row.speciesId}, ${row.date}, ${Number(row.total)}, NOW(), NOW())
      ON DUPLICATE KEY UPDATE compares = VALUES(compares), updatedAt = NOW()
    `;
  }
  return rows.length;
}

async function backfillContributions() {
  const rows = await prisma.$queryRaw<Array<{ speciesId: string; date: Date; total: bigint }>>`
    SELECT speciesId, DATE(COALESCE(reviewedAt, createdAt)) AS date, COUNT(*) AS total
    FROM species_contributions
    WHERE status = 'approved'
    GROUP BY speciesId, DATE(COALESCE(reviewedAt, createdAt))
  `;
  for (const row of rows) {
    await prisma.$executeRaw`
      INSERT INTO species_daily_stats (id, speciesId, date, contributions, createdAt, updatedAt)
      VALUES (${randomUUID()}, ${row.speciesId}, ${row.date}, ${Number(row.total)}, NOW(), NOW())
      ON DUPLICATE KEY UPDATE contributions = VALUES(contributions), updatedAt = NOW()
    `;
  }
  return rows.length;
}

async function backfillRatings() {
  const rows = await prisma.$queryRaw<Array<{ speciesId: string; date: Date; total: bigint }>>`
    SELECT speciesId, DATE(createdAt) AS date, COUNT(*) AS total
    FROM species_ratings
    GROUP BY speciesId, DATE(createdAt)
  `;
  for (const row of rows) {
    await prisma.$executeRaw`
      INSERT INTO species_daily_stats (id, speciesId, date, ratings, createdAt, updatedAt)
      VALUES (${randomUUID()}, ${row.speciesId}, ${row.date}, ${Number(row.total)}, NOW(), NOW())
      ON DUPLICATE KEY UPDATE ratings = VALUES(ratings), updatedAt = NOW()
    `;
  }
  return rows.length;
}
