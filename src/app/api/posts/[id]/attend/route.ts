import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickPostId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const postId = pickPostId(req);

  const event = await prisma.event.findUnique({ where: { postId } });
  if (!event) return fail(404, '活动不存在');

  const existing = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: me.id } },
  });

  if (existing) {
    await prisma.eventAttendee.delete({
      where: { eventId_userId: { eventId: event.id, userId: me.id } },
    });
  } else {
    await prisma.eventAttendee.create({
      data: { eventId: event.id, userId: me.id },
    });
  }

  const total = await prisma.eventAttendee.count({ where: { eventId: event.id } });
  return { joined: !existing, attendees: total };
});
