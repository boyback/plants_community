/**
 * POST /api/admin/categories/batch-delete
 *
 * 批量删除 Category。逐个检查是否有子项(genus/posts)，有则跳过。
 */
import { z } from 'zod';
import { handler } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  ids: z.array(z.string()).min(1).max(50),
});

export const POST = handler(async (req) => {
  const me = await requireAdmin();
  const { ids } = Body.parse(await req.json());

  let deleted = 0;
  const skipped: string[] = [];

  for (const id of ids) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { genera: true, posts: true } } },
    });
    if (!category) continue;
    if (category._count.genera > 0 || category._count.posts > 0) {
      skipped.push(category.name);
      continue;
    }
    await prisma.category.delete({ where: { id } });
    deleted++;
  }

  await logAdmin({
    actorId: me.id,
    action: 'category.batchDelete',
    targetType: 'category',
    meta: { ids, deleted, skipped },
  });

  return { deleted, skipped };
});
