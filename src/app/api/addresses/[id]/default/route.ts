import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const a = await prisma.address.findUnique({ where: { id } });
  if (!a) return fail(404, '地址不存在');
  if (a.userId !== me.id) return fail(403, '无权操作');

  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId: me.id, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.address.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);
  return { ok: true };
});
