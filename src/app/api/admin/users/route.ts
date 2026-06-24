/**
 * GET /api/admin/users?q=&role=&banned=&page=&pageSize=
 *
 * 管理员查询用户列表。
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const Query = z.object({
  q: z.string().optional(),
  role: z.enum(['user', 'moderator', 'admin']).optional(),
  banned: z.enum(['yes', 'no', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const GET = handler(async (req) => {
  await requireAdmin();
  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return fail(400, '参数错误', parsed.error.issues);
  const { q, role, banned, page, pageSize } = parsed.data;

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (banned === 'yes') where.bannedUntil = { gt: new Date() };
  else if (banned === 'no')
    where.OR = [{ bannedUntil: null }, { bannedUntil: { lte: new Date() } }];
  if (q) {
    where.OR = [
      ...(where.OR as unknown[] ?? []),
      { name: { contains: q } },
      { id: q },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { joinedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, avatar: true, equipPendantId: true, level: true, exp: true,
        role: true, bannedUntil: true, banReason: true,
        pointsBalance: true, joinedAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pageSize };
});
