import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/users/me/notification-preferences - 获取通知偏好
export const GET = handler(async () => {
  const me = await requireUser();

  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId: me.id },
  });

  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId: me.id },
    });
  }

  return {
    like: prefs.like,
    comment: prefs.comment,
    follow: prefs.follow,
    mention: prefs.mention,
    system: prefs.system,
    message: prefs.message,
  };
});

// PATCH /api/users/me/notification-preferences - 更新通知偏好
export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const body = await req.json();

  const data: Record<string, boolean> = {};
  if (typeof body.like === 'boolean') data.like = body.like;
  if (typeof body.comment === 'boolean') data.comment = body.comment;
  if (typeof body.follow === 'boolean') data.follow = body.follow;
  if (typeof body.mention === 'boolean') data.mention = body.mention;
  if (typeof body.system === 'boolean') data.system = body.system;
  if (typeof body.message === 'boolean') data.message = body.message;

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: me.id },
    update: data,
    create: { userId: me.id, ...data },
  });

  return prefs;
});
