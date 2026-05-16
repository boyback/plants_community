import { Shell } from '@/components/layout/Shell';
import { prisma } from '@/lib/db';
import { serializeSpeciesFull } from '@/lib/serializers';
import { PlantsIndexClient } from './PlantsIndexClient';

export const dynamic = 'force-dynamic';

export default async function PlantsIndexPage() {
  const raw = await prisma.species.findMany({
    orderBy: { name: 'asc' },
    include: { genus: { include: { board: true } } },
    take: 500,
  });
  // 兼容旧 PlantsIndexClient:用 Species 的字段拼出图鉴格式
  const plants = raw.map((s) => {
    const full = serializeSpeciesFull(s);
    return {
      id: full.id,
      slug: full.slug,
      name: full.name,
      latinName: full.latinName,
      family: `${full.path.find((p) => p.level === 'category')?.name ?? ''} · ${full.path.find((p) => p.level === 'genus')?.name ?? ''}`,
      cover: full.cover,
      difficulty: full.difficulty as 1 | 2 | 3 | 4 | 5,
      light: full.light,
      watering: full.watering,
      hardiness: full.hardiness,
      description: full.description,
      tips: full.tips,
      gallery: full.gallery,
      // 保留一个跳转用的完整路径
      detailHref: `/board/${full.categorySlug}/${full.genusSlug}/${full.slug}`,
    };
  });

  return (
    <Shell>
      <PlantsIndexClient plants={plants} />
    </Shell>
  );
}
