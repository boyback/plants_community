/**
 * POST /api/admin/boards/reorder
 *
 * 拖拽后批量更新同辈 orderIdx。
 *
 * Body:
 *   { kind: 'category', orderedIds: ['idA','idB',...] }
 *   { kind: 'genus',    orderedIds: [...] }   (同一个 categoryId 下)
 *   { kind: 'species',  orderedIds: [...] }   (同一个 genusId 下)
 *
 * 实现:依次 update orderIdx = 0,1,2,...(简单可靠,~10ms 每条)
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

const Body = z.object({
  kind: z.enum(['category', 'genus', 'species']),
  orderedIds: z.array(z.string()).min(1).max(500),
});

export const POST = handler(async (req) => {
  await requireAdmin();
  const { kind, orderedIds } = Body.parse(await req.json());

  if (kind === 'category') {
    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.category.update({ where: { id }, data: { orderIdx: idx } }),
      ),
    );
  } else if (kind === 'genus') {
    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.genus.update({ where: { id }, data: { orderIdx: idx } }),
      ),
    );
  } else {
    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.species.update({ where: { id }, data: { orderIdx: idx } }),
      ),
    );
  }

  return { ok: true, count: orderedIds.length };
});
