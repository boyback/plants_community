import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function PlantsIndexPage() {
  const firstSpecies = await prisma.species.findFirst({
    where: {
      genus: {
        board: {
          kind: 'family',
          enabled: true,
        },
      },
    },
    orderBy: [
      { genus: { board: { orderIdx: 'asc' } } },
      { genus: { orderIdx: 'asc' } },
      { orderIdx: 'asc' },
      { name: 'asc' },
    ],
    include: {
      genus: {
        include: {
          board: true,
        },
      },
    },
  });

  if (!firstSpecies?.genus?.board) {
    redirect('/board');
  }

  redirect(`/plants/${firstSpecies.genus.board.slug}/${firstSpecies.genus.slug}/${firstSpecies.slug}`);
}
