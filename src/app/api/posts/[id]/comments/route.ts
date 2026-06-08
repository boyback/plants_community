import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializeComment } from '@/lib/serializers';
import { emitNotification } from '@/lib/realtime/notify';
import { hasUserPermission } from '@/lib/permissions';
import { emitEvent } from '@/lib/events';
import { processRichInput } from '@/lib/richtext';

export const dynamic = 'force-dynamic';

const Body = z.object({
  // 富文本场景:contentJson(权威);兜底:content(HTML 或纯文本)
  content: z.string().optional(),
  contentJson: z.unknown().optional(),
  parentId: z.string().optional(),
  journalEntryId: z.string().optional(),
});

function pickPostId(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // /api/posts/[id]/comments
  return parts[parts.length - 2];
}

export const POST = handler(async (req) => {
  const me = await requireUser();
  if (!(await hasUserPermission(me, 'comment'))) {
    return fail(403, '需要 Lv.1 以上才能评论');
  }
  const postId = pickPostId(req);
  const body = Body.parse(await req.json());

  // 处理富文本输入
  const stored = processRichInput({
    json: body.contentJson,
    // 兼容老调用:仅传 content 字符串时,按纯文本处理
    text: typeof body.content === 'string' ? body.content : undefined,
    textMaxLen: 2000,
  });
  const hasImage = /<img\b/i.test(stored.html);
  if (!stored.text && !hasImage) return fail(400, '评论内容不能为空');

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, title: true, journal: { select: { id: true } } },
  });
  if (!post) return fail(404, '帖子不存在');

  if (body.journalEntryId) {
    if (!post.journal) return fail(400, '该帖子不是成长记录帖');
    const entry = await prisma.journalEntry.findUnique({
      where: { id: body.journalEntryId },
      select: { journalId: true },
    });
    if (!entry || entry.journalId !== post.journal.id) return fail(400, '成长记录无效');
  }

  if (body.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: body.parentId },
      select: { postId: true },
    });
    if (!parent || parent.postId !== postId) return fail(400, '父评论无效');
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: me.id,
      content: stored.html,
      contentJson: stored.json || null,
      contentText: stored.text,
      parentId: body.parentId ?? null,
      journalEntryId: body.parentId ? null : body.journalEntryId ?? null,
    },
    include: {
      author: {
        include: {
          _count: { select: { posts: true, followers: true, following: true } },
          badges: { include: { badge: true } },
        },
      },
      journalEntry: true,
    },
  });

  // 通知里使用纯文本预览
  if (post.authorId !== me.id) {
    const notif = await prisma.notification.create({
      data: {
        recipientId: post.authorId,
        fromId: me.id,
        type: 'comment',
        text: `评论了你的帖子《${post.title.slice(0, 20)}》:${(stored.text || '[图片]').slice(0, 40)}`,
        link: `/post/${post.id}`,
      },
    });
    emitNotification(post.authorId, { id: notif.id, type: notif.type, text: notif.text, link: notif.link });
  }

  await emitEvent({
    kind: 'comment_create',
    userId: me.id,
    commentId: comment.id,
    postId: post.id,
  });

  return serializeComment(comment);
});
