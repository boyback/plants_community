import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pickPostId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2]; // /api/posts/[id]/like
}

export const GET = handler(async (req) => {
  const me = await requireUser();
  const postId = pickPostId(req);
  const [liked, total] = await Promise.all([
    prisma.postLike.findUnique({
      where: { userId_postId: { userId: me.id, postId } },
    }),
    prisma.postLike.count({ where: { postId } }),
  ]);
  return { liked: !!liked, total };
});

export const POST = handler(async (req) => {
  const me = await requireUser();
  const postId = pickPostId(req);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, title: true },
  });
  if (!post) return fail(404, '帖子不存在');

  const existing = await prisma.postLike.findUnique({
    where: { userId_postId: { userId: me.id, postId } },
  });

  if (existing) {
    await prisma.postLike.delete({
      where: { userId_postId: { userId: me.id, postId } },
    });
  } else {
    await prisma.postLike.create({ data: { userId: me.id, postId } });
    if (post.authorId !== me.id) {
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          fromId: me.id,
          type: 'like',
          text: `赞了你的帖子《${post.title.slice(0, 24)}》`,
          link: `/post/${post.id}`,
        },
      });
    }
  }

  const total = await prisma.postLike.count({ where: { postId } });
  return { liked: !existing, total };
});
