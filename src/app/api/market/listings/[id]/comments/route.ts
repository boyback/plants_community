import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, jsonWithUserPendants } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { hasUserPermission } from '@/lib/permissions';
import { emitNotification } from '@/lib/realtime/notify';

export const dynamic = 'force-dynamic';

const Body = z.object({
  content: z.string().trim().min(1, '评论内容不能为空').max(1000, '评论不能超过 1000 字'),
});

function pickListingId(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  return parts[parts.length - 2];
}

function serializeComment(comment: {
  id: string;
  content: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    avatar: string;
    level: number;
    role: string;
    equipPendantId?: string | null;
    _count: { posts: number; followers: number; following: number };
  };
}) {
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    author: {
      id: comment.author.id,
      name: comment.author.name,
      avatar: comment.author.avatar,
      equipPendantId: comment.author.equipPendantId,
      level: comment.author.level,
      role: comment.author.role,
      badges: [],
      postsCount: comment.author._count.posts,
      followersCount: comment.author._count.followers,
      followingCount: comment.author._count.following,
    },
  };
}

export async function GET(req: Request) {
  const listingId = pickListingId(req);
  const comments = await prisma.marketListingComment.findMany({
    where: { listingId, deleted: false },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: {
      author: {
        include: {
          _count: { select: { posts: true, followers: true, following: true } },
        },
      },
    },
  });

  return jsonWithUserPendants({ ok: true, data: { items: comments.map(serializeComment) } });
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  if (!(await hasUserPermission(me, 'comment'))) {
    return fail(403, '需要 Lv.1 以上才能评论');
  }

  const listingId = pickListingId(req);
  const body = Body.parse(await req.json());
  const listing = await prisma.marketListing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true, sellerId: true },
  });
  if (!listing) return fail(404, '交易帖不存在');

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.marketListingComment.create({
      data: {
        listingId,
        authorId: me.id,
        content: body.content,
      },
      include: {
        author: {
          include: {
            _count: { select: { posts: true, followers: true, following: true } },
          },
        },
      },
    });
    await tx.marketListing.update({
      where: { id: listingId },
      data: { commentCount: { increment: 1 } },
    });
    return created;
  });

  if (listing.sellerId !== me.id) {
    const notif = await prisma.notification.create({
      data: {
        recipientId: listing.sellerId,
        fromId: me.id,
        type: 'comment',
        text: `评论了你的交易帖「${listing.title.slice(0, 20)}」`,
        link: `/market/${listing.id}#comments`,
      },
    });
    emitNotification(listing.sellerId, { id: notif.id, type: notif.type, text: notif.text, link: notif.link });
  }

  return serializeComment(comment);
});
