/**
 * GET /api/admin/posts?q=&type=&status=(all|deleted|active)&page=&pageSize=
 *
 * 管理员列表查询,支持按标题/作者名/类型/删除状态过滤 + 分页。
 * 默认排除 deleted;需要查已删才传 status=deleted,status=all 看全部。
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const Query = z.object({
  q: z.string().optional(),
  type: z.enum(['rich', 'short', 'vote', 'video', 'event', 'help']).optional(),
  status: z.enum(['all', 'deleted', 'active']).default('active'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const GET = handler(async (req) => {
  await requireAdmin({ allowModerator: true });
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return fail(400, '参数错误', parsed.error.issues);
  const { q, type, status, page, pageSize } = parsed.data;

  const where: Record<string, unknown> = {};
  if (status === 'deleted') where.deleted = true;
  else if (status === 'active') where.deleted = false;
  if (type) where.type = type;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { contentText: { contains: q } },
      { author: { name: { contains: q } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        title: true,
        cover: true,
        views: true,
        deleted: true,
        deletedAt: true,
        deleteReason: true,
        createdAt: true,
        author: { select: { id: true, name: true, avatar: true, level: true, role: true } },
        _count: { select: { comments: true, likes: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return { items, total, page, pageSize };
});
