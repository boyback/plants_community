/**
 * DELETE /api/admin/posts/:id?reason=xxx        软删除
 * POST   /api/admin/posts/:id/restore           恢复
 * PATCH  /api/admin/posts/:id                   审核操作 { action: 'approve'|'reject', reason? }
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAdmin } from '@/lib/admin-log';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';
import { firePushToBaidu } from '@/lib/baidu-push';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://plantcommunity.cn';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  return new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
}

const DelQuery = z.object({ reason: z.string().max(500).optional() });

export const DELETE = handler(async (req) => {
  const me = await requireAdmin({ allowModerator: true });
  const id = pickId(req);
  const q = DelQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const p = await prisma.post.findUnique({ where: { id } });
  if (!p) return fail(404, '帖子不存在');
  await prisma.post.update({
    where: { id },
    data: {
      deleted: true,
      deletedAt: new Date(),
      deletedBy: me.id,
      deleteReason: q.reason ?? '',
    },
  });
  await logAdmin({
    actorId: me.id,
    action: 'post.delete',
    targetType: 'post',
    targetId: id,
    reason: q.reason,
  });
  return { ok: true };
});

const PatchBody = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
});

export const PATCH = handler(async (req) => {
  const me = await requireAdmin({ allowModerator: true });
  const id = pickId(req);
  const body = PatchBody.parse(await req.json());
  if (!REVIEW_FILTER_ENABLED) {
    return fail(503, '审核功能尚未启用,请联系运维同步 schema 后开启 REVIEW_FILTER_ENABLED');
  }
  const p = await prisma.post.findUnique({ where: { id } });
  if (!p) return fail(404, '帖子不存在');

  await prisma.post.update({
    where: { id },
    data: {
      reviewStatus: body.action === 'approve' ? 'published' : 'rejected',
      reviewReason: body.reason ?? null,
      reviewedAt: new Date(),
      reviewedBy: me.id,
    },
  });
  await logAdmin({
    actorId: me.id,
    action: body.action === 'approve' ? 'post.review.approve' : 'post.review.reject',
    targetType: 'post',
    targetId: id,
    reason: body.reason,
  });

  // 审核通过 → 推百度 API
  if (body.action === 'approve') {
    firePushToBaidu(`${SITE_URL}/post/${id}`);
  }

  return { ok: true };
});
