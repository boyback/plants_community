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
  const q = url.searchParams.get('q')?.trim() || undefined;
  const excludeId = url.searchParams.get('excludeId')?.trim() || undefined;
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit') || 200)));

  const where: Record<string, unknown> = {};
  if (family) where.genus = { board: { slug: family } };
  if (genus) where.genus = { ...(where.genus as object), slug: genus };
  if (excludeId) where.id = { not: excludeId };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { latinName: { contains: q } },
      { slug: { contains: q } },
    ];
  }

  const list = await prisma.species.findMany({
    where,
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      latinName: true,
      genus: { select: { slug: true, board: { select: { slug: true } } } },
    },
  });

  return NextResponse.json(
    list.map((s) => ({
      slug: s.slug,
      id: s.id,
      name: s.name,
      latinName: s.latinName,
      familySlug: s.genus.board?.slug ?? '',
      genusSlug: s.genus.slug,
    })),
  );
}
