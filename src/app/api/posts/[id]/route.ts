import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, stringifyJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializePost } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';
import { processRichInput } from '@/lib/richtext';
import { postNeedsReview } from '@/lib/post-review';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';

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
      ...postInclude({ withJournalEntries: true }),
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

/**
 * 作者本人编辑帖子
 *  - type 锁定不可改
 *  - vote/event/journal/help 类型不可编辑(数据复杂,有报名/投票/时间线/悬赏数据,改坏全套)
 *  - 仅可改 title / content / contentJson / images / videoUrl / tags
 *  - 编辑后含外链 → 重置为 pending 送审
 */
const PatchBody = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.unknown().optional(),
  contentJson: z.unknown().optional(),
  tags: z.array(z.string()).max(10).optional(),
  images: z.array(z.string()).max(9).optional(),
  videoUrl: z.string().nullable().optional(),
});

export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const id = pickId(req);
  const body = PatchBody.parse(await req.json());

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) return fail(404, '帖子不存在');
  if (post.deleted) return fail(400, '帖子已删除');
  if (post.authorId !== me.id) return fail(403, '只能编辑自己的帖子');

  const LOCKED_TYPES = ['vote', 'event', 'journal', 'help'] as const;
  if (LOCKED_TYPES.includes(post.type as (typeof LOCKED_TYPES)[number])) {
    return fail(400, '该类型帖子不支持编辑(投票 / 活动 / 成长日记 / 求助)');
  }

  const isRich = post.type === 'rich';
  let stored: { html: string; json: string | null; text: string | null } | null = null;
  if (body.content !== undefined || body.contentJson !== undefined) {
    stored = processRichInput({
      json: isRich ? body.contentJson : undefined,
      html: isRich && typeof body.content === 'string' ? body.content : undefined,
      text: !isRich && typeof body.content === 'string' ? body.content : undefined,
      textMaxLen: 2000,
    });
  }

  // 计算最终各字段(用于送审判断)
  const finalImages = body.images ?? null;
  const finalVideoUrl =
    body.videoUrl !== undefined ? body.videoUrl : post.videoUrl;
  const finalCover = finalImages ? finalImages[0] ?? null : post.cover;
  const finalContent = stored ? stored.html : post.content;

  const needsReview = postNeedsReview({
    cover: finalCover,
    images: finalImages ?? undefined,
    videoUrl: finalVideoUrl,
    content: finalContent,
  });

  await prisma.post.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(stored && {
        content: stored.html,
        contentJson: stored.json,
        contentText: stored.text,
      }),
      ...(body.tags !== undefined && { tags: stringifyJson(body.tags) }),
      ...(body.images !== undefined && {
        images: stringifyJson(body.images),
        cover: body.images[0] ?? null,
      }),
      ...(body.videoUrl !== undefined && { videoUrl: body.videoUrl }),
      ...(REVIEW_FILTER_ENABLED && {
        reviewStatus: needsReview ? 'pending' : 'published',
        reviewReason: needsReview ? '编辑后含外链,等待审核' : null,
        reviewedAt: needsReview ? null : new Date(),
      }),
    },
  });

  return { ok: true, needsReview };
});
