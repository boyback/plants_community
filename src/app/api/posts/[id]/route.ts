import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { serializePost } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';

export const dynamic = 'force-dynamic';

export const GET = handler(async (req) => {
  const id = pickId(req);

  // 阅读数 +1(不严格并发)
  await prisma.post.update({
    where: { id },
    data: { views: { increment: 1 } },
  }).catch(() => null);

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      ...postInclude(),
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          author: {
            include: {
              _count: { select: { posts: true, followers: true, following: true } },
              badges: { include: { badge: true } },
            },
          },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: {
                include: {
                  _count: { select: { posts: true, followers: true, following: true } },
                  badges: { include: { badge: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!post) return fail(404, '帖子不存在');

  return serializePost(post);
});

function pickId(req: Request): string {
  const url = new URL(req.url);
  return url.pathname.split('/').filter(Boolean).pop()!;
}
