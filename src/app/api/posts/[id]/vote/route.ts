import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, failWithCode } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { emitEvent } from '@/lib/events';

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
  if (!vote) return failWithCode(200, 'VOTE_NOT_FOUND', '投票不存在');
  if (vote.deadline.getTime() < Date.now()) return failWithCode(200, 'VOTE_ENDED', '投票已截止');

  // 校验用户是否已经投过票
  const existingRecords = await prisma.voteRecord.findMany({
    where: { voteId: vote.id, userId: me.id },
  });
  if (existingRecords.length > 0) {
    return failWithCode(200, 'ALREADY_VOTED', '您已经投过票了');
  }

  const optionIds = vote.multi ? body.optionIds : body.optionIds.slice(0, 1);
  const valid = vote.options.filter((o) => optionIds.includes(o.id));
  if (valid.length === 0) return failWithCode(200, 'INVALID_OPTION', '无效的选项');

  // 创建投票记录（不删除，每个用户的票都计入）
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

  await emitEvent({ kind: 'vote_cast', userId: me.id, postId });

  return {
    options: updated.map((o) => ({ id: o.id, label: o.label, votes: o.votes })),
    total: updated.reduce((s, o) => s + o.votes, 0),
  };
});
