/**
 * 单条生命周期事件:
 *   PATCH  /api/posts/:id/journal/:entryId   作者编辑某条事件
 *   DELETE /api/posts/:id/journal/:entryId   作者删除某条事件
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, stringifyJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const STAGES = [
  'germinate',
  'growing',
  'flowering',
  'fruiting',
  'withering',
  'repot',
  'cutting',
  'summer',
  'winter',
  'pest',
  'watering',
  'other',
] as const;

const PatchBody = z.object({
  entryDate: z.string().optional(),
  stage: z.enum(STAGES).optional(),
  note: z.string().max(2000).optional(),
  images: z.array(z.string()).max(9).optional(),
});

function pickIds(req: Request) {
  // /api/posts/<id>/journal/<entryId>
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  return { postId: segs[segs.length - 3]!, entryId: segs[segs.length - 1]! };
}

type FindEntryResult = { error?: string; entry?: { id: string } };

async function findOwnedEntry(
  postId: string,
  entryId: string,
  userId: string
): Promise<FindEntryResult> {
  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: { journal: { include: { post: true } } },
  });
  if (!entry) return { error: '事件不存在' };
  if (entry.journal.postId !== postId) return { error: '事件不属于该帖子' };
  if (entry.journal.post.authorId !== userId) return { error: '只有作者能修改' };
  return { entry: { id: entry.id } };
}

export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const { postId, entryId } = pickIds(req);
  const body = PatchBody.parse(await req.json());

  const r = await findOwnedEntry(postId, entryId, me.id);
  if (r.error) return fail(400, r.error);

  const data: Record<string, unknown> = {};
  if (body.entryDate !== undefined) data.entryDate = new Date(body.entryDate);
  if (body.stage !== undefined) data.stage = body.stage;
  if (body.note !== undefined) data.note = body.note;
  if (body.images !== undefined) data.images = stringifyJson(body.images);

  if (Object.keys(data).length === 0) return { ok: true };

  await prisma.journalEntry.update({ where: { id: entryId }, data });
  return { ok: true };
});

export const DELETE = handler(async (req) => {
  const me = await requireUser();
  const { postId, entryId } = pickIds(req);

  const r = await findOwnedEntry(postId, entryId, me.id);
  if (r.error) return fail(400, r.error);

  await prisma.journalEntry.delete({ where: { id: entryId } });
  return { ok: true };
});
