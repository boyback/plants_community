/**
 * Admin: 列出所有品种现场照(分状态)
 *   GET /api/admin/species-photos?status=pending|approved|rejected&cursor=&limit=
 */
import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  await requireAdmin({ allowModerator: true });

  const url = new URL(req.url);
  const status = (url.searchParams.get('status') ?? 'pending') as
    | 'pending'
    | 'approved'
    | 'rejected';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '40'), 100);
  const cursor = url.searchParams.get('cursor') ?? undefined;

  const list = await prisma.speciesPhoto.findMany({
    where: { status },
    orderBy: [{ createdAt: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      uploader: { select: { id: true, name: true, avatar: true, level: true } },
      species: {
        select: {
          id: true,
          name: true,
          slug: true,
          genus: { select: { slug: true, category: { select: { slug: true } } } },
        },
      },
    },
  });

  let nextCursor: string | null = null;
  if (list.length > limit) nextCursor = list.pop()!.id;

  return {
    items: list.map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      status: p.status,
      votes: p.votes,
      pinned: p.pinned,
      rejectReason: p.rejectReason,
      createdAt: p.createdAt.toISOString(),
      uploader: p.uploader,
      species: {
        id: p.species.id,
        name: p.species.name,
        slug: p.species.slug,
        genusSlug: p.species.genus.slug,
        categorySlug: p.species.genus.category.slug,
      },
    })),
    nextCursor,
  };
});
