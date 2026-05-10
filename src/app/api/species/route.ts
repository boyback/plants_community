/**
 * GET /api/species?family=xxx&genus=xxx&limit=200
 *
 * 公开品种列表(精简字段) — 给 market 筛选下拉用。
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const family = url.searchParams.get('family')?.trim() || undefined;
  const genus = url.searchParams.get('genus')?.trim() || undefined;
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 200)));

  const where: Record<string, unknown> = {};
  if (family) where.genus = { category: { slug: family } };
  if (genus) where.genus = { ...(where.genus as object), slug: genus };

  const list = await prisma.species.findMany({
    where,
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    take: limit,
    select: {
      slug: true,
      name: true,
      latinName: true,
      genus: { select: { slug: true, category: { select: { slug: true } } } },
    },
  });

  return NextResponse.json(
    list.map((s) => ({
      slug: s.slug,
      name: s.name,
      latinName: s.latinName,
      familySlug: s.genus.category.slug,
      genusSlug: s.genus.slug,
    })),
  );
}
