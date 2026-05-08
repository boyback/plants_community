import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser, isVipActive } from '@/lib/auth';
import { hasPermission } from '@/lib/levels';
import { emitEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

function pickPostId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  if (!hasPermission({ level: me.level, isVip: isVipActive(me) }, 'post:collect')) {
    return fail(403, '需要 Lv.3 以上才能收藏帖子,开通大会员可解锁');
  }
  const postId = pickPostId(req);

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });
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
    if (post.authorId !== me.id) {
      await emitEvent({
        kind: 'post_collected',
        userId: post.authorId,
        postId: post.id,
        fromId: me.id,
      });
    }
  }
  const total = await prisma.postCollect.count({ where: { postId } });
  return { collected: !existing, total };
});
