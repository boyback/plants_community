import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { serializeUser } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const me = await getCurrentUser();
  if (!me) return null;

  const full = await prisma.user.findUnique({
    where: { id: me.id },
    include: {
      _count: { select: { posts: true, followers: true, following: true } },
      badges: { include: { badge: true } },
    },
  });
  if (!full) return null;

  return {
    user: serializeUser(full),
    signInStreak: full.signInStreak,
    signedInToday: isToday(full.lastSignInAt),
  };
});

function isToday(d: Date | null): boolean {
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
