/**
 * GET    /api/admin/email-broadcast/:id       详情(含 recipient 统计)
 * PATCH  /api/admin/email-broadcast/:id       { action: 'start' | 'pause' | 'resume' }
 * DELETE /api/admin/email-broadcast/:id       仅 draft / done / failed 可删
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const PatchBody = z.object({
  action: z.enum(['start', 'pause', 'resume']),
});

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const broadcast = await prisma.emailBroadcast.findUnique({ where: { id } });
  if (!broadcast) return fail(404, '不存在');
  const stats = await prisma.emailRecipient.groupBy({
    by: ['status'],
    where: { broadcastId: id },
    _count: { _all: true },
  });
  return { ...broadcast, stats };
});

export const PATCH = handler(async (req: Request) => {
  await requireAdmin();
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const { action } = PatchBody.parse(await req.json());

  const b = await prisma.emailBroadcast.findUnique({ where: { id } });
  if (!b) return fail(404, '不存在');

  let newStatus: 'sending' | 'paused';
  let extra: { startedAt?: Date } = {};

  if (action === 'start') {
    if (b.status !== 'draft') return fail(409, '只有 draft 状态可以启动');
    newStatus = 'sending';
    extra.startedAt = new Date();
  } else if (action === 'pause') {
    if (b.status !== 'sending') return fail(409, '只有 sending 状态可以暂停');
    newStatus = 'paused';
  } else {
    // resume
    if (b.status !== 'paused') return fail(409, '只有 paused 状态可以继续');
    newStatus = 'sending';
  }

  await prisma.emailBroadcast.update({
    where: { id },
    data: { status: newStatus, ...extra },
  });
  return { ok: true, status: newStatus };
});

export const DELETE = handler(async (req: Request) => {
  await requireAdmin();
  const id = new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
  const b = await prisma.emailBroadcast.findUnique({ where: { id } });
  if (!b) return fail(404, '不存在');
  if (!['draft', 'done', 'failed'].includes(b.status)) {
    return fail(409, '运行中任务不能删,先暂停');
  }
  await prisma.emailBroadcast.delete({ where: { id } });
  return { ok: true };
});
