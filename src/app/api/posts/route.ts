import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail, stringifyJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { serializePost } from '@/lib/serializers';
import { postInclude } from '@/lib/post-include';

export const dynamic = 'force-dynamic';

// 帖子列表,支持按板块 / 作者 / 排序筛选
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const boardSlug = url.searchParams.get('board') ?? undefined;
  const authorId = url.searchParams.get('author') ?? undefined;
  const sort = url.searchParams.get('sort') ?? 'recommend'; // recommend | latest | hot
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '24'), 100);
  const cursor = url.searchParams.get('cursor') ?? undefined;

  const where = {
    ...(boardSlug ? { board: { slug: boardSlug } } : {}),
    ...(authorId ? { authorId } : {}),
  };

  const orderBy =
    sort === 'latest'
      ? [{ createdAt: 'desc' as const }]
      : sort === 'hot'
      ? [{ views: 'desc' as const }, { createdAt: 'desc' as const }]
      : [{ createdAt: 'desc' as const }];

  const list = await prisma.post.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: postInclude(),
  });

  let nextCursor: string | null = null;
  if (list.length > limit) {
    const next = list.pop()!;
    nextCursor = next.id;
  }

  return {
    items: list.map(serializePost),
    nextCursor,
  };
});

// 发布新帖
const CreateBody = z
  .object({
    type: z.enum(['rich', 'short', 'vote', 'video', 'event']),
    boardSlug: z.string(),
    title: z.string().min(1).max(100),
    content: z.string().default(''),
    tags: z.array(z.string()).max(10).default([]),
    images: z.array(z.string().url()).max(9).optional(),
    videoUrl: z.string().url().optional(),
    vote: z
      .object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).min(2).max(8),
        multi: z.boolean().default(false),
        deadline: z.string(), // ISO
      })
      .optional(),
    event: z
      .object({
        location: z.string().min(1),
        startAt: z.string(),
        endAt: z.string().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'vote' && !data.vote)
      ctx.addIssue({ code: 'custom', message: '投票贴必须包含 vote 字段' });
    if (data.type === 'event' && !data.event)
      ctx.addIssue({ code: 'custom', message: 'EVENT 贴必须包含 event 字段' });
    if (data.type === 'video' && !data.videoUrl)
      ctx.addIssue({ code: 'custom', message: '视频贴必须包含 videoUrl' });
  });

export const POST = handler(async (req) => {
  const me = await requireUser();
  const body = CreateBody.parse(await req.json());

  const board = await prisma.board.findUnique({ where: { slug: body.boardSlug } });
  if (!board) return fail(400, '指定的板块不存在');

  const cover = body.images?.[0] ?? null;

  const created = await prisma.post.create({
    data: {
      type: body.type,
      title: body.title,
      content: body.content,
      cover,
      images: stringifyJson(body.images ?? []),
      videoUrl: body.videoUrl ?? null,
      tags: stringifyJson(body.tags ?? []),
      boardId: board.id,
      authorId: me.id,
      ...(body.vote && {
        vote: {
          create: {
            question: body.vote.question,
            multi: body.vote.multi,
            deadline: new Date(body.vote.deadline),
            options: {
              create: body.vote.options.map((label, i) => ({
                label,
                orderIdx: i,
              })),
            },
          },
        },
      }),
      ...(body.event && {
        event: {
          create: {
            location: body.event.location,
            startAt: new Date(body.event.startAt),
            endAt: new Date(body.event.endAt ?? body.event.startAt),
          },
        },
      }),
    },
    include: postInclude(),
  });

  return serializePost(created);
});


