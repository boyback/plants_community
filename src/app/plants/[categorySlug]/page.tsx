import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';

export const dynamic = "force-dynamic";

export default async function PlantCategoryEntry({
  params


}: {params: {categorySlug: string;};}) {
  const firstInCategory = await prisma.species.findFirst({
    where: {
      genus: {
        board: {
          slug: params.categorySlug,
          kind: 'family',
          enabled: true
        }
      }
    },
    orderBy: [
    { genus: { orderIdx: 'asc' } },
    { orderIdx: 'asc' },
    { name: 'asc' }],

    include: { genus: { include: { board: true } } }
  });

  if (firstInCategory?.genus?.board) {
    redirect(
      `/plants/${firstInCategory.genus.board.slug}/${firstInCategory.genus.slug}/${firstInCategory.slug}`
    );
  }

  const legacySpecies = await prisma.species.findFirst({
    where: { slug: params.categorySlug },
    include: { genus: { include: { board: true } } }
  });

  if (!legacySpecies?.genus?.board) notFound();

  redirect(`/plants/${legacySpecies.genus.board.slug}/${legacySpecies.genus.slug}/${legacySpecies.slug}`);
}