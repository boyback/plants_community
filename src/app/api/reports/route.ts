import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';

const Body = z.object({
  targetType: z.enum(['post', 'comment', 'user']),
  targetId: z.string().min(1),
  reason: z.string().min(1).max(40).default('user_report'),
  detail: z.string().max(1000).optional(),
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());

  const report = await prisma.report.create({
    data: {
      reporterId: me.id,
      targetType: body.targetType,
      targetId: body.targetId,
      reason: body.reason,
      detail: body.detail?.trim() || null,
    },
    select: { id: true },
  });

  return { id: report.id };
});
