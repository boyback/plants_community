import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * 兼容旧链接 /plants/[slug]:
 * 把它 301 到新的三级路径 /board/[category]/[genus]/[species]
 * 如果旧 slug 找不到,显示 404。
 */
export default async function LegacyPlantRedirect({ params }: { params: { slug: string } }) {
  const s = await prisma.species.findFirst({
    where: { slug: params.slug },
    include: { genus: { include: { category: true } } },
  });
  if (!s) notFound();
  const path = `/board/${s.genus.category.slug}/${s.genus.slug}/${s.slug}`;
  redirect(path);
}
