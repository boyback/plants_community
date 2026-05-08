import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const Body = z.object({
  showFollowing: z.boolean().optional(),
  showFollowers: z.boolean().optional(),
});

export const GET = handler(async () => {
  const me = await requireUser();
  return {
    showFollowing: me.privacyShowFollowing,
    showFollowers: me.privacyShowFollowers,
  };
});

export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());
  const updated = await prisma.user.update({
    where: { id: me.id },
    data: {
      ...(typeof body.showFollowing === 'boolean' && {
        privacyShowFollowing: body.showFollowing,
      }),
      ...(typeof body.showFollowers === 'boolean' && {
        privacyShowFollowers: body.showFollowers,
      }),
    },
    select: {
      privacyShowFollowing: true,
      privacyShowFollowers: true,
    },
  });
  return {
    showFollowing: updated.privacyShowFollowing,
    showFollowers: updated.privacyShowFollowers,
  };
});
