import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { prisma } from '@/lib/db';
import { answerSpeciesQuestion, makeSpeciesAiProfile } from '@/lib/ai/species-assistant';

export const dynamic = 'force-dynamic';

const Body = z.object({
  question: z.string().min(1).max(300),
});

function pickId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return parts[parts.indexOf('species') + 1]!;
}

export const POST = handler(async (req) => {
  const speciesId = pickId(req);
  const body = Body.parse(await req.json());
  const species = await prisma.species.findUnique({
    where: { id: speciesId },
    include: { genus: { include: { board: true } } },
  });
  if (!species) return fail(404, 'Species 不存在');

  const similarSpecies = await prisma.$queryRaw<Array<{ name: string; latinName: string; reason: string | null }>>`
    SELECT s.name, s.latinName, ss.reason
    FROM species_similarities ss
    INNER JOIN species s ON s.id = ss.similarSpeciesId
    WHERE ss.speciesId = ${species.id}
    ORDER BY ss.score DESC, s.name ASC
    LIMIT 6
  `.catch(() => []);

  const profile = makeSpeciesAiProfile(species, similarSpecies);
  return answerSpeciesQuestion(profile, body.question);
});
