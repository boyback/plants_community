import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { serializePlant } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const list = await prisma.plant.findMany({ orderBy: { name: 'asc' } });
  return list.map(serializePlant);
});
