import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { serializePlant } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const slug = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const plant = await prisma.plant.findUnique({ where: { slug } });
  if (!plant) return fail(404, '品种不存在');
  return serializePlant(plant);
});
