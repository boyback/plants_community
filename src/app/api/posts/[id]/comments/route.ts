import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeComment } from '@/lib/serializers';

export const dynamic = 'force-dynamic';

const Body = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});

function pickPostId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // /api/posts/[id]/comments
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  const postId = pickPostId(req);
  const body = Body.parse(await req.json());

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, title: true },
  });
  if (!post) return fail(404, '帖子不存在');

  if (body.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: body.parentId },
      select: { postId: true },
    });
    if (!parent || parent.postId !== postId)
      return fail(400, '父评论无效');
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: me.id,
      content: body.content,
      parentId: body.parentId ?? null,
    },
    include: {
      author: {
        include: {
          _count: { select: { posts: true, followers: true, following: true } },
          badges: { include: { badge: true } },
        },
      },
    },
  });

  // 给帖子作者发通知(除非是自己评论自己)
  if (post.authorId !== me.id) {
    await prisma.notification.create({
      data: {
        recipientId: post.authorId,
        fromId: me.id,
        type: 'comment',
        text: `评论了你的帖子《${post.title.slice(0, 20)}》:${body.content.slice(0, 40)}`,
        link: `/post/${post.id}`,
      },
    });
  }

  return serializeComment(comment);
});
