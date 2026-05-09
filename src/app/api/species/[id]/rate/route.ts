/**
 * POST   /api/species/:id/rate    body: { score: 1-5 }    打分(已打过则更新)
 * DELETE /api/species/:id/rate                              撤回打分
 *
 * 都用事务原子地维护 Species.ratingSum 和 ratingCount,避免后续重新聚合。
 */

import { z } from 'zod';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const Body = z.object({
  score: z.number().int().min(1).max(5),
});

function pickId(req: Request) {
  // /api/species/:id/rate
  return new URL(req.url).pathname.split('/').filter(Boolean)[2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const speciesId = pickId(req);
  const body = Body.parse(await req.json());

  const sp = await prisma.species.findUnique({ where: { id: speciesId } });
  if (!sp) return fail(404, '品种不存在');

  await prisma.$transaction(async (tx) => {
    const old = await tx.speciesRating.findUnique({
      where: { userId_speciesId: { userId: me.id, speciesId } },
    });
    if (old) {
      // 更新:差值更新 sum
      const diff = body.score - old.score;
      await tx.speciesRating.update({
        where: { id: old.id },
        data: { score: body.score },
      });
      if (diff !== 0) {
        await tx.species.update({
          where: { id: speciesId },
          data: { ratingSum: { increment: diff } },
        });
      }
    } else {
      await tx.speciesRating.create({
        data: { userId: me.id, speciesId, score: body.score },
      });
      await tx.species.update({
        where: { id: speciesId },
        data: {
          ratingSum: { increment: body.score },
          ratingCount: { increment: 1 },
        },
      });
    }
  });

  // 返回最新 stats + 我的分
  const fresh = await prisma.species.findUnique({
    where: { id: speciesId },
    select: { ratingSum: true, ratingCount: true, difficulty: true },
  });
  return {
    score: body.score,
    ratingSum: fresh!.ratingSum,
    ratingCount: fresh!.ratingCount,
    avg: fresh!.ratingCount > 0 ? fresh!.ratingSum / fresh!.ratingCount : fresh!.difficulty,
  };
});

export const DELETE = handler(async (req) => {
  const me = await requireUser();
  const speciesId = pickId(req);
  const old = await prisma.speciesRating.findUnique({
    where: { userId_speciesId: { userId: me.id, speciesId } },
  });
  if (!old) return { ok: true, deleted: false };

  await prisma.$transaction(async (tx) => {
    await tx.speciesRating.delete({ where: { id: old.id } });
    await tx.species.update({
      where: { id: speciesId },
      data: {
        ratingSum: { decrement: old.score },
        ratingCount: { decrement: 1 },
      },
    });
  });

  return { ok: true, deleted: true };
});
