/**
 * GET  /api/admin/boards                列出全部
 * POST /api/admin/boards                新建 Category(科)
 *
 * Category.kind 可以是:family(板块大类如「景天科」)| discussion(讨论区)| market(交易区)
 */
import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, 'slug 只能含小写字母、数字、连字符'),
  name: z.string().min(1).max(80),
  latinName: z.string().max(120).nullable().optional(),
  // system:系统功能板块(摄影大赛/交易中心/养殖交流/新手村等)
  kind: z.enum(['family', 'discussion', 'market', 'system']).default('family'),
  // 系统板块允许 description / cover 留空,只需要 name + icon
  description: z.string().max(500).default(''),
  cover: z.string().max(500).default(''),
  icons: z.string().max(5000).default('[]'), // JSON 数组字符串
  members: z.number().int().min(0).default(0),
  orderIdx: z.number().int().default(0),
  enabled: z.boolean().default(true),
  // 可选的外部跳转路径,主要用于 system 板块复用现有页面(如 /contests)
  linkPath: z.string().max(200).nullable().optional(),
});

export const GET = handler(async () => {
  await requireAdmin();
  const items = await prisma.board.findMany({
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { genera: true, posts: true } } },
  });
  return items;
});

export const POST = handler(async (req) => {
  const me = await requireAdmin();
  const body = Body.parse(await req.json());
  const exists = await prisma.board.findUnique({ where: { slug: body.slug } });
  if (exists) return fail(400, `slug "${body.slug}" 已存在`);
  const row = await prisma.board.create({ data: body });
  await logAdmin({
    actorId: me.id,
    action: 'category.create',
    targetType: 'category',
    targetId: row.id,
    meta: { slug: row.slug, name: row.name },
  });
  return row;
});
