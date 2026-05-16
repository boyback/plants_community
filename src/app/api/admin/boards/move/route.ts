/**
 * POST /api/admin/boards/move
 *
 * 跨父节点移动:
 *   { kind: 'genus',   id, newParentId }   # newParentId = boardId
 *   { kind: 'species', id, newParentId }   # newParentId = genusId
 *
 * 移动后,新位置默认追加到末尾(orderIdx = 当前 max + 1)
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

const Body = z.object({
  kind: z.enum(['genus', 'species']),
  id: z.string(),
  newParentId: z.string(),
});

export const POST = handler(async (req) => {
  await requireAdmin();
  const { kind, id, newParentId } = Body.parse(await req.json());

  if (kind === 'genus') {
    // Genus.slug 在同一 boardId 下唯一,要检查不冲突
    const g = await prisma.genus.findUnique({ where: { id } });
    if (!g) return fail(404, '属不存在');
    if (g.boardId === newParentId) {
      return { ok: true, noop: true };
    }
    const conflict = await prisma.genus.findFirst({
      where: { boardId: newParentId, slug: g.slug, NOT: { id } },
    });
    if (conflict) return fail(409, `目标科下已有 slug=${g.slug} 的属,需先重命名`);

    const max = await prisma.genus.aggregate({
      where: { boardId: newParentId },
      _max: { orderIdx: true },
    });
    await prisma.genus.update({
      where: { id },
      data: {
        boardId: newParentId,
        orderIdx: (max._max.orderIdx ?? 0) + 1,
      },
    });
  } else {
    // Species.slug 在同一 genusId 下唯一
    const s = await prisma.species.findUnique({ where: { id } });
    if (!s) return fail(404, '品种不存在');
    if (s.genusId === newParentId) {
      return { ok: true, noop: true };
    }
    const conflict = await prisma.species.findFirst({
      where: { genusId: newParentId, slug: s.slug, NOT: { id } },
    });
    if (conflict) return fail(409, `目标属下已有 slug=${s.slug} 的品种,需先重命名`);

    const max = await prisma.species.aggregate({
      where: { genusId: newParentId },
      _max: { orderIdx: true },
    });
    await prisma.species.update({
      where: { id },
      data: {
        genusId: newParentId,
        orderIdx: (max._max.orderIdx ?? 0) + 1,
      },
    });
  }

  return { ok: true };
});
