import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  return new URL(req.url).pathname.split('/').filter(Boolean).pop()!;
}

export const DELETE = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const d = await prisma.draft.findUnique({ where: { id }, select: { userId: true } });
  if (!d) return fail(404, '草稿不存在');
  if (d.userId !== me.id) return fail(403, '无权删除');
  await prisma.draft.delete({ where: { id } });
  return { ok: true };
});
