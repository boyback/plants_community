import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import { serializePlant } from '@/lib/serializers';
import { PlantsIndexClient } from './PlantsIndexClient';

export const dynamic = 'force-dynamic';

export default async function PlantsIndexPage() {
  const raw = await prisma.plant.findMany({ orderBy: { name: 'asc' } });
  const plants = raw.map(serializePlant);

  return (
    <Shell>
      <PlantsIndexClient plants={plants} />
    </Shell>
  );
}
