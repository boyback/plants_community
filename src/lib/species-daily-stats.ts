import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db';

export type SpeciesDailyStatField = 'views' | 'collects' | 'compares' | 'contributions' | 'posts' | 'ratings';

export async function incrementSpeciesDailyStat(speciesId: string | null | undefined, field: SpeciesDailyStatField) {
  if (!speciesId) return;
  const id = randomUUID();
  if (field === 'views') {
    await prisma.$executeRaw`
      INSERT INTO species_daily_stats (id, speciesId, date, views, createdAt, updatedAt)
      VALUES (${id}, ${speciesId}, CURRENT_DATE(), 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE views = views + 1, updatedAt = NOW()
    `.catch(() => undefined);
    return;
  }
  if (field === 'collects') {
    await prisma.$executeRaw`
      INSERT INTO species_daily_stats (id, speciesId, date, collects, createdAt, updatedAt)
      VALUES (${id}, ${speciesId}, CURRENT_DATE(), 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE collects = collects + 1, updatedAt = NOW()
    `.catch(() => undefined);
    return;
  }
  if (field === 'compares') {
    await prisma.$executeRaw`
      INSERT INTO species_daily_stats (id, speciesId, date, compares, createdAt, updatedAt)
      VALUES (${id}, ${speciesId}, CURRENT_DATE(), 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE compares = compares + 1, updatedAt = NOW()
    `.catch(() => undefined);
    return;
  }
  if (field === 'contributions') {
    await prisma.$executeRaw`
      INSERT INTO species_daily_stats (id, speciesId, date, contributions, createdAt, updatedAt)
      VALUES (${id}, ${speciesId}, CURRENT_DATE(), 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE contributions = contributions + 1, updatedAt = NOW()
    `.catch(() => undefined);
    return;
  }
  if (field === 'posts') {
    await prisma.$executeRaw`
      INSERT INTO species_daily_stats (id, speciesId, date, posts, createdAt, updatedAt)
      VALUES (${id}, ${speciesId}, CURRENT_DATE(), 1, NOW(), NOW())
      ON DUPLICATE KEY UPDATE posts = posts + 1, updatedAt = NOW()
    `.catch(() => undefined);
    return;
  }
  await prisma.$executeRaw`
    INSERT INTO species_daily_stats (id, speciesId, date, ratings, createdAt, updatedAt)
    VALUES (${id}, ${speciesId}, CURRENT_DATE(), 1, NOW(), NOW())
    ON DUPLICATE KEY UPDATE ratings = ratings + 1, updatedAt = NOW()
  `.catch(() => undefined);
}
