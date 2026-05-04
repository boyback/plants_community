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

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return fail(404, '帖子不存在');

  const existing = await prisma.postCollect.findUnique({
    where: { userId_postId: { userId: me.id, postId } },
  });
  if (existing) {
    await prisma.postCollect.delete({
      where: { userId_postId: { userId: me.id, postId } },
    });
  } else {
    await prisma.postCollect.create({ data: { userId: me.id, postId } });
  }
  const total = await prisma.postCollect.count({ where: { postId } });
  return { collected: !existing, total };
});
