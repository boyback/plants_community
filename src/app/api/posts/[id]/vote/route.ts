import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const Body = z.object({
  optionIds: z.array(z.string()).min(1),
});

function pickPostId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const postId = pickPostId(req);
  const body = Body.parse(await req.json());

  const vote = await prisma.vote.findUnique({
    where: { postId },
    include: { options: true },
  });
  if (!vote) return fail(404, '投票不存在');
  if (vote.deadline.getTime() < Date.now()) return fail(400, '投票已结束');

  // 已投过就先删除(改投)
  await prisma.voteRecord.deleteMany({
    where: { voteId: vote.id, userId: me.id },
  });

  const optionIds = vote.multi ? body.optionIds : body.optionIds.slice(0, 1);
  const valid = vote.options.filter((o) => optionIds.includes(o.id));
  if (valid.length === 0) return fail(400, '无效的选项');

  await prisma.$transaction(
    valid.map((o) =>
      prisma.voteRecord.create({
        data: { voteId: vote.id, optionId: o.id, userId: me.id },
      })
    )
  );

  // 重算票数
  const tallies = await prisma.voteRecord.groupBy({
    by: ['optionId'],
    where: { voteId: vote.id },
    _count: true,
  });
  await prisma.$transaction(
    tallies.map((t) =>
      prisma.voteOption.update({
        where: { id: t.optionId },
        data: { votes: t._count },
      })
    )
  );

  const updated = await prisma.voteOption.findMany({
    where: { voteId: vote.id },
    orderBy: { orderIdx: 'asc' },
  });
  return {
    options: updated.map((o) => ({ id: o.id, label: o.label, votes: o.votes })),
    total: updated.reduce((s, o) => s + o.votes, 0),
  };
});
