import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickIds(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return {
    postId: parts[parts.length - 4],
    entryId: parts[parts.length - 2],
  };
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const { postId, entryId } = pickIds(req);

  const entry = await prisma.journalEntry.findUnique({
    where: { id: entryId },
    select: {
      id: true,
      journal: { select: { postId: true } },
    },
  });
  if (!entry || entry.journal.postId !== postId) return fail(404, '记录不存在');

  const existing = await prisma.journalEntryLike.findUnique({
    where: { userId_journalEntryId: { userId: me.id, journalEntryId: entryId } },
  });

  if (existing) {
    await prisma.journalEntryLike.delete({
      where: { userId_journalEntryId: { userId: me.id, journalEntryId: entryId } },
    });
  } else {
    await prisma.journalEntryLike.create({
      data: { userId: me.id, journalEntryId: entryId },
    });
  }

  const total = await prisma.journalEntryLike.count({ where: { journalEntryId: entryId } });
  return { liked: !existing, total };
});
