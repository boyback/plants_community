/**
 * GET  /api/admin/banners        列出全部 banner
 * POST /api/admin/banners        新建 banner
 */
import { z } from 'zod';
import { handler } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().min(1).max(500),
  image: z.string().url(),
  link: z.string().min(1).max(500),
  tint: z.string().min(1).max(120).default('from-leaf-700/70'),
  orderIdx: z.number().int().default(0),
  enabled: z.boolean().default(true),
  durationMs: z.number().int().min(0).max(60_000).default(0),
});

export const GET = handler(async () => {
  await requireAdmin();
  const items = await prisma.banner.findMany({
    orderBy: [{ orderIdx: 'asc' }, { id: 'asc' }],
  });
  return items;
});

export const POST = handler(async (req) => {
  const me = await requireAdmin();
  const body = Body.parse(await req.json());
  const row = await prisma.banner.create({ data: body });
  await logAdmin({
    actorId: me.id,
    action: 'banner.create',
    targetType: 'banner',
    targetId: row.id,
    meta: { title: row.title },
  });
  return row;
});
