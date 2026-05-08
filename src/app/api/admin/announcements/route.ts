/**
 * GET  /api/admin/announcements         列全部
 * POST /api/admin/announcements         新建
 */
import { z } from 'zod';
import { handler } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';

export const dynamic = 'force-dynamic';

const Body = z.object({
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(5000),
  level: z.enum(['info', 'warning', 'important']).default('info'),
  enabled: z.boolean().default(true),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
});

export const GET = handler(async () => {
  await requireAdmin();
  const items = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
  return items;
});

export const POST = handler(async (req) => {
  const me = await requireAdmin();
  const body = Body.parse(await req.json());
  const a = await prisma.announcement.create({
    data: {
      ...body,
      startAt: body.startAt ? new Date(body.startAt) : null,
      endAt: body.endAt ? new Date(body.endAt) : null,
      createdBy: me.id,
    },
  });
  await logAdmin({
    actorId: me.id,
    action: 'announcement.create',
    targetType: 'announcement',
    targetId: a.id,
    meta: { title: body.title },
  });
  return a;
});
