import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const targetId = pickId(req);
  if (targetId === me.id) return fail(400, '不能关注自己');

  const t = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!t) return fail(404, '用户不存在');

  const existing = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId: me.id, followeeId: targetId } },
  });
  if (existing) {
    await prisma.follow.delete({
      where: { followerId_followeeId: { followerId: me.id, followeeId: targetId } },
    });
  } else {
    await prisma.follow.create({
      data: { followerId: me.id, followeeId: targetId },
    });
    await prisma.notification.create({
      data: {
        recipientId: targetId,
        fromId: me.id,
        type: 'follow',
        text: '关注了你',
        link: `/user/${me.id}`,
      },
    });
  }

  const followers = await prisma.follow.count({ where: { followeeId: targetId } });
  return { followed: !existing, followers };
});
