import { z } from 'zod';
import { fail, handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { JOURNAL_ENTRY_DATE_EDIT_ENABLED } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

const PatchEntryBody = z.object({
  entryDate: z.string(),
});

function pickIds(req: Request) {
  // /api/posts/<id>/journal/<entryId>
  const segs = new URL(req.url).pathname.split('/').filter(Boolean);
  return {
    postId: segs[2]!,
    entryId: segs[4]!,
  };
}

export const PATCH = handler(async (req) => {
  if (!JOURNAL_ENTRY_DATE_EDIT_ENABLED) {
    return fail(400, '成长记录时间编辑已关闭');
  }

  const me = await requireUser();
  const { postId, entryId } = pickIds(req);
  const body = PatchEntryBody.parse(await req.json());
  const entryDate = new Date(body.entryDate);
  if (Number.isNaN(entryDate.getTime())) {
    return fail(400, '记录时间格式不正确');
  }

  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    include: {
      journal: {
        include: {
          post: {
            select: { id: true, authorId: true, deleted: true, type: true },
          },
        },
      },
    },
  });

  if (!entry || entry.journal.post.id !== postId) return fail(404, '记录不存在');
  if (entry.journal.post.deleted) return fail(400, '帖子已删除');
  if (entry.journal.post.type !== 'journal') return fail(400, '该帖子不是记录贴类型');
  if (entry.journal.post.authorId !== me.id) return fail(403, '只有作者能修改记录时间');

  const updated = await prisma.journalEntry.update({
    where: { id: entryId },
    data: { entryDate },
  });

  await prisma.post.update({
    where: { id: postId },
    data: { updatedAt: new Date() },
  });

  return {
    ok: true,
    id: updated.id,
    entryDate: updated.entryDate.toISOString(),
  };
});

export const DELETE = handler(async () => {
  return fail(400, '已创建的记录不能删除，只能继续新增记录');
});
