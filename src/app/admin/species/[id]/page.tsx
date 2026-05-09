import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { SpeciesEditForm } from './SpeciesEditForm';

export const dynamic = 'force-dynamic';

export default async function EditSpeciesPage({
  params,
}: {
  params: { id: string };
}) {
  const isNew = params.id === 'new';
  const sp = isNew
    ? null
    : await prisma.species.findUnique({
        where: { id: params.id },
        include: { genus: { select: { id: true, name: true } } },
      });

  if (!isNew && !sp) notFound();

  // 拉所有 Genus,给下拉选项
  const allGenera = await prisma.genus.findMany({
    orderBy: [{ name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      category: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/species" className="text-xs text-leaf-700 hover:underline">
          ← 返回品种列表
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {isNew ? '新建品种' : `编辑品种:${sp!.name}`}
        </h1>
      </div>

      <SpeciesEditForm
        species={
          sp
            ? {
                id: sp.id,
                genusId: sp.genusId,
                slug: sp.slug,
                name: sp.name,
                latinName: sp.latinName,
                alias: sp.alias,
                description: sp.description,
                cover: sp.cover,
                gallery: sp.gallery,
                difficulty: sp.difficulty,
                light: sp.light,
                watering: sp.watering,
                hardiness: sp.hardiness,
                tips: sp.tips,
                blooming: sp.blooming,
                originRegion: sp.originRegion,
                growthType: sp.growthType,
              }
            : null
        }
        genera={allGenera.map((g) => ({
          id: g.id,
          label: `${g.category.name} / ${g.name}(${g.slug})`,
        }))}
      />
    </div>
  );
}
