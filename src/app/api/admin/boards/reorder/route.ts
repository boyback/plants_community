/**
 * POST /api/admin/boards/reorder
 *
 * 拖拽后批量更新同辈 orderIdx。
 *
 * Body:
 *   { kind: 'board', orderedIds: ['idA','idB',...] }
 *   { kind: 'genus',    orderedIds: [...] }   (同一个 boardId 下)
 *   { kind: 'species',  genusId: 'xxx', orderedIds: [...] }   (同一个 genusId 下)
 *
 * 实现:依次 update orderIdx = 0,1,2,...(简单可靠,~10ms 每条)
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

const Body = z.object({
  kind: z.enum(['board', 'genus', 'species']),
  genusId: z.string().optional(),
  orderedIds: z.array(z.string()).min(1).max(500),
});

export const POST = handler(async (req) => {
  await requireAdmin();
  const { kind, genusId, orderedIds } = Body.parse(await req.json());

  if (kind === 'board') {
    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.board.update({ where: { id }, data: { orderIdx: idx } }),
      ),
    );
  } else if (kind === 'genus') {
    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.genus.update({ where: { id }, data: { orderIdx: idx } }),
      ),
    );
  } else {
    if (!genusId) return fail(400, 'species 排序需要 genusId');
    // 更新品种的 orderIdx 和 genusId（支持跨属移动）
    await prisma.$transaction(
      orderedIds.map((id, idx) =>
        prisma.species.update({ where: { id }, data: { orderIdx: idx, genusId } }),
      ),
    );
  }

  return { ok: true, count: orderedIds.length };
});
