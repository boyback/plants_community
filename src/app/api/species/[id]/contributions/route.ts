import { z } from 'zod';
import { randomUUID } from 'crypto';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const Body = z.object({
  type: z.enum(['image', 'correction', 'care_tip', 'morphology', 'growth_image', 'gallery_image']),
  payload: z.object({
    content: z.string().min(1).max(2000),
    fieldName: z.string().max(80).optional(),
    suggestedValue: z.string().max(500).optional(),
    reason: z.string().max(1000).optional(),
    season: z.string().max(80).optional(),
    images: z.array(z.string().url()).max(9).optional(),
    note: z.string().max(1000).optional(),
    stage: z.string().max(80).optional(),
  }).passthrough(),
});

function pickId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return parts[parts.indexOf('species') + 1]!;
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const speciesId = pickId(req);
  const body = Body.parse(await req.json());

  const species = await prisma.species.findUnique({
    where: { id: speciesId },
    select: { id: true },
  });
  if (!species) return fail(404, 'Species 不存在');

  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO species_contributions (id, speciesId, userId, type, status, payload, createdAt, updatedAt)
    VALUES (${id}, ${speciesId}, ${me.id}, ${body.type}, 'pending', ${JSON.stringify(body.payload)}, NOW(), NOW())
  `;

  return { id, status: 'pending' };
});
