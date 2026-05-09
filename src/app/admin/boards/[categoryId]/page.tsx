import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { GenusClient } from './GenusClient';

export const dynamic = 'force-dynamic';

export default async function CategoryGenusPage({
  params,
}: {
  params: { categoryId: string };
}) {
  const category = await prisma.category.findUnique({
    where: { id: params.categoryId },
  });
  if (!category) notFound();

  const genera = await prisma.genus.findMany({
    where: { categoryId: params.categoryId },
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { species: true, posts: true } } },
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/boards" className="text-xs text-leaf-700 hover:underline">
          ← 返回 Category 列表
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {category.icon} {category.name} · 属管理
        </h1>
        <p className="mt-1 text-xs text-ink-600">
          slug: <code className="rounded bg-ink-100 px-1">{category.slug}</code> · 共 {genera.length} 个属
        </p>
      </div>

      <GenusClient
        categoryId={category.id}
        initial={genera.map((g) => ({
          ...g,
          speciesCount: g._count.species,
          postCount: g._count.posts,
        }))}
      />
    </div>
  );
}
