import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function PlantGenusEntry({
  params,
}: {
  params: { categorySlug: string; genusSlug: string };
}) {
  const firstSpecies = await prisma.species.findFirst({
    where: {
      genus: {
        slug: params.genusSlug,
        board: {
          slug: params.categorySlug,
          kind: 'family',
          enabled: true,
        },
      },
    },
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: { genus: { include: { board: true } } },
  });

  if (!firstSpecies?.genus?.board) notFound();

  redirect(`/plants/${firstSpecies.genus.board.slug}/${firstSpecies.genus.slug}/${firstSpecies.slug}`);
}
