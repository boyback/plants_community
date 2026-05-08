/**
 * POST /api/posts/:id/view  — 浏览埋点
 *
 * 调用方:前端在帖子详情或 feed 卡片进入视口时调一次。
 * 同一 (user, post) 24h 内去重 + Post.views += 1。
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';

const Body = z.object({
  source: z.enum(['feed_recommend', 'feed_following', 'feed_hot', 'feed_latest', 'direct', 'board', 'search', 'profile']).optional(),
  dwellMs: z.number().int().min(0).max(3600_000).optional(),
});

const ANON_COOKIE = 'rouyou_anon';

export const POST = handler(async (req) => {
  const id = new URL(req.url).pathname.split('/').filter(Boolean)[2]; // /api/posts/:id/view
  if (!id) return fail(400, '缺少 id');
  const body = req.body ? Body.safeParse(await req.json().catch(() => ({}))).data ?? {} : {};

  const me = await getCurrentUser();

  let anonId: string | null = null;
  if (!me) {
    const c = cookies();
    let v = c.get(ANON_COOKIE)?.value;
    if (!v) {
      v = randomUUID();
      c.set(ANON_COOKIE, v, {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    anonId = v;
  }

  // 24h 去重
  const since = new Date(Date.now() - 86_400_000);
  const dup = await prisma.postView.findFirst({
    where: {
      postId: id,
      ...(me ? { userId: me.id } : { anonId: anonId! }),
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  if (dup) return { ok: true, deduped: true };

  // 存视图 + 自增 Post.views
  await prisma.$transaction([
    prisma.postView.create({
      data: {
        postId: id,
        userId: me?.id ?? null,
        anonId: me ? null : anonId,
        source: body.source ?? null,
        dwellMs: body.dwellMs ?? null,
      },
    }),
    prisma.post.update({
      where: { id },
      data: { views: { increment: 1 } },
    }),
  ]);

  return { ok: true };
});
