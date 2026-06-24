/**
 * 记录贴专用接口:
 *   POST   /api/posts/:id/journal      作者追加一条新事件
 *   PATCH  /api/posts/:id/journal      作者修改 journal 元信息(结束日 / endReason 等)
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, stringifyJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { journalStageLabels, normalizeJournalStages, primaryJournalStage } from '@/lib/journal';

export const dynamic = 'force-dynamic';

const AddEntryBody = z.object({
  entryDate: z.string(),
  stage: z.string().trim().max(50).optional(),
  stages: z.array(z.string().trim().min(1).max(50)).max(12).optional(),
  stageLabel: z.string().trim().max(50).optional(),
  note: z.string().max(2000).default(''),
  images: z.array(z.string()).min(1, '每条记录都需要上传配图').max(9),
}).superRefine((body, ctx) => {
  const stages = normalizeJournalStages(body.stages, body.stage);
  if (stages.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stages'],
      message: '请选择至少一个阶段',
    });
  }
});

const UpdateJournalBody = z.object({
  endDate: z.string().nullable().optional(),
  endReason: z
    .enum(['alive', 'withered', 'gifted', 'finished', 'other'])
    .optional(),
});

function pickPostId(req: Request) {
  // 路径形如 /api/posts/<id>/journal,倒数第二段是帖子 id
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  return segs[segs.length - 2]!;
}

type FindResult = { error?: string; journal?: { id: string } };

async function findOwnedJournal(
  postId: string,
  userId: string
): Promise<FindResult> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { journal: true },
  });
  if (!post) return { error: '帖子不存在' };
  if (post.deleted) return { error: '帖子已删除' };
  if (post.authorId !== userId) return { error: '只有作者能修改' };
  if (post.type !== 'journal' || !post.journal)
    return { error: '该帖子不是记录贴类型' };
  return { journal: { id: post.journal.id } };
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const postId = pickPostId(req);
  const body = AddEntryBody.parse(await req.json());
  const stages = normalizeJournalStages(body.stages, body.stage);
  const primaryStage = primaryJournalStage(stages);

  const r = await findOwnedJournal(postId, me.id);
  if (r.error) return fail(400, r.error);

  // orderIdx 用于同日多条排序:取该 journal 最大 orderIdx + 1
  const max = await prisma.journalEntry.aggregate({
    where: { journalId: r.journal!.id },
    _max: { orderIdx: true },
  });
  const orderIdx = (max._max.orderIdx ?? 0) + 1;

  const entry = await prisma.journalEntry.create({
    data: {
      journalId: r.journal!.id,
      entryDate: new Date(body.entryDate),
      stage: primaryStage as any,
      stages: stringifyJson(stages),
      stageLabel: body.stageLabel || null,
      note: body.note,
      images: stringifyJson(body.images),
      orderIdx,
    },
  });

  // 帖子 updatedAt 同步刷新,让推荐流知道有新动态
  await prisma.post.update({
    where: { id: postId },
    data: { updatedAt: new Date() },
  });
  const stageLabels = journalStageLabels(stages, entry.stageLabel);

  return {
    id: entry.id,
    entryDate: entry.entryDate.toISOString(),
    stage: entry.stage,
    stages,
    stageLabel: stageLabels.join('、') || (entry.stageLabel ?? undefined),
    stageLabels,
    note: entry.note,
    images: body.images,
    orderIdx: entry.orderIdx,
    createdAt: entry.createdAt.toISOString(),
  };
});

export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const postId = pickPostId(req);
  const body = UpdateJournalBody.parse(await req.json());

  const r = await findOwnedJournal(postId, me.id);
  if (r.error) return fail(400, r.error);

  const data: Record<string, unknown> = {};
  if (body.endDate !== undefined) {
    data.endDate = body.endDate ? new Date(body.endDate) : null;
  }
  if (body.endReason !== undefined) data.endReason = body.endReason;

  if (Object.keys(data).length === 0) return { ok: true };

  await prisma.journal.update({ where: { id: r.journal!.id }, data });
  return { ok: true };
});
